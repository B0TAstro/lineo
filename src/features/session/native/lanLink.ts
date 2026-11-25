import LanLinkModule from '../../../../modules/lan-link';

/** One line on one connection, or a connection opening or closing. */
type Listener<Event> = (event: Event) => void;

/**
 * Text lines over TCP on the local network: the native module on the phone. One line per sealed
 * message. Each `on…` returns the function that stops listening.
 */
export interface LanLink {
  listen(port: number): Promise<number>;
  stopListening(): void;
  addresses(): string[];
  connect(host: string, port: number): Promise<string>;
  send(id: string, line: string): void;
  close(id: string): void;
  bindToWifi(): Promise<boolean>;
  unbindWifi(): void;
  onOpen(listener: Listener<{ id: string; inbound: boolean }>): () => void;
  onLine(listener: Listener<{ id: string; line: string }>): () => void;
  onClose(listener: Listener<{ id: string }>): () => void;
}

export const nativeLanLink: LanLink = {
  listen: (port) => LanLinkModule.listen(port),
  stopListening: () => LanLinkModule.stopListening(),
  addresses: () => LanLinkModule.addresses(),
  connect: (host, port) => LanLinkModule.connect(host, port),
  send: (id, line) => LanLinkModule.send(id, line),
  close: (id) => LanLinkModule.close(id),
  bindToWifi: () => LanLinkModule.bindToWifi(),
  unbindWifi: () => LanLinkModule.unbindWifi(),
  onOpen: (listener) => {
    const subscription = LanLinkModule.addListener('onOpen', listener);
    return () => subscription.remove();
  },
  onLine: (listener) => {
    const subscription = LanLinkModule.addListener('onLine', listener);
    return () => subscription.remove();
  },
  onClose: (listener) => {
    const subscription = LanLinkModule.addListener('onClose', listener);
    return () => subscription.remove();
  },
};
