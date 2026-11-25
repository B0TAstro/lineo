import type { Codec } from '../../logic/codec';
import type { LanLink } from '../lanLink';
import type { GuestTransport, LinkStatus } from '../Transport';

const RETRY_MS = 2000;

/**
 * A guest on the local Wi-Fi: connects to the first of the host's addresses that answers, and
 * tries them all again when the connection drops. The addresses come from the QR code, then from
 * the host's pings (a hotspot turned on during the match). On iOS the first connection waits for
 * the local network permission: it fails while the prompt is up, the next try gets through.
 */
export class WifiGuest<In, Out> implements GuestTransport<Out> {
  private endpoints: string[] = [];
  private connection: string | undefined;
  private unsubscribe: (() => void)[] = [];
  private stopped = false;
  private trying = false;
  private retry: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly lan: LanLink,
    private readonly codec: Codec<In, Out>,
    private readonly onMessage: (message: In) => void,
    private readonly onStatus: (status: LinkStatus) => void,
    /** Called once connected, to ask for the whole log. */
    private readonly onConnected: () => void,
  ) {}

  async start(): Promise<boolean> {
    this.stopped = false;
    this.unsubscribe = [
      this.lan.onLine(({ id, line }) => {
        if (id !== this.connection) return;
        const message = this.codec.decode(line);
        if (message !== null) this.onMessage(message);
      }),
      this.lan.onClose(({ id }) => {
        if (id !== this.connection) return;
        this.connection = undefined;
        this.lost();
      }),
    ];
    // Android: a Wi-Fi with no internet would otherwise lose to mobile data
    await this.lan.bindToWifi().catch(() => false);
    void this.tryEndpoints();
    return true;
  }

  /** The host's addresses: new ones are tried when the link is down. */
  setEndpoints(endpoints: readonly string[]) {
    if (endpoints.join() === this.endpoints.join()) return;
    this.endpoints = [...endpoints];
    if (this.connection === undefined) void this.tryEndpoints();
  }

  send(message: Out) {
    if (this.connection !== undefined) this.lan.send(this.connection, this.codec.encode(message));
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.retry);
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
    if (this.connection !== undefined) this.lan.close(this.connection);
    this.connection = undefined;
    this.lan.unbindWifi();
  }

  private async tryEndpoints() {
    if (this.stopped || this.trying || this.endpoints.length === 0) return;
    this.trying = true;
    clearTimeout(this.retry);
    this.onStatus('connecting');
    for (const endpoint of this.endpoints) {
      const [host, port] = endpoint.split(':');
      try {
        const id = await this.lan.connect(host ?? '', Number(port));
        if (this.stopped) {
          this.lan.close(id);
          break;
        }
        this.connection = id;
        this.trying = false;
        this.onStatus('connected');
        this.onConnected();
        return;
      } catch {
        // next address
      }
    }
    this.trying = false;
    this.lost();
  }

  private lost() {
    if (this.stopped) return;
    this.onStatus('lost');
    clearTimeout(this.retry);
    this.retry = setTimeout(() => void this.tryEndpoints(), RETRY_MS);
  }
}
