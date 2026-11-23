/** Turns a message into one line of plain ASCII (no newline) and back */
export interface Codec<In, Out> {
  encode(message: Out): string;
  decode(line: string): In | null;
}
