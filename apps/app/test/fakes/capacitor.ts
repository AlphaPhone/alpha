// spec/app/platform/index.md, "Story: Reach the phone's native capabilities"

/** A Capacitor plugin header whose `methods` array `plugIn` updates in place across test scenes. */
export interface PluginHeader {
  readonly name: string;
  readonly methods: { name: string; rtype?: string }[];
}

interface CapacitorHost {
  PluginHeaders?: PluginHeader[];
}

const headers = new Map<string, PluginHeader>();

/** Reuse the one header object for `name` so Capacitor plugins registered at import time see each scene's methods. */
export function pluginHeader(name: string): PluginHeader {
  const existing = headers.get(name);
  if (existing !== undefined) return existing;
  const created: PluginHeader = { name, methods: [] };
  headers.set(name, created);
  return created;
}

/** Clear every reserved header's methods so unplugged scenes reject with `UNIMPLEMENTED` while listener cleanup stays safe. */
export function clearPluginHeaders(): void {
  for (const header of headers.values()) header.methods.splice(0, header.methods.length, { name: "removeListener" });
}

/** Pre-seed headers for plugins registered eagerly at barrel import time before `plugIn` runs. */
export function reservePluginHeader(name: string): void {
  const page = globalThis as { Capacitor?: CapacitorHost };
  const capacitor = (page.Capacitor ??= {});
  const header = pluginHeader(name);
  capacitor.PluginHeaders ??= [];
  if (!capacitor.PluginHeaders.includes(header)) capacitor.PluginHeaders.push(header);
}

reservePluginHeader("ElizaSystem");
