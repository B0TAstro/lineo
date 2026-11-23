package expo.modules.clipframes

import android.media.Image
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaExtractor
import android.media.MediaFormat
import expo.modules.kotlin.jni.ArrayBuffer
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.nio.ByteBuffer
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

private const val TIMEOUT_US = 10_000L
/** Frames are reordered by the decoder: keep feeding a little past the end of the window. */
private const val READ_PAST_END_US = 500_000L
/** Decoder silent this many times in a row after the input ended: give up instead of hanging. */
private const val MAX_IDLE_POLLS = 200

class ClipFramesModule : Module() {
  /** One reader at a time: the replay analyses one window of one clip. */
  private var reader: FrameReader? = null

  override fun definition() = ModuleDefinition {
    Name("ClipFrames")

    AsyncFunction("open") { path: String, startS: Double, endS: Double, maxSide: Double ->
      reader?.close()
      reader = null
      val opened = FrameReader(path.removePrefix("file://"), startS, endS, maxSide.toInt())
      reader = opened
      mapOf(
        "width" to opened.width,
        "height" to opened.height,
        "videoWidth" to opened.videoWidth,
        "videoHeight" to opened.videoHeight,
      )
    }

    // An empty buffer says "no more frames": simpler to pass than a nullable.
    AsyncFunction("next") {
      reader?.next() ?: ArrayBuffer(ByteBuffer.allocateDirect(0))
    }

    Function("time") {
      reader?.time ?: 0.0
    }

    Function("close") {
      reader?.close()
      reader = null
    }
  }
}

/** Reads a time window of a clip in order, frame after frame, as small upright RGB images. */
private class FrameReader(path: String, startS: Double, endS: Double, maxSide: Int) {
  val width: Int
  val height: Int
  val videoWidth: Int
  val videoHeight: Int
  var time = 0.0
    private set

  private val extractor = MediaExtractor()
  private val codec: MediaCodec
  /** Clockwise rotation the player applies to show the video upright. */
  private val rotation: Int
  /** One source pixel kept out of `step`, in each direction. */
  private val step: Int
  private val startUs = (startS * 1_000_000).toLong()
  private val endUs = (endS * 1_000_000).toLong()
  private val info = MediaCodec.BufferInfo()
  private var inputDone = false
  private var finished = false

  init {
    extractor.setDataSource(path)
    val track = (0 until extractor.trackCount).firstOrNull {
      extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith("video/") == true
    } ?: throw IllegalArgumentException("No video track in $path")
    extractor.selectTrack(track)
    val format = extractor.getTrackFormat(track)

    val degrees = if (format.containsKey(MediaFormat.KEY_ROTATION)) format.getInteger(MediaFormat.KEY_ROTATION) else 0
    rotation = (degrees % 360 + 360) % 360
    val rawWidth = format.getInteger(MediaFormat.KEY_WIDTH)
    val rawHeight = format.getInteger(MediaFormat.KEY_HEIGHT)
    step = max(1, (max(rawWidth, rawHeight).toDouble() / max(1, maxSide)).roundToInt())
    val quarterTurn = rotation == 90 || rotation == 270
    width = (if (quarterTurn) rawHeight else rawWidth) / step
    height = (if (quarterTurn) rawWidth else rawHeight) / step
    videoWidth = if (quarterTurn) rawHeight else rawWidth
    videoHeight = if (quarterTurn) rawWidth else rawHeight

    // Decoding starts from the keyframe before the window; earlier frames are dropped below.
    extractor.seekTo(startUs, MediaExtractor.SEEK_TO_PREVIOUS_SYNC)
    format.setInteger(
      MediaFormat.KEY_COLOR_FORMAT,
      MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible,
    )
    codec = MediaCodec.createDecoderByType(format.getString(MediaFormat.KEY_MIME)!!)
    codec.configure(format, null, null, 0)
    codec.start()
  }

  fun next(): ArrayBuffer? {
    var idle = 0
    while (!finished) {
      if (!inputDone) feedInput()
      val index = codec.dequeueOutputBuffer(info, TIMEOUT_US)
      if (index < 0) {
        if (inputDone && ++idle > MAX_IDLE_POLLS) finished = true
        continue
      }
      idle = 0
      val ended = info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0
      val ptsUs = info.presentationTimeUs
      var frame: ArrayBuffer? = null
      if (info.size > 0 && ptsUs in startUs..endUs) {
        codec.getOutputImage(index)?.use { frame = toRgb(it) }
      }
      codec.releaseOutputBuffer(index, false)
      if (ended || ptsUs > endUs) finished = true
      frame?.let {
        time = ptsUs / 1_000_000.0
        return it
      }
    }
    return null
  }

  fun close() {
    runCatching { codec.stop() }
    codec.release()
    extractor.release()
  }

  private fun feedInput() {
    val index = codec.dequeueInputBuffer(TIMEOUT_US)
    if (index < 0) return
    val size = extractor.readSampleData(codec.getInputBuffer(index)!!, 0)
    if (size < 0 || extractor.sampleTime > endUs + READ_PAST_END_US) {
      codec.queueInputBuffer(index, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
      inputDone = true
    } else {
      codec.queueInputBuffer(index, 0, size, extractor.sampleTime, 0)
      extractor.advance()
    }
  }

  /** Picks one pixel every `step`, turns it upright and converts YUV (BT.601) to packed RGB. */
  private fun toRgb(image: Image): ArrayBuffer {
    val yPlane = image.planes[0]
    val uPlane = image.planes[1]
    val vPlane = image.planes[2]
    val yBuffer = yPlane.buffer
    val uBuffer = uPlane.buffer
    val vBuffer = vPlane.buffer
    val sourceWidth = image.width
    val sourceHeight = image.height
    val quarterTurn = rotation == 90 || rotation == 270
    val rawWidth = if (quarterTurn) height else width
    val rawHeight = if (quarterTurn) width else height
    val out = ByteBuffer.allocateDirect(width * height * 3)

    for (y in 0 until height) {
      for (x in 0 until width) {
        // Where this upright pixel sits in the stored (unrotated) image.
        val rx = when (rotation) {
          90 -> y
          180 -> rawWidth - 1 - x
          270 -> rawWidth - 1 - y
          else -> x
        }
        val ry = when (rotation) {
          90 -> rawHeight - 1 - x
          180 -> rawHeight - 1 - y
          270 -> x
          else -> y
        }
        val sx = min(rx * step, sourceWidth - 1)
        val sy = min(ry * step, sourceHeight - 1)
        val luma = yBuffer.get(sy * yPlane.rowStride + sx * yPlane.pixelStride).toInt() and 0xFF
        val cx = sx / 2
        val cy = sy / 2
        val u = (uBuffer.get(cy * uPlane.rowStride + cx * uPlane.pixelStride).toInt() and 0xFF) - 128
        val v = (vBuffer.get(cy * vPlane.rowStride + cx * vPlane.pixelStride).toInt() and 0xFF) - 128
        out.put(clamp(luma + (1436 * v shr 10)))
        out.put(clamp(luma - ((352 * u + 731 * v) shr 10)))
        out.put(clamp(luma + (1815 * u shr 10)))
      }
    }
    out.rewind()
    return ArrayBuffer(out)
  }
}

private fun clamp(value: Int): Byte = value.coerceIn(0, 255).toByte()
