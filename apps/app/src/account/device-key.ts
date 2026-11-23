// spec/account/enrollment.md, "Story: Let my agent act on my phone once it knows this phone"

/** The origin the earlier Alpha named its resident by on the phone, and in the development browser. */
export function residentOrigin(onDevice: boolean): string {
  return onDevice ? "https://device.alpha.invalid" : "https://development.alpha.invalid";
}

/** The secure slot `device:<scope>` that keeps the phone's device key for one owner and agent, the scope being the SHA-256 of the JSON `[origin, owner, agent]`. */
export async function deviceSlot(origin: string, owner: string, agent: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify([origin, owner, agent])));
  return `device:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

/** A new device key: 32 random bytes as 64 lowercase hex characters. @throws {never} */
export function freshDeviceKey(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Whether `key` is a device key as the agent admits one. @throws {never} */
export function deviceKeyWellFormed(key: string): boolean {
  return /^[a-f0-9]{64}$/.test(key);
}

/** Whether `id` is an enrollment id as the phone accepts one. @throws {never} */
export function enrollmentIdWellFormed(id: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id);
}
