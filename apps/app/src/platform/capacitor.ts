// spec/app/platform/index.md, "Story: Reach the phone's native capabilities"
import { registerPlugin } from "@capacitor/core";

const registered = new Map<string, unknown>();

/** Register a Capacitor plugin proxy once per plugin name for the life of the page. @throws {never} */
export function plugin<T>(name: string): T {
  const existing = registered.get(name);
  if (existing !== undefined) return existing as T;
  const created = registerPlugin<T>(name);
  registered.set(name, created);
  return created;
}
