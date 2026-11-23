// spec/platform/index.md, "Story: Reach the phone's native capabilities"; spec/platform/index.md, "A plugin method is called only when the native bridge lists it"
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

interface PluginHeader {
  readonly name: string;
  readonly methods?: readonly { readonly name: string }[];
}

type Proxy = Record<string, unknown> & {
  addListener?: (event: string, listener: (value: unknown) => void) => Promise<PluginListenerHandle>;
};

/** What a Capacitor rejection said: its message and, where the plugin gave them, its code and data. */
export interface NativeRejection {
  readonly message: string;
  readonly code?: string;
  readonly data?: unknown;
}

/** The Capacitor bridge as the Native service sees it. */
export interface CapacitorPort {
  /** Whether the page runs inside the native Android app. */
  readonly onDevice: boolean;
  /** Whether `plugin` is registered by this build and device. @throws {never} */
  registered(plugin: string): boolean;
  /** Whether the native header of `plugin` lists `method`. @throws {never} */
  listed(plugin: string, method: string): boolean;
  /** One call; rejects with the plugin's own rejection. */
  invoke(plugin: string, method: string, args: unknown): Promise<unknown>;
  /** Registers `listener` for `event`; resolves once registered, with the call that removes it. */
  listen(plugin: string, event: string, listener: (value: unknown) => void): Promise<() => Promise<void>>;
}

const proxies = new Map<string, Proxy>();

function proxy(plugin: string): Proxy {
  let found = proxies.get(plugin);
  if (!found) {
    found = registerPlugin<Proxy>(plugin);
    proxies.set(plugin, found);
  }
  return found;
}

function headers(): readonly PluginHeader[] {
  return (Capacitor as typeof Capacitor & { PluginHeaders?: readonly PluginHeader[] }).PluginHeaders ?? [];
}

function header(plugin: string): PluginHeader | undefined {
  return headers().find((entry) => entry.name === plugin);
}

/** A rejection's message, code and data, without anything else it carries. @throws {never} */
export function rejectionOf(cause: unknown): NativeRejection {
  const value = typeof cause === "object" && cause !== null ? (cause as Record<string, unknown>) : {};
  const message = typeof value.message === "string" ? value.message : typeof cause === "string" ? cause : "";
  return {
    message,
    ...(typeof value.code === "string" ? { code: value.code } : {}),
    ...(value.data === undefined ? {} : { data: value.data }),
  };
}

/** The live bridge: Capacitor's registered plugins on the phone, none in a browser page. */
export const capacitor: CapacitorPort = {
  onDevice: Capacitor.isNativePlatform(),
  registered(plugin) {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable(plugin);
  },
  listed(plugin, method) {
    return header(plugin)?.methods?.some((entry) => entry.name === method) === true;
  },
  async invoke(plugin, method, args) {
    const call = proxy(plugin)[method];
    if (typeof call !== "function") throw { message: "Not implemented", code: "UNIMPLEMENTED" };
    return await (call as (input: unknown) => Promise<unknown>).call(proxy(plugin), args ?? {});
  },
  async listen(plugin, event, listener) {
    const target = proxy(plugin);
    if (typeof target.addListener !== "function") throw { message: "Not implemented", code: "UNIMPLEMENTED" };
    const handle = await target.addListener(event, listener);
    return () => handle.remove();
  },
};

/** The bytes a base64 text encodes, or undefined where it is not base64. @throws {never} */
export function bytesOfBase64(text: string): Uint8Array | undefined {
  try {
    return Uint8Array.from(atob(text), (character) => character.charCodeAt(0));
  } catch {
    return undefined;
  }
}

/** The value a JSON text holds, or undefined where it is not JSON. @throws {never} */
export function parsedJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** The JSON text of `value`, or undefined where it has none. @throws {never} */
export function jsonText(value: unknown): string | undefined {
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

/** The bytes of a JSON body, for a refusal native reported outside the agent's own answer. @throws {never} */
export function jsonBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(jsonText(value) ?? "null");
}
