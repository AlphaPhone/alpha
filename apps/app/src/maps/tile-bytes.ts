// spec/maps/plane.md, "Only the reply to the latest copyright request, for the view in place, is shown, and a failed one never fails the map"

/** The bytes of a base64 tile body; the caller has checked its alphabet and length. */
export function base64Bytes(data: string): Uint8Array {
  return Uint8Array.from(globalThis.atob(data), (char) => char.charCodeAt(0));
}
