// spec/calendar/agent.md, "Story: Return to the event I left Calendar from"

/** The lowercase hex SHA-256 of a text's UTF-8 bytes. */
export async function sha256Hex(text: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
