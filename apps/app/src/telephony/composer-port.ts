// spec/telephony/drafts.md, "Only the owner's Send binds a draft to an operation, and Send again reuses the bound operation"
import type { MessagesNativePlugin } from "@elizaos/os/bridges/definitions/messages";

/** How long the owner's send waits for the composer's reply before its outcome reads unknown. */
export const COMPOSER_REPLY_MS = 30_000;

/** The packaged launcher's origin-checked Messages composer port (`AlphaMessagesComposerPort`, a WebView message listener). */
interface ComposerPort {
  postMessage(message: string): void;
  addEventListener(type: "message", listener: (event: MessageEvent) => void): void;
  removeEventListener(type: "message", listener: (event: MessageEvent) => void): void;
}

/** A refusal before anything was sent, with the native code the bridge reads. */
function refusal(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

/** The composer port the launcher installs in its own main frame, or undefined off the image, in a frame or on the assistant surface. */
function composerPort(): ComposerPort | undefined {
  const port = (globalThis as { alphaMessagesComposer?: unknown }).alphaMessagesComposer;
  return typeof port === "object" && port !== null && "postMessage" in port ? (port as ComposerPort) : undefined;
}

/**
 * One owner send through the composer port: the native side admits it only while the launcher's main
 * frame is in front with window focus and not the assistant surface (`AlphaTelephonyPlugin.composerGuard`).
 * A missing reply rejects without a code, so the outcome reads unknown and the operation ID is kept.
 */
function post(kind: "sms" | "mms", draft: object): Promise<unknown> {
  const port = composerPort();
  if (port === undefined) return Promise.reject(refusal("Open the Messages composer to send this draft.", "unavailable"));
  const requestId = crypto.randomUUID();
  return new Promise<unknown>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      port.removeEventListener("message", receive);
    };
    const receive = (event: MessageEvent) => {
      if (typeof event.data !== "string") return;
      let reply: { requestId?: unknown; result?: unknown; error?: { message?: unknown; code?: unknown } };
      try {
        reply = JSON.parse(event.data);
      } catch {
        return;
      }
      if (reply === null || typeof reply !== "object" || reply.requestId !== requestId) return;
      cleanup();
      if (reply.error !== undefined) {
        const message = typeof reply.error.message === "string" ? reply.error.message : "Nothing was sent.";
        const code = typeof reply.error.code === "string" && reply.error.code !== "" ? reply.error.code : "unavailable";
        reject(refusal(message, code));
      } else resolve(reply.result);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Messages composer did not reply."));
    }, COMPOSER_REPLY_MS);
    port.addEventListener("message", receive);
    try {
      port.postMessage(JSON.stringify({ requestId, kind, draft }));
    } catch (cause) {
      cleanup();
      reject(cause);
    }
  });
}

/**
 * The messages plugin for the owner's own Send: every call goes to the image's plugin, except the two
 * sends, which go through the composer port, where the owner's Send in the launcher's composer is the
 * review (upstream `spec/os/android/messages.md`, "a send the owner composed and tapped Send on in the
 * host's own composer is its own review"). Alpha's sends are never routed here.
 * @throws {never}
 */
export function composerPlugin(native: MessagesNativePlugin): MessagesNativePlugin {
  return new Proxy(native, {
    get(target, method, receiver) {
      if (method === "sendSms") return (request: Parameters<MessagesNativePlugin["sendSms"]>[0]) => post("sms", request);
      if (method === "sendMms") return (request: Parameters<MessagesNativePlugin["sendMms"]>[0]) => post("mms", request);
      return Reflect.get(target, method, receiver);
    },
  });
}
