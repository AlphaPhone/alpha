// spec/telephony/voicemail.md, "A transcript is made on this phone or not at all"

const RATE = 16000;
/** The longest window the on-device recognizer is given at once. */
export const WINDOW_SECONDS = 50;

/** The bytes of a base64 string. */
export function bytesOf(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** The base64 of some bytes. */
export function base64Of(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

/**
 * Splits one mono 16 kHz PCM16 WAV into complete WAVs of at most `seconds` each, or none when it holds no audio.
 * @throws {never}
 */
export function wavWindows(wav: Uint8Array, seconds = WINDOW_SECONDS): Uint8Array[] {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  let at = 12;
  let data = -1;
  let size = 0;
  while (at + 8 <= wav.length) {
    const kind = String.fromCharCode(wav[at]!, wav[at + 1]!, wav[at + 2]!, wav[at + 3]!);
    const length = view.getUint32(at + 4, true);
    if (kind === "data") {
      data = at + 8;
      size = Math.min(length, wav.length - data);
      break;
    }
    at += 8 + length + (length % 2);
  }
  if (data < 0 || size < 2) return [];
  const step = seconds * RATE * 2;
  const out: Uint8Array[] = [];
  for (let start = 0; start < size; start += step) {
    const length = Math.min(step, size - start) & ~1;
    const chunk = new Uint8Array(44 + length);
    const head = new DataView(chunk.buffer);
    chunk.set([82, 73, 70, 70]);
    head.setUint32(4, 36 + length, true);
    chunk.set([87, 65, 86, 69, 102, 109, 116, 32], 8);
    head.setUint32(16, 16, true);
    head.setUint16(20, 1, true);
    head.setUint16(22, 1, true);
    head.setUint32(24, RATE, true);
    head.setUint32(28, RATE * 2, true);
    head.setUint16(32, 2, true);
    head.setUint16(34, 16, true);
    chunk.set([100, 97, 116, 97], 36);
    head.setUint32(40, length, true);
    chunk.set(wav.subarray(data + start, data + start + length), 44);
    out.push(chunk);
  }
  return out;
}
