// spec/app/messages/composer.md, "Only the owner's Send sends: a draft or a picture, with send access, a SIM where there is a choice, and never during a call that may be an emergency call"; spec/app/messages/sending.md, "Send journals a new operation, or reads the journal back when the last outcome is unknown"
import { afterEach, describe, expect, it, vi } from "vitest";
import { composerPlugin } from "../src/platform/composerPort.vibe";

class Port extends EventTarget {
  readonly posted: { requestId: string }[] = [];
  postMessage(data: string) {
    const request: unknown = JSON.parse(data);
    if (typeof request !== "object" || request === null || !("requestId" in request) || typeof request.requestId !== "string") {
      throw new Error("Expected a composer request with an ID.");
    }
    this.posted.push({ ...request, requestId: request.requestId });
  }
  answer(value: object) {
    this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(value) }));
  }
}

function packagedPage(port: Port | undefined) {
  const page = Object.assign(new EventTarget(), { location: { origin: "https://localhost" }, alphaMessagesComposer: port });
  vi.stubGlobal("window", Object.assign(page, { top: page }));
  vi.stubGlobal("document", Object.assign(new EventTarget(), { visibilityState: "visible", hasFocus: () => true }));
}

const sms = { operationId: "reviewed-op", recipients: ["+14155550100"], body: "Exact draft", subscriptionId: 9 };
const approved = () => Promise.resolve(true);
const native = () => ({
  sendSms: vi.fn((_draft: typeof sms) => Promise.resolve({ status: "sent" })),
  sendMms: vi.fn((_draft: typeof sms & { attachments: { name: string; contentType: string; size: number; sha256: string; data: string }[] }) => Promise.resolve({ status: "sent" })),
});

afterEach(() => vi.unstubAllGlobals());

describe("Manual Messages transport", () => {
  it("uses Android confirmation when the packaged port is absent", async () => {
    packagedPage(undefined);
    const fallback = native();
    const client = composerPlugin(fallback, false, new AbortController().signal, approved);
    await expect(client.sendSms(sms)).resolves.toEqual({ status: "sent" });
    expect(fallback.sendSms).toHaveBeenCalledExactlyOnceWith(sms);
  });

  it("requires a trusted and current tap before starting a dedicated send", async () => {
    const port = new Port();
    packagedPage(port);
    const fallback = native();
    const signal = new AbortController().signal;
    await expect(composerPlugin(fallback, false, signal, approved).sendSms(sms)).rejects.toMatchObject({ code: "composer-not-started" });
    await expect(composerPlugin(fallback, true, signal, () => Promise.resolve(false)).sendSms(sms)).rejects.toMatchObject({ code: "composer-not-started" });
    expect(port.posted).toEqual([]);
    expect(fallback.sendSms).not.toHaveBeenCalled();
  });

  it("passes the reviewed MMS and its selected SIM through the exact request", async () => {
    const port = new Port();
    packagedPage(port);
    const fallback = native();
    const client = composerPlugin(fallback, true, new AbortController().signal, approved);
    const mms = { ...sms, attachments: [{ name: "photo.png", contentType: "image/png", size: 1, sha256: "1".repeat(64), data: "AQ==" }] };
    const send = client.sendMms(mms);
    await vi.waitFor(() => expect(port.posted).toHaveLength(1));
    expect(port.posted[0]).toMatchObject({ kind: "mms", draft: mms });
    const receipt = { kind: "mms-send", operationId: sms.operationId, subscriptionId: sms.subscriptionId, status: "submitted" };
    port.answer({ requestId: port.posted[0]?.requestId, result: receipt });
    await expect(send).resolves.toEqual(receipt);
    expect(fallback.sendMms).not.toHaveBeenCalled();
  });

  it("cancels only its own posted request and keeps a missing answer uncertain", async () => {
    const port = new Port();
    packagedPage(port);
    const fallback = native();
    const controller = new AbortController();
    const client = composerPlugin(fallback, true, controller.signal, approved);
    const pending = expect(client.sendSms(sms)).rejects.not.toMatchObject({ code: "composer-not-started" });
    await vi.waitFor(() => expect(port.posted).toHaveLength(1));
    controller.abort();
    await pending;
    expect(port.posted).toEqual([
      { kind: "sms", requestId: port.posted[0]?.requestId, draft: sms },
      { kind: "cancel", requestId: port.posted[0]?.requestId },
    ]);
    expect(fallback.sendSms).not.toHaveBeenCalled();
  });
});
