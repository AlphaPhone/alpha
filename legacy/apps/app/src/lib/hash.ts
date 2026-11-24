/** Lower-case hex SHA-256 of a string (UTF-8 encoded) or of the given bytes. */
export async function sha256Hex(input: string | BufferSource): Promise<string> {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Lower-case hex of `bytes` cryptographically random bytes (output length is twice `bytes`). */
export function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
}
