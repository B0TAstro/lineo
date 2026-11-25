package expo.modules.lanlink

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/** A connection that is not up after this long is given up (host gone, wrong network). */
private const val CONNECT_TIMEOUT_MS = 5_000
/** How long Android may take to hand over the Wi-Fi network. */
private const val WIFI_REQUEST_MS = 3_000
/** Wi-Fi and hotspot interfaces: not cellular (rmnet, ccmni), not VPN (tun). */
private val LOCAL_INTERFACES = listOf("wlan", "swlan", "ap", "softap", "eth")

class LanLinkModule : Module() {
  /** Accepting, connecting and reading block: each on a thread of its own. */
  private val threads: ExecutorService = Executors.newCachedThreadPool()
  private val peers = ConcurrentHashMap<String, Peer>()
  @Volatile private var server: ServerSocket? = null
  private var wifiCallback: ConnectivityManager.NetworkCallback? = null

  private val connectivity: ConnectivityManager?
    get() =
      appContext.reactContext?.getSystemService(Context.CONNECTIVITY_SERVICE)
        as? ConnectivityManager

  override fun definition() = ModuleDefinition {
    Name("LanLink")
    Events("onOpen", "onLine", "onClose")

    AsyncFunction("listen") { port: Int, promise: Promise ->
      threads.execute {
        try {
          server?.close()
          val listening = ServerSocket(port)
          server = listening
          threads.execute { accept(listening) }
          promise.resolve(listening.localPort)
        } catch (e: Exception) {
          promise.reject("ERR_LISTEN", "Cannot listen on port $port", e)
        }
      }
    }

    Function("stopListening") {
      server?.close()
      server = null
    }

    Function("addresses") { localAddresses() }

    AsyncFunction("connect") { host: String, port: Int, promise: Promise ->
      threads.execute {
        try {
          val socket = Socket()
          socket.connect(InetSocketAddress(host, port), CONNECT_TIMEOUT_MS)
          promise.resolve(adopt(socket, inbound = false))
        } catch (e: Exception) {
          promise.reject("ERR_CONNECT", "Cannot reach $host", e)
        }
      }
    }

    Function("send") { id: String, line: String -> peers[id]?.send(line) }

    Function("close") { id: String -> peers[id]?.close() }

    // Without this, a Wi-Fi with no internet loses to mobile data and the host is never reached
    AsyncFunction("bindToWifi") { promise: Promise ->
      val manager = connectivity
      if (manager == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        promise.resolve(false)
        return@AsyncFunction
      }
      wifiCallback?.let { manager.unregisterNetworkCallback(it) }
      val settled = AtomicBoolean(false)
      val callback =
        object : ConnectivityManager.NetworkCallback() {
          override fun onAvailable(network: Network) {
            manager.bindProcessToNetwork(network)
            if (settled.compareAndSet(false, true)) promise.resolve(true)
          }

          override fun onUnavailable() {
            if (settled.compareAndSet(false, true)) promise.resolve(false)
          }
        }
      wifiCallback = callback
      val request =
        NetworkRequest.Builder().addTransportType(NetworkCapabilities.TRANSPORT_WIFI).build()
      manager.requestNetwork(request, callback, WIFI_REQUEST_MS)
    }

    Function("unbindWifi") { unbindWifi() }

    OnDestroy {
      server?.close()
      server = null
      peers.values.forEach { it.close() }
      unbindWifi()
      threads.shutdownNow()
    }
  }

  private fun unbindWifi() {
    val manager = connectivity ?: return
    wifiCallback?.let { manager.unregisterNetworkCallback(it) }
    wifiCallback = null
    manager.bindProcessToNetwork(null)
  }

  private fun accept(listening: ServerSocket) {
    while (!listening.isClosed) {
      try {
        adopt(listening.accept(), inbound = true)
      } catch (e: Exception) {
        return // closed by stopListening
      }
    }
  }

  /** Keeps a connection, reads its lines on a thread, tells JS when it opens and closes. */
  private fun adopt(socket: Socket, inbound: Boolean): String {
    socket.tcpNoDelay = true
    val id = UUID.randomUUID().toString()
    val peer = Peer(id, socket)
    peers[id] = peer
    sendEvent("onOpen", mapOf("id" to id, "inbound" to inbound))
    threads.execute {
      try {
        val reader = BufferedReader(InputStreamReader(socket.getInputStream(), Charsets.UTF_8))
        while (true) {
          val line = reader.readLine() ?: break
          sendEvent("onLine", mapOf("id" to id, "line" to line))
        }
      } catch (e: Exception) {
        // broken or closed: same ending
      }
      peer.close()
    }
    return id
  }

  private inner class Peer(val id: String, private val socket: Socket) {
    /** Writes in order, off the JS thread. */
    private val writer: ExecutorService = Executors.newSingleThreadExecutor()
    private val closed = AtomicBoolean(false)

    fun send(line: String) {
      if (closed.get()) return
      writer.execute {
        try {
          socket.getOutputStream().apply {
            write("$line\n".toByteArray(Charsets.UTF_8))
            flush()
          }
        } catch (e: Exception) {
          close()
        }
      }
    }

    fun close() {
      if (!closed.compareAndSet(false, true)) return
      peers.remove(id)
      writer.shutdown()
      try {
        socket.close()
      } catch (e: Exception) {}
      sendEvent("onClose", mapOf("id" to id))
    }
  }
}

/** Private IPv4 addresses of the Wi-Fi and hotspot interfaces. */
private fun localAddresses(): List<String> {
  val result = mutableListOf<String>()
  val interfaces = NetworkInterface.getNetworkInterfaces() ?: return result
  for (network in interfaces) {
    if (!network.isUp || network.isLoopback) continue
    if (LOCAL_INTERFACES.none { network.name.startsWith(it) }) continue
    for (address in network.inetAddresses) {
      if (address is Inet4Address && address.isSiteLocalAddress) {
        val ip = address.hostAddress ?: continue
        if (ip !in result) result.add(ip)
      }
    }
  }
  return result
}
