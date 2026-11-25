import { Store } from '@/shared/lib/Store';
import { type SetupForm, toMatchSetup } from '@/sports/tennis';

import type { Codec } from './logic/codec';
import { HostLog } from './logic/hostLog';
import { PING_EVERY_MS } from './logic/linkHealth';
import type { LoggedEvent, MatchEvent } from './logic/matchLog';
import type { GuestMessage, HostMessage } from './logic/messages';
import { LocalHost } from './native/LocalTransport';
import type { HostTransport, LinkKind } from './native/Transport';
import type { WifiHost } from './native/wifi/WifiHost';

type Out = HostMessage<SetupForm>;
type HostCodec = Codec<GuestMessage, Out>;

/** A guest that has not answered a ping for this long has left (or lost every link). */
const GUEST_GONE_MS = 6000;

/** The host's links, built when the session starts: injected, so the session runs without radios. */
export type CreateHostLinks = {
  codec: () => HostCodec;
  bluetooth: (codec: HostCodec, onMessage: (message: GuestMessage) => void) => HostTransport<Out>;
  wifi: (
    codec: HostCodec,
    onMessage: (message: GuestMessage) => void,
  ) => Pick<WifiHost<GuestMessage, Out>, 'start' | 'broadcast' | 'stop' | 'endpoints'>;
};

export type HostState = {
  log: readonly LoggedEvent[];
  /** Bluetooth on (guests can join by it), or off: refused or unavailable. */
  bluetooth: boolean;
  /** Where guests reach this phone on the Wi-Fi (`ip:port`); empty with no Wi-Fi. */
  wifi: string[];
  /** Guests that answered a ping lately, on any link, and on each link. */
  guests: number;
  byLink: Record<LinkKind, number>;
  /** Last round trip of a ping on each link, in ms (dev builds show it). */
  rttMs: Partial<Record<LinkKind, number>>;
};

/**
 * The phone that created the session. Keeps the log (HostLog) and sends every new event to its
 * guests on **every** link it has: Bluetooth and the local Wi-Fi side by side. A guest that gets
 * an event twice ignores the second one, so the host never has to know which link a guest uses.
 * Every second it pings on each link with its Wi-Fi addresses; the guests' pongs say who is there
 * and by which link. With no radio at all, the match goes on alone.
 */
export class SessionHost {
  readonly store: Store<HostState>;
  private readonly hostLog: HostLog;
  private links: Partial<Record<LinkKind, HostTransport<Out>>> = {};
  private wifi: ReturnType<CreateHostLinks['wifi']> | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private n = 0;
  private sentAt = new Map<number, number>();
  /** Last pong of each guest device on each link. */
  private pongs = new Map<string, Partial<Record<LinkKind, number>>>();
  private running = false;

  constructor(
    private readonly form: SetupForm,
    private readonly create: CreateHostLinks,
  ) {
    this.hostLog = new HostLog(toMatchSetup(form));
    this.store = new Store<HostState>({
      log: this.hostLog.events,
      bluetooth: false,
      wifi: [],
      guests: 0,
      byLink: { bluetooth: 0, wifi: 0 },
      rttMs: {},
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    const codec = this.create.codec();

    const bluetooth = this.create.bluetooth(codec, (m) => this.receive(m, 'bluetooth'));
    this.links.bluetooth = bluetooth;
    bluetooth
      .start()
      .then((started) => (started ? this.store.set({ bluetooth: true }) : this.noBluetooth()))
      .catch((e) => {
        console.warn('BLE host', e);
        this.noBluetooth();
      });

    const wifi = this.create.wifi(codec, (m) => this.receive(m, 'wifi'));
    this.wifi = wifi;
    this.links.wifi = wifi;
    wifi.start().catch((e) => {
      console.warn('Wi-Fi host', e);
      delete this.links.wifi;
    });

    this.timer = setInterval(() => this.ping(), PING_EVERY_MS);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    clearInterval(this.timer);
    for (const link of Object.values(this.links)) link.stop();
    this.links = {};
    this.wifi = undefined;
    this.pongs.clear();
  }

  /** Every change goes through here, the host's own as its guests' intents. */
  readonly dispatch = (event: MatchEvent) => {
    const logged = this.hostLog.receive(event);
    if (logged === null) return;
    this.store.set({ log: this.hostLog.events });
    this.broadcast({ t: 'event', event: logged });
  };

  private broadcast(message: Out) {
    for (const link of Object.values(this.links)) link.broadcast(message);
  }

  private receive(message: GuestMessage, via: LinkKind) {
    if (message.t === 'intent') this.dispatch(message.event);
    else if (message.t === 'sync') {
      this.broadcast({ t: 'snapshot', setup: this.form, log: [...this.hostLog.events] });
    } else if (message.t === 'pong') this.pong(message.n, message.device, via);
    // anything else is not a guest message: ignored
  }

  /** No Bluetooth (refused, unavailable): the Wi-Fi alone, or no radio at all. */
  private noBluetooth() {
    if (!this.running) return;
    this.links.bluetooth?.stop();
    this.links.bluetooth = new LocalHost();
    this.store.set({ bluetooth: false });
  }

  private ping() {
    const now = Date.now();
    this.n++;
    this.sentAt.set(this.n, now);
    this.sentAt.delete(this.n - 10);
    this.broadcast({ t: 'ping', n: this.n, wifi: this.wifi?.endpoints() ?? [] });
    this.count(now);
  }

  private pong(n: number, device: string, via: LinkKind) {
    const now = Date.now();
    this.pongs.set(device, { ...this.pongs.get(device), [via]: now });
    const sent = this.sentAt.get(n);
    if (sent !== undefined)
      this.store.set({ rttMs: { ...this.store.get().rttMs, [via]: now - sent } });
    this.count(now);
  }

  /** Who answered lately, and by which link. */
  private count(now: number) {
    const byLink = { bluetooth: 0, wifi: 0 };
    let guests = 0;
    for (const [device, seen] of this.pongs) {
      const recent = (at: number | undefined) => at !== undefined && now - at < GUEST_GONE_MS;
      if (recent(seen.bluetooth)) byLink.bluetooth++;
      if (recent(seen.wifi)) byLink.wifi++;
      if (recent(seen.bluetooth) || recent(seen.wifi)) guests++;
      else this.pongs.delete(device);
    }
    const state = this.store.get();
    const wifi = this.wifi?.endpoints() ?? [];
    if (
      guests !== state.guests ||
      byLink.bluetooth !== state.byLink.bluetooth ||
      byLink.wifi !== state.byLink.wifi
    )
      this.store.set({ guests, byLink });
    if (wifi.join() !== state.wifi.join()) this.store.set({ wifi });
  }
}
