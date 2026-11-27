// @vitest-environment happy-dom
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { CloudError, isCredentialInvalid } from "@elizaos/cloud";
import { type Context, Effect, Exit, Fiber, Layer, Option, Redacted, Stream } from "effect";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { at, mounts } from "../src/areas.ts";
import { adopt, earlierSlot, keptAt, vaulted } from "../src/platform/adoption.vibe";
import { Agent, type Reached, viewDiagnostic } from "../src/platform/agent.vibe";
import { plugin as capacitorPlugin } from "../src/platform/capacitor.ts";
import { CameraPort, browserCamera, ownedCaptureId } from "../src/platform/camera.vibe";
import { Cloud, cloudAsked, cloudJsonBody } from "../src/platform/cloud.vibe";
import { Device, testMocks } from "../src/platform/device.vibe";
import { boundWaitSeconds, createPkcePair, mapHttpFailure, parseRetryAfter } from "../src/platform/messaging.vibe";
import { NetworkLocation } from "../src/platform/networkLocation.vibe";
import { pageSpeechBase } from "../src/platform/pageSpeech.ts";
import { Garbled, Refused, isDeclinedStatus, outcomeOf, resetOf } from "../src/platform/remote.vibe";
import { assertSlackUserToken } from "../src/platform/slack.vibe";
import { Telegram, telegramAt } from "../src/platform/telegram.vibe";
import { VoiceBridge } from "../src/platform/voice.vibe";
import { type Slot, Vault } from "../src/platform/vault.vibe";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientResponse from "effect/http/HttpClientResponse";
import { listenerCount } from "./fakes/phone.ts";
import type { Platform } from "../src/platform/platform.vibe";
import { type Alpha, area } from "../src/runtime/area.tsx";
import { button, closeAll, drawn, hardware, later, only, open, press, seen, underAct, until } from "./alpha.tsx";
import { account } from "./fakes/cloud.ts";
import { publish } from "./fakes/platform.ts";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

/** How an effect that must fail did: the tag, status, wait and code of what it failed with. */
const failed = (exit: Exit.Exit<unknown, unknown>) => (Exit.isFailure(exit) ? Option.getOrUndefined(Exit.findErrorOption(exit)) : undefined) as { _tag?: string; code?: string; status?: number; wait?: number } | undefined;

// spec/app/shell/index.md, "Story: Move between Home and the apps"
it("Move between Home and the apps on an Alpha image, where a screen that throws or cannot be loaded stops alone (spec/app/shell/index.md, \"Story: Move between Home and the apps\")", async () => {
  const reported = vi.spyOn(console, "error").mockImplementation(() => {});
  const broken = area(Layer.empty, () => { throw new Error("this screen is broken"); });
  const { alpha } = await open({ ...scene(), phone: true, image: true }, [
    ...only("home"),
    at("overlay", () => Promise.resolve({ default: broken })),
    at("view:Files", () => Promise.resolve({ default: broken })),
    at("view:Maps", () => Promise.reject(new Error("the code of this screen cannot be loaded"))),
  ]);
  // spec/app/shell/index.md, "Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it": the phone admits them by the plugins its host registered, and the broken layer over Home took nothing away.
  await until(alpha, alpha.runtime, Shell, (s) => s.image && s.contacts);
  // spec/app/home/tiles.md, "Only Phone, Messages, Inbox, Telegram and Slack carry a badge, only when something waits there, and no tile does while Home is being edited": a tile's name is its app's, with what waits there said after it.
  expect(["Phone", "Messages", "Contacts"].map((name) => Boolean(button(new RegExp(`^${name}(?![A-Za-z])`))))).toEqual([true, true, true]);

  // spec/app/shell/index.md, "Opening an app shows it on top and lowers Ask Alpha to its bar"
  for (const view of ["Files", "Maps"]) {
    await press(view);
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === view);
    expect(document.querySelector("main [role=alert]")?.textContent).toBe("This part of Alpha stopped. Go back, and open it again.");
    // spec/app/shell/index.md, "Back closes one layer: Ask Alpha by a step, then the app on top"
    await hardware("back");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.length === 0);
    expect(Boolean(button("Notes"))).toBe(true);
  }
  reported.mockRestore();
});

it('keeps an unconfigured messaging route on the phone (spec/app/platform/index.md, "Story: Ship only what this build allows")', async () => {
  const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("unexpected request"));
  try {
    const { alpha } = await open({ ...scene(), phone: true }, only("home"));
    const account = await alpha.runtime.runPromiseExit(Effect.flatMap(Telegram, (telegram) => telegram.getMe("session-test")));
    const updates = await alpha.runtime.runPromiseExit(Effect.flatMap(Telegram, (telegram) => Stream.runDrain(telegram.updatesStream("session-test"))));
    expect([failed(account)?._tag, failed(updates)?._tag, fetch.mock.calls]).toEqual(["Unsent", "Unsent", []]);
  } finally {
    fetch.mockRestore();
  }
});

// spec/app/voice/index.md, "A page served by Alpha's development server talks through that server's own Cloud speech relay, and a page that names none offers no Talk"
it('Talks in a page only through the relay at exactly "/cloud"', () => {
  const devices = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: () => Promise.reject(new Error("not asked")) } });
  const named = (content: string | undefined) => {
    document.head.querySelectorAll('meta[name="alpha-cloud-speech"]').forEach((meta) => meta.remove());
    if (content !== undefined) document.head.append(Object.assign(document.createElement("meta"), { name: "alpha-cloud-speech", content }));
    return pageSpeechBase();
  };
  try {
    expect(named("/cloud")).toBe("/cloud");
    expect(["//other-host", "//other-host/cloud", "/cloud/", "/cloud/speech", "/cloudy", "/clou", "https://other-host/cloud", "cloud", " /cloud", "/CLOUD", ""]
      .map(named)).toEqual(Array.from({ length: 11 }, () => undefined));
    expect(named(undefined)).toBeUndefined();
  } finally {
    document.head.querySelectorAll('meta[name="alpha-cloud-speech"]').forEach((meta) => meta.remove());
    if (devices) Object.defineProperty(navigator, "mediaDevices", devices);
    else Reflect.deleteProperty(navigator, "mediaDevices");
  }
});

describe.each([["a browser", false], ["a phone", true]])("in %s", (_where, phone) => {
  // spec/kit/read.md, "Story: Read from outside"
  it("Read from outside: my account, by eliza's own client of its cloud (spec/kit/read.md, \"Story: Read from outside\")", async () => {
    const world = { ...scene(), phone };
    const { alpha } = await open(world, only("home"));
    const asked = () => alpha.runtime.runPromiseExit(Effect.flatMap(Cloud, (cloud) => Effect.tryPromise({ try: () => cloud.client.account(), catch: (cause) => cause })));
    // spec/kit/read.md, "Only the newest ticket's answer is taken, once": eliza's typed client decodes the answer, and the page holds no key.
    expect(await asked()).toEqual(Exit.succeed(account));
    expect(await alpha.runtime.runPromise(Effect.flatMap(Cloud, (cloud) => cloud.call(HttpClientRequest.get("/api/v1/user"))))).toEqual({ success: true, data: account });
    if (!phone) return;
    const user = () => alpha.runtime.runPromiseExit(Effect.flatMap(Cloud, (cloud) => cloud.call(HttpClientRequest.get("/api/v1/user"))));
    // spec/app/platform/index.md, "A cloud request the phone holds back for want of a sign-in reads as the cloud's own 401": a signed-out owner is told to sign in, by a plain read as by eliza's client, and never that the cloud is unreachable.
    world.signedIn = false;
    expect(failed(await user())).toMatchObject({ _tag: "Refused", status: 401 });
    const signedOut = failed(await asked());
    expect([signedOut instanceof CloudError, signedOut instanceof CloudError && isCredentialInvalid(signedOut)]).toEqual([true, true]);
    // spec/app/platform/index.md, "A request is refused for want of a network only when Android confirms the app's network is down": a phone Android says has no network sends nothing to the cloud, and eliza's client hears a network failure.
    world.signedIn = true;
    world.settings.connectivity = { ...world.settings.connectivity, online: false };
    const offline = failed(await asked());
    expect([failed(await user())?._tag, offline instanceof CloudError ? offline.failure.tag : offline]).toEqual(["Unsent", "CloudNetwork"]);
    world.settings.connectivity = { ...world.settings.connectivity, online: true };
    expect(await asked()).toEqual(Exit.succeed(account));
  });

  // spec/kit/attempt.md, "Story: Do something outside, once"
  it("Do something outside, once: a secret is kept only in a slot the phone's host opens (spec/kit/attempt.md, \"Story: Do something outside, once\")", async () => {
    const world = { ...scene(), phone };
    const [open_, shut] = ["alpha.test.open", "alpha.test.shut"] as unknown as [Slot, Slot];
    world.slots.add(open_);
    const { alpha } = await open(world, only("home"));
    const run = <A, E>(work: (vault: Vault.Shape) => Effect.Effect<A, E>) => alpha.runtime.runPromiseExit(Effect.flatMap(Vault, work));
    if (!phone) return void expect(failed(await run((vault) => vault.read(open_)))?.code).toBe("absent");
    // spec/kit/attempt.md, "A sent attempt ends as its own answer says, or as unknown when no answer can be trusted"
    expect(await run((vault) => vault.read(open_))).toEqual(Exit.succeed(Option.none()));
    await run((vault) => vault.write(open_, Redacted.make("a secret")));
    expect([world.secrets.get("alpha.test.open"), await run((vault) => Effect.map(vault.read(open_), Option.map(Redacted.value)))]).toEqual(["\"a secret\"", Exit.succeed(Option.some("a secret"))]);
    await run((vault) => vault.remove(open_));
    expect(world.secrets.size).toBe(0);
    expect([failed(await run((vault) => vault.write(shut, Redacted.make("another"))))?.code, failed(await run((vault) => vault.read(shut)))?.code]).toEqual(["denied", "denied"]);
  });

  // spec/app/platform/index.md, "Story: Talk to the resident agent"
  it("Talk to the resident agent: it hears the device headers a request names, a stream it stops reading is withdrawn, and a reply that grows too large breaks (spec/app/platform/index.md, \"Story: Talk to the resident agent\")", async () => {
    const world = { ...scene(), phone };
    const { alpha } = await open(world, only("home"));
    const call = (request: HttpClientRequest.HttpClientRequest) => alpha.runtime.runPromiseExit(Effect.flatMap(Agent, (agent) => agent.call(request)));
    const heard = HttpClientRequest.get("/api/platform/heard");
    // spec/app/platform/index.md, "The agent hears the device headers a request names, on the phone as in a browser"
    expect(await call(HttpClientRequest.setHeader(heard, "x-eliza-device-id", "phone-1"))).toEqual(Exit.succeed({ "x-eliza-device-id": "phone-1" }));
    expect(failed(await call(HttpClientRequest.setHeader(heard, "authorization", "Bearer not-the-page's")))?._tag).toBe("Unsent");
    // spec/app/platform/index.md, "A request or stream Alpha stops waiting for is withdrawn from the phone, and may still have reached the agent"
    const first = alpha.runtime.runPromise(Effect.flatMap(Agent, (agent) => Stream.runCollect(Stream.take(agent.events(HttpClientRequest.post("/api/platform/drip")), 1))));
    expect(await first).toEqual(["first"]);
    await vi.waitFor(() => expect(world.platform.dripping.size).toBe(0));
    const hanging = alpha.runtime.runFork(Effect.flatMap(Agent, (agent) => agent.call(HttpClientRequest.put("/api/platform/hang"))));
    await vi.waitFor(() => expect(world.platform.hanging.size).toBe(1));
    await alpha.runtime.runPromise(Fiber.interrupt(hanging));
    await vi.waitFor(() => expect(world.platform.hanging.size).toBe(0));
    // spec/app/platform/index.md, "Story: Talk to the resident agent": the phone's host reports, stops and starts its agent; a page that is no phone reads the agent it reaches, and starts or stops none.
    const life = <A,>(work: (agent: Reached) => Effect.Effect<A, unknown>) => alpha.runtime.runPromiseExit(Effect.flatMap(Agent, work));
    expect(await life((agent) => Effect.map(agent.life.status(), (status) => [status.available, status.state]))).toEqual(Exit.succeed([true, "running"]));
    expect(await life((agent) => agent.life.review())).toEqual(Exit.succeed({ kind: "unavailable" }));
    expect(await life((agent) => agent.life.archive("token-1"))).toEqual(Exit.succeed({ kind: "unavailable" }));
    const states = phone ? alpha.runtime.runPromise(Effect.flatMap(Agent, (agent) => Stream.runCollect(Stream.take(agent.life.changes, 2)))) : Promise.resolve([]);
    expect(Exit.isSuccess(await life((agent) => agent.life.stop()))).toBe(phone);
    expect(Exit.isSuccess(await life((agent) => agent.life.start()))).toBe(phone);
    expect((await states).map((status) => status.state)).toEqual(phone ? ["stopped", "running"] : []);
    if (!phone) return;
    // spec/app/platform/index.md, "A streamed answer the phone relays never grows past two mebibytes"
    const flooded = (size: number) => alpha.runtime.runPromiseExit(Effect.flatMap(Agent, (agent) => Stream.runDrain(agent.events(HttpClientRequest.post(`/api/platform/flood?size=${size}`)))));
    expect([Exit.isSuccess(await flooded(1000)), failed(await flooded(3_000_000))?._tag]).toEqual([true, "Unreachable"]);
  });

  // spec/app/platform/index.md, "Story: Be told when to try again"
  it("Be told when to try again: only a 429 carries the wait it named (spec/app/platform/index.md, \"Story: Be told when to try again\")", async () => {
    const { alpha } = await open({ ...scene(), phone }, only("home"));
    const busy = (status: number) => HttpClientRequest.get(`/api/platform/busy?status=${status}`);
    const cloudBusy = (status: number) => HttpClientRequest.get(`/api/v1/platform/busy?status=${status}`);
    const refused = async (work: Effect.Effect<unknown, unknown, Agent | Cloud>) => {
      const failure = failed(await alpha.runtime.runPromiseExit(work));
      return [failure?._tag, failure?.status, failure?.wait];
    };
    const agent = (status: number) => refused(Effect.flatMap(Agent, (one) => one.call(busy(status))));
    const cloud = (status: number) => refused(Effect.flatMap(Cloud, (one) => one.call(cloudBusy(status))));
    // spec/app/platform/index.md, "A refusal carries a wait only when the other side answered 429 with a whole number of seconds, at most a day"
    expect([await agent(429), await agent(503)]).toEqual([["Refused", 429, 30], ["Refused", 503, undefined]]);
    expect([await cloud(429), await cloud(503)]).toEqual([["Refused", 429, 30], ["Refused", 503, undefined]]);
    // spec/app/platform/index.md, "A refusal carries the time the other side named for its allowance to come back, and a reader takes it only while it lies ahead"
    const back = Date.UTC(2030, 0, 1);
    const reset = failed(await alpha.runtime.runPromiseExit(Effect.flatMap(Cloud, (one) => one.call(HttpClientRequest.get(`/api/v1/platform/spent?until=${back}`))))) as Refused | undefined;
    expect([reset?._tag, reset?.status, reset?.wait, reset?.resetAt]).toEqual(["Refused", 429, undefined, back]);
    const ungiven = failed(await alpha.runtime.runPromiseExit(Effect.flatMap(Cloud, (one) => one.call(cloudBusy(429))))) as Refused | undefined;
    expect([reset ? resetOf(reset, back - 1) : undefined, reset ? resetOf(reset, back) : undefined, ungiven ? resetOf(ungiven, 0) : undefined]).toEqual([back, undefined, undefined]);
  });

  // spec/app/platform/index.md, "Story: Know roughly where my phone is without GPS"
  it("Know roughly where my phone is without GPS: a position looked up seldom, kept while the same networks are seen, and none in a browser (spec/app/platform/index.md, \"Story: Know roughly where my phone is without GPS\")", async () => {
    const world = { ...scene(), phone };
    const { alpha } = await open(world, only("home"));
    const network = world.platform.network;
    const locate = () => alpha.runtime.runPromise(Effect.flatMap(NetworkLocation, (one) => one.locate()));
    const accuracy = async () => Option.getOrUndefined(Option.map(await locate(), (fix) => fix.accuracy));
    const minutes = (count: number) => later(alpha, count * 60_000);
    if (!phone) return void expect([Option.isNone(await locate()), network.asked]).toEqual([true, []]);
    // spec/app/platform/index.md, "A network position is asked only when one is needed now, reused for fifteen minutes, and kept for an hour while the same networks are seen": two callers at once share one lookup.
    const [first] = await Promise.all([locate(), locate()]);
    expect([Option.map(first, (fix) => [fix.lat, fix.lng, fix.accuracy]), network.asked]).toEqual([Option.some([51_500_000, -120_000, 40]), [undefined]]);
    await minutes(1);
    expect([await accuracy(), network.asked]).toEqual([40, [undefined]]);
    await minutes(15);
    expect([await accuracy(), network.asked]).toEqual([40, [undefined, "cafe"]]);
    await minutes(45);
    expect([await accuracy(), network.asked]).toEqual([40, [undefined, "cafe", undefined]]);
    network.failing = true;
    await minutes(16);
    expect([await accuracy(), network.asked.length]).toEqual([40, 4]);
    await minutes(1);
    expect([await accuracy(), network.asked.length]).toEqual([40, 4]);
    // spec/app/platform/index.md, "With too few networks seen, the plugin asks for the position of the phone's address alone, and that answer is never confirmed unchanged"
    Object.assign(network, { failing: false, seen: "", accuracy: 3000 });
    await minutes(2);
    expect([await accuracy(), network.asked.at(-1)]).toEqual([3000, "cafe"]);
    await minutes(16);
    expect([await accuracy(), network.asked.length, network.asked.at(-1)]).toEqual([3000, 6, undefined]);
    // spec/app/platform/index.md, "A network position is taken only where it lies on the globe, has an accuracy, and is neither from the future nor over an hour old"
    network.accuracy = 0;
    await minutes(16);
    expect([await accuracy(), network.asked.length]).toEqual([3000, 7]);
    await minutes(1);
    expect(network.asked.length).toBe(7);
  });

  // spec/app/platform/index.md, "A failed view request is recorded by its step and a fingerprint of its id, never by its path or body"
  it("Talk to the resident agent: a failed view request is recorded by its step and its id's fingerprint alone (spec/app/platform/index.md, \"A failed view request is recorded by its step and a fingerprint of its id, never by its path or body\")", async () => {
    const { alpha } = await open({ ...scene(), phone }, only("home"));
    const id = "0f8fad5b-d9cb-469f-a165-70867728950e";
    const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(id)))].slice(0, 8).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const said = (method: string, path: string, body?: string) => alpha.runtime.runPromise(viewDiagnostic(method, path, body));
    expect(await Promise.all([
      said("POST", "/api/views/interact-claim", JSON.stringify({ requestId: id })),
      said("POST", "/api/views/interact-result?x=1", JSON.stringify({ requestId: "not-generated" })),
      said("POST", "/api/views/calendar/navigate", JSON.stringify({ completedActionHandoffId: id, secret: "words" })),
      said("POST", "/api/views/calendar/navigate", JSON.stringify({ completedActionHandoffId: id, pad: "a".repeat(5000) })),
      said("GET", "/api/views/interact-claim", JSON.stringify({ requestId: id })),
      said("POST", "/api/messages", JSON.stringify({ requestId: id })),
    ])).toEqual([` navigation=claim navigation_ref=${digest}`, " navigation=result", ` navigation=prepare navigation_ref=${digest}`, " navigation=prepare", "", ""]);
  });

  // spec/app/platform/index.md, "Story: Come back to my phone where I left it"
  it("Come back to my phone where I left it: one return is heard once, however often Android says the page shows (spec/app/platform/index.md, \"Story: Come back to my phone where I left it\")", async () => {
    const { alpha } = await open({ ...scene(), phone }, only("home"));
    const heard = alpha.runtime.runPromise(Effect.flatMap(Device, (device) => Stream.runCollect(Stream.take(device.visible, 3))));
    // spec/app/platform/index.md, "Alpha hears it came back to the front once for each return, and a screen that has gone hears nothing more"
    for (const shown of [true, false, false, true, true, false]) await seen(shown);
    expect(await heard).toEqual([false, true, false]);
    await seen(true);
  });

  // spec/app/platform/feed.md, "Story: Follow what my agent does on my screen"
  it("Follow what my agent does on my screen: only its own steps reach it, until it stops reading (spec/app/platform/feed.md, \"Story: Follow what my agent does on my screen\")", async () => {
    const world = { ...scene(), phone };
    const { alpha } = await open(world, only("home"));
    const steps = alpha.runtime.runPromiseExit(Effect.flatMap(Agent, (agent) => Stream.runCollect(Stream.take(agent.feed("view", "screen-1"), 2))));
    if (!phone) return void expect(failed(await steps)?._tag).toBe("Unsent");
    // spec/app/platform/feed.md, "The subscription is asked for only once its listener is registered"
    await vi.waitFor(() => expect([...world.platform.listening].map((one) => [one.topic, one.clientId])).toEqual([["view", "screen-1"]]));
    // spec/app/platform/feed.md, "Only this feed's steps for this screen reach it, until it ends"
    publish(world.platform, "view", { stream: "view-interact", payload: { clientId: "screen-2", frame: { tapped: "elsewhere" } } });
    publish(world.platform, "view", { stream: "notification", payload: { clientId: "screen-1", frame: { tapped: "not a step" } } });
    publish(world.platform, "view", { stream: "view-interact", payload: { clientId: "screen-1", frame: { tapped: 1 } } });
    publish(world.platform, "view", { stream: "view-interact", payload: { clientId: "screen-1", frame: { tapped: 2 } } });
    expect(await steps).toEqual(Exit.succeed([{ tapped: 1 }, { tapped: 2 }]));
    // spec/app/platform/feed.md, "Closing removes the listener and withdraws whatever was asked for"
    await vi.waitFor(() => expect(world.platform.listening.size).toBe(0));
  });

  // spec/app/platform/adoption.md, "Story: Keep what the earlier Alpha kept"
  it("Keep what the earlier Alpha kept: a value moves once, and leaves its earlier place only once the new one holds a value (spec/app/platform/adoption.md, \"Story: Keep what the earlier Alpha kept\")", async () => {
    const world = { ...scene(), phone };
    world.slots.add("alpha.test.open");
    const { alpha } = await open(world, only("home"));
    const [earlier, current] = ["alpha.maps.saved-places.v1", "alpha/app/maps@1"];
    const run = <A, E, R extends Platform>(work: Effect.Effect<A, E, R>) => alpha.runtime.runPromise(work);
    const places = (copy: (value: string) => Option.Option<string>) => run(Effect.flatMap(Effect.all([keptAt(earlier), keptAt(current)]), ([from, to]) => adopt(from, to, copy)));
    const read = (value: string) => Option.some(`[${value}]`);
    localStorage.setItem(earlier, "Home");
    // spec/app/platform/adoption.md, "A value is moved by copying it only where the new place is still empty, and its earlier place is cleared only once the new place holds a value"
    expect([await places(read), localStorage.getItem(earlier), await places(read)]).toEqual(["Adopted", null, "NothingToAdopt"]);
    expect(await run(Effect.flatMap(keptAt(current), (place) => place.read()))).toEqual(Option.some("[Home]"));
    localStorage.setItem(earlier, "Work");
    expect([await places(read), localStorage.getItem(earlier), await run(Effect.flatMap(keptAt(current), (place) => place.read()))]).toEqual(["AlreadyKept", null, Option.some("[Home]")]);
    await run(Effect.flatMap(keptAt(current), (place) => place.clear()));
    localStorage.setItem(earlier, "Work");
    expect([await places(() => Option.none()), localStorage.getItem(earlier)]).toEqual(["NotAdopted", "Work"]);
    const [open_, shut] = ["alpha.test.open", "alpha.test.shut"] as unknown as [Slot, Slot];
    const secret = (slot: Slot) => run(Effect.flatMap(Effect.all([keptAt(earlier), vaulted(slot)]), ([from, to]) => adopt(from, to, (value) => Option.some(Redacted.make(value)))));
    expect([await secret(shut), localStorage.getItem(earlier)]).toEqual(["NotAdopted", "Work"]);
    if (!phone) return void expect(await secret(open_)).toBe("NotAdopted");
    expect([await secret(open_), localStorage.getItem(earlier), world.secrets.get("alpha.test.open")]).toEqual(["Adopted", null, "\"Work\""]);
    // spec/app/platform/adoption.md, "A value is moved by copying it only where the new place is still empty, and its earlier place is cleared only once the new place holds a value": the earlier Alpha's encrypted slot moves into the secure store, and leaves only once it is there.
    world.secrets.delete("alpha.test.open");
    const draft = `assistant-draft:v1:${"a".repeat(64)}`;
    world.platform.earlier.set(draft, "Draft");
    const slotted = (slot: Slot, from = draft) => run(Effect.flatMap(vaulted(slot), (to) => adopt(earlierSlot(from), to, (value: string) => Option.some(Redacted.make(value)))));
    // spec/app/platform/adoption.md, "The page reads the earlier Alpha's encrypted store where it is and never writes it: it may only read one of the earlier page's own slots, or clear it while it still holds what was read": a slot the phone cannot open, and one the earlier page did not keep, stay where they are.
    world.platform.unreadable.add(draft);
    expect([await slotted(open_), world.platform.earlier.get(draft), world.secrets.has("alpha.test.open")]).toEqual(["NothingToAdopt", "Draft", false]);
    world.platform.unreadable.delete(draft);
    world.platform.earlier.set("cloud:production", "{\"token\":\"t\"}");
    expect([await slotted(open_, "cloud:production"), world.platform.earlier.get("cloud:production"), world.secrets.has("alpha.test.open")]).toEqual(["NothingToAdopt", "{\"token\":\"t\"}", false]);
    expect([await slotted(shut), world.platform.earlier.get(draft)]).toEqual(["NotAdopted", "Draft"]);
    expect([await slotted(open_), world.platform.earlier.has(draft), world.secrets.get("alpha.test.open")]).toEqual(["Adopted", false, "\"Draft\""]);
  });
});

it('Keeps a trail from before the Apps drawer while reopening (spec/app/shell/index.md, "When Alpha opens again the trail is kept, and Ask Alpha is closed")', async () => {
  const earlier = { trail: ["Notes"], assistant: "Sheet", image: false, contacts: false };
  localStorage.setItem("alpha/app/shell/index@1", JSON.stringify(earlier));
  const { alpha } = await open(scene(), only("home"));
  await until(alpha, alpha.runtime, Shell, (state) => state.trail.at(-1) === "Notes" && state.assistant === "Bar");
  expect(JSON.parse(localStorage.getItem("alpha/app/shell/index@5") ?? "null")).toMatchObject({ trail: ["Notes"], drawer: false, assistant: "Bar" });
  await closeAll();
  localStorage.setItem("alpha/app/shell/index@2", JSON.stringify({ ...earlier, trail: ["Files"], drawer: false }));
  const reopened = await open(scene(), only("home"));
  await until(reopened.alpha, reopened.alpha.runtime, Shell, (state) => state.trail.at(-1) === "Files" && state.assistant === "Bar");
  await closeAll();
  localStorage.setItem("alpha/app/shell/index@3", JSON.stringify({ ...earlier, trail: ["Calendar"], drawer: false, route: 20 }));
  const beforeTalkMark = await open(scene(), only("home"));
  await until(beforeTalkMark.alpha, beforeTalkMark.alpha.runtime, Shell, (state) => state.trail.at(-1) === "Calendar" && state.assistant === "Bar");
  expect(JSON.parse(localStorage.getItem("alpha/app/shell/index@5") ?? "null")).toMatchObject({ trail: ["Calendar"], route: 21, spokenRoute: 0 });
  await closeAll();
  localStorage.removeItem("alpha/app/shell/index@5");
  localStorage.setItem("alpha/app/shell/index@4", JSON.stringify({ ...earlier, trail: ["Maps"], drawer: false, route: 30, spokenRoute: 30 }));
  const beforeTextAsk = await open(scene(), only("home"));
  await until(beforeTextAsk.alpha, beforeTextAsk.alpha.runtime, Shell, (state) => state.trail.at(-1) === "Maps" && state.assistant === "Bar");
  expect(JSON.parse(localStorage.getItem("alpha/app/shell/index@5") ?? "null")).toMatchObject({ trail: ["Maps"], route: 31, spokenRoute: 30, textAsk: { tag: "NoTextAsk" }, textAskThrough: 0 });
});

// spec/app/platform/index.md, "Story: Keep my phone's state across restarts"
it("Keep my phone's state across restarts: a kept value Alpha can no longer read is set aside, and no copy waiting is written over (spec/app/platform/index.md, \"Story: Keep my phone's state across restarts\")", async () => {
  const kept = "alpha/app/shell/index@5";
  let waiting: [string, string][] = [];
  const storedAsides = (): [string, string][] => Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
    .filter((key): key is string => key !== null && key.startsWith(`${kept}.unreadable`))
    .map((key): [string, string] => [key, localStorage.getItem(key) ?? ""]);
  const reopened = async (value: string) => {
    await closeAll();
    localStorage.setItem(kept, value);
    for (const [key, held] of waiting) localStorage.setItem(key, held);
    const { alpha } = await open(scene(), only("home"));
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.length === 0);
    waiting = storedAsides();
  };
  // spec/app/platform/index.md, "A kept value that is no longer a state is set aside where nothing is held, and its machine starts afresh"
  await reopened(JSON.stringify({ trail: "of another shape" }));
  await reopened(JSON.stringify({ trail: 7 }));
  expect(Object.fromEntries(waiting)).toEqual({ [`${kept}.unreadable`]: JSON.stringify({ trail: "of another shape" }), [`${kept}.unreadable.2`]: JSON.stringify({ trail: 7 }) });
  expect(Boolean(button("Notes"))).toBe(true);
  // spec/app/platform/index.md, "A kept value that is no longer a state is set aside where nothing is held, and its machine starts afresh": when every place for copies is taken, the unreadable value stays untouched and the machine runs in memory.
  waiting = [`${kept}.unreadable`, ...Array.from({ length: 8 }, (_, index) => `${kept}.unreadable.${index + 2}`)].map((key, index): [string, string] => [key, `held-${index}`]);
  const tenth = JSON.stringify({ trail: "tenth" });
  await reopened(tenth);
  expect([localStorage.getItem(kept), waiting.length, Object.fromEntries(waiting)[`${kept}.unreadable`], Boolean(button("Notes"))]).toEqual([tenth, 9, "held-0", true]);
});

/**
 * One durable record (`reacting(…, { keep })`) and every shape it was kept in on develop: `state` is what today's build
 * writes under `key`, `spec` the spec that declares its machine, `shape` the fingerprint of today's decode, `sealed` the
 * shape and the fingerprint of the `state` last written, `kept` the paths of the owner's data a restart keeps, `beside`
 * what today's build keeps with it under keys of their own, and `earlier` each earlier shape, as a build of that time
 * wrote it, with `reads`, the state today's build reads it as, where that build kept something today's cannot trust.
 */
interface KeptRecord {
  readonly key: string;
  readonly spec: string;
  readonly shape: string;
  readonly sealed?: { readonly shape: string; readonly state: string };
  readonly state: Readonly<Record<string, unknown>>;
  readonly kept?: readonly string[];
  readonly memoryOnly?: readonly string[];
  readonly beside?: Readonly<Record<string, unknown>>;
  readonly earlier?: readonly { readonly from: string; readonly until: string; readonly state: Readonly<Record<string, unknown>>; readonly reads?: Readonly<Record<string, unknown>> }[];
}
/** A runtime of Alpha's, as far as reading a machine needs it. */
interface Running {
  runPromise<A, E>(effect: Effect.Effect<A, E>): Promise<A>;
}
interface KeptMachine {
  readonly Machine: Context.Key<unknown, { get(): Effect.Effect<unknown> }>;
  readonly initial: Readonly<Record<string, unknown>>;
  readonly parseState: (input: unknown) => unknown;
}
const keptRecords = Object.values(import.meta.glob<KeptRecord>("./kept/*.json", { eager: true, import: "default" }));
const generated = import.meta.glob<KeptMachine>("../gen/*.effect.vibe");
const generatedName = (key: string) => key.replace(/^alpha\//, "").replace(/@\d+$/, "").replace(/\/index$/, "").replaceAll("/", "__");
const machineOf = (key: string) => {
  const load = generated[`../gen/${generatedName(key)}.effect.vibe`];
  if (!load) throw new Error(`no generated machine for ${key}`);
  return load();
};

/**
 * A spec's Quint as far as deciding a kept state needs it: the spec each import alias names, the specs imported whole,
 * its types and `always` rules by name, and the type of its `initial`, where it has one.
 */
interface Quint {
  readonly aliases: ReadonlyMap<string, string>;
  readonly whole: readonly string[];
  readonly types: ReadonlyMap<string, string>;
  readonly rules: ReadonlyMap<string, string>;
  readonly initial: string | undefined;
}
const repository = path.join(import.meta.dirname, "../../..");
const quints = new Map<string, Quint>();
/** The top-level declarations of the Quint blocks of `spec`, a path from the repository's root, read once. */
function quintOf(spec: string): Quint {
  const known = quints.get(spec);
  if (known) return known;
  const quint = [...fs.readFileSync(path.join(repository, spec), "utf8").matchAll(/^```quint\n([\s\S]*?)^```/gm)].map(([, block]) => block).join("\n");
  const declarations = quint.split(/\n(?=(?:pure|type|import|const)\b)/);
  const specAt = (from: string) => {
    const at = path.join(path.dirname(spec), from);
    return fs.existsSync(path.join(repository, `${at}.md`)) ? `${at}.md` : path.join(at, "index.md");
  };
  const named = (pattern: RegExp, value: (declaration: string, match: RegExpExecArray) => string) => new Map(declarations.flatMap((one) => {
    const match = pattern.exec(one);
    return match?.[1] === undefined ? [] : [[match[1], value(one, match)] as const];
  }));
  const found: Quint = {
    aliases: named(/^import \w+ as (\w+) from "(.+)"/, (_, match) => specAt(match[2] ?? "")),
    whole: [...named(/^import \w+\.\* from "(.+)"/, (_, match) => specAt(match[1] ?? "")).values()],
    types: named(/^type (\w+)/, (one) => one),
    rules: named(/^pure def (always\w*)\(/, (one) => one),
    initial: /^pure val initial\s*:\s*([\w:]+)/m.exec(quint)?.[1],
  };
  quints.set(spec, found);
  return found;
}

/** A declaration of `spec` without its spacing or trailing commas, each import alias in it replaced by the spec it names. */
const normalised = (spec: string, declaration: string) => declaration
  .replace(/\b(\w+)::/g, (_, alias: string) => `${quintOf(spec).aliases.get(alias) ?? alias}::`)
  .replace(/\s+/g, "")
  .replace(/,(?=[)\]}])/g, "");

/**
 * The fingerprint of what decides whether a kept value is a state, read from the record's spec rather than from what the
 * tools print for it: the type of its `initial` and every type that type reaches, in whichever spec declares each, and
 * the spec's `always` rules, of which `parseState` takes exactly the values that have the type and keep every rule.
 */
function shapeOf(spec: string) {
  const deciding = new Map<string, string>();
  const reach = (from: string, name: string) => {
    const at = quintOf(from).types.has(name) ? from : quintOf(from).whole.find((other) => quintOf(other).types.has(name));
    const declaration = at === undefined ? undefined : quintOf(at).types.get(name);
    if (at === undefined || declaration === undefined || deciding.has(`${at}::${name}`)) return;
    deciding.set(`${at}::${name}`, normalised(at, declaration));
    for (const [, alias, used = ""] of declaration.matchAll(/(?:\b(\w+)::)?\b([A-Z]\w*)\b(?!\s*\()/g)) reach(alias === undefined ? at : quintOf(at).aliases.get(alias) ?? at, used);
  };
  const { initial, aliases, rules } = quintOf(spec);
  const [stateName, alias] = initial?.split("::").toReversed() ?? [];
  if (stateName === undefined) throw new Error(`${spec} declares no initial state`);
  reach(alias === undefined ? spec : aliases.get(alias) ?? spec, stateName);
  for (const [name, rule] of rules) deciding.set(`${spec}::${name}`, normalised(spec, rule));
  return createHash("sha256").update(JSON.stringify([...deciding].toSorted(([a], [b]) => (a < b ? -1 : 1)))).digest("hex").slice(0, 16);
}

/** The fingerprint of a kept state, whatever the order of its fields. */
const sealOf = (state: unknown) => createHash("sha256").update(JSON.stringify(state, (_, value: unknown) => (
  typeof value === "object" && value !== null && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).toSorted(([a], [b]) => (a < b ? -1 : 1))) : value
))).digest("hex").slice(0, 16);

/**
 * Why a record's `sealed` no longer names its `state` and `shape`, or nothing when it does. Today's `state` may be written
 * again only for the shape it was sealed in, for a record with no seal yet, or once the state it replaces is in `earlier`:
 * a state rewritten for a new shape with the one it replaced dropped is refused, and the new seal is named only once it is kept.
 */
function unsealed({ key, shape, sealed, state, earlier = [] }: KeptRecord) {
  const seal = { shape, state: sealOf(state) };
  if (sealed?.shape === seal.shape && sealed.state === seal.state) return undefined;
  if (sealed === undefined || sealed.state === seal.state || sealed.shape === shape || earlier.some((one) => sealOf(one.state) === sealed.state)) return `${key}: set its "sealed" to ${JSON.stringify(seal)}`;
  return `${key}: its "state" was written again for shape ${shape}, and the state sealed for shape ${sealed.shape} (${sealed.state}) is not in "earlier". Take that state from git, move it into "earlier", bring it forward in the record's migration, and run this test again for the new seal`;
}

const valueAt = (value: unknown, dotted: string) => dotted.split(".").reduce<unknown>((one, name) => (typeof one === "object" && one !== null ? (one as Record<string, unknown>)[name] : undefined), value);

/** Alpha opened over `stored`, every screen loaded and every area built: each key a durable machine keeps its attempts beside, what the store holds after, and each record's state. */
async function keptOver(stored: ReadonlyMap<string, unknown>) {
  await closeAll();
  for (const [key, value] of stored) localStorage.setItem(key, JSON.stringify(value));
  const { alpha } = await open({ ...scene(), phone: true });
  const screens = await Promise.all(mounts.map((mount) => mount.load()));
  const runtimes: Running[] = [alpha.runtime, ...screens.flatMap(({ default: screen }) => {
    const built = (screen as { runtime?: (opened: Alpha) => Running }).runtime;
    return built ? [built(alpha)] : [];
  })];
  await drawn(() => Promise.all(runtimes.map((runtime) => runtime.runPromise(Effect.void))));
  const machines = await Promise.all(keptRecords.map(async ({ key }) => [key, (await machineOf(key)).Machine] as const));
  const states = async () => new Map(await Promise.all(machines.map(async ([key, Machine]) => {
    for (const runtime of runtimes) {
      const found = await runtime.runPromise(Effect.serviceOption(Machine));
      if (Option.isSome(found)) return [key, await runtime.runPromise(found.value.get())] as const;
    }
    return [key, undefined] as const;
  })));
  let settled = await states();
  for (let turn = 0, steady = 0; turn < 50 && steady < 3; turn++) {
    await later(alpha, 0);
    const next = await states();
    steady = JSON.stringify([...next]) === JSON.stringify([...settled]) ? steady + 1 : 0;
    settled = next;
  }
  const held = new Map(Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index) ?? "").map((key) => [key, localStorage.getItem(key)]));
  const durable = new Set([...held.keys()].filter((key) => key.endsWith(".epoch")).map((key) => key.slice(0, -".epoch".length)));
  return { durable, held, states: settled };
}

// spec/app/platform/index.md, "A state kept in a shape an earlier build wrote is read in today's shape, with what the owner kept in it"
it("Keep my phone's state across restarts: every shape a durable record was ever kept in is read again with the owner's data, and a value of a wrong kind is still set aside (spec/app/platform/index.md, \"A state kept in a shape an earlier build wrote is read in today's shape, with what the owner kept in it\")", async () => {
  const problems: string[] = [];
  const today = await keptOver(new Map(keptRecords.flatMap(({ key, state, beside = {} }) => [[key, state] as const, ...Object.entries(beside)])));
  for (const record of keptRecords) {
    const { parseState, initial } = await machineOf(record.key);
    const shape = shapeOf(record.spec);
    if (shape !== record.shape) problems.push(`${record.key}: its kept shape changed (now ${shape}, test/kept has ${record.shape}). Move its "state" into "earlier", bring that earlier shape forward in the record's migration, then write today's "state" and "shape"`);
    const seal = unsealed(record);
    if (seal !== undefined) problems.push(seal);
    if (parseState({ ...Object.fromEntries((record.memoryOnly ?? []).map((name) => [name, initial[name]])), ...record.state }) === undefined) problems.push(`${record.key}: the "state" in test/kept is not today's shape`);
  }
  const recorded = new Set(keptRecords.map(({ key }) => key));
  for (const key of today.durable) if (!recorded.has(key)) problems.push(`${key}: a durable record with no file in test/kept`);
  for (const key of recorded) if (!today.durable.has(key)) problems.push(`${key}: test/kept has a record Alpha no longer keeps`);
  for (const key of today.held.keys()) if (key.includes(".unreadable")) problems.push(`${key}: today's shape was set aside`);
  for (const { key, state, kept = [] } of keptRecords) {
    for (const name of kept) if (JSON.stringify(valueAt(today.states.get(key), name)) !== JSON.stringify(valueAt(state, name))) problems.push(`${key}: ${name} was not kept across a restart`);
  }

  const rounds = Math.max(...keptRecords.map(({ earlier = [] }) => earlier.length));
  for (let round = 0; round < rounds; round++) {
    const earlier = keptRecords.flatMap(({ key, state, kept = [], earlier: shapes = [] }) => (shapes[round] ? [{ key, today: state, kept, ...shapes[round] }] : []));
    const restarted = await keptOver(new Map(keptRecords.flatMap(({ key, state, beside = {}, earlier: shapes = [] }) => {
      const kept = shapes[round]?.state;
      return kept === undefined ? [[key, state] as const, ...Object.entries(beside)] : [[key, kept] as const];
    })));
    for (const one of earlier) {
      const shape = `${one.key} as kept from ${one.from} until ${one.until}`;
      if (one.reads !== undefined && (await machineOf(one.key)).parseState(one.reads) === undefined) problems.push(`${shape}: what it reads as is not today's shape`);
      if (restarted.held.has(`${one.key}.unreadable`)) problems.push(`${shape}: set aside`);
      else if (JSON.stringify(restarted.states.get(one.key)) !== JSON.stringify(one.reads ?? today.states.get(one.key))) problems.push(`${shape}: read as ${JSON.stringify(restarted.states.get(one.key))}, today's shape as ${JSON.stringify(one.reads ?? today.states.get(one.key))}`);
      for (const name of one.kept) if (JSON.stringify(valueAt(restarted.states.get(one.key), name)) !== JSON.stringify(valueAt(one.reads ?? one.today, name))) problems.push(`${shape}: ${name} was not kept`);
    }
  }

  const wrong = new Map(keptRecords.map(({ key, state }) => {
    const [name, value] = Object.entries(state)[0] ?? [];
    return [key, name === undefined ? state : { ...state, [name]: typeof value === "string" ? 0 : "of a wrong kind" }];
  }));
  const refused = await keptOver(wrong);
  for (const [key, value] of wrong) if (refused.held.get(`${key}.unreadable`) !== JSON.stringify(value)) problems.push(`${key}: a value of a wrong kind was not set aside as it was`);

  expect(problems).toEqual([]);
}, 600_000);

// spec/app/platform/index.md, "Story: Ship only what this build allows"
it("Ship only what this build allows: test mocks are admitted only when ELIZA_DEV_ALLOW_TEST_MOCKS is 1 (spec/app/platform/index.md, \"Story: Ship only what this build allows\")", () => {
  // spec/app/platform/index.md, "Mocks, fixtures and developer surfaces exist only when the build allows test mocks"
  vi.stubEnv("ELIZA_DEV_ALLOW_TEST_MOCKS", "");
  expect(testMocks()).toBe(false);
  vi.stubEnv("ELIZA_DEV_ALLOW_TEST_MOCKS", "1");
  expect(testMocks()).toBe(true);
  vi.unstubAllEnvs();
});

// spec/kit/attempt.md, "A sent attempt ends as its own answer says, or as unknown when no answer can be trusted"; spec/app/platform/index.md, "A refusal carries a wait only when the other side answered 429 with a whole number of seconds, at most a day"
it("Platform boundary invariants: singleton Capacitor proxies, honest Garbled/408/429 outcomes, bounded waits, Slack user tokens, PKCE fallback, and external_primary capture ids", async () => {
  expect(capacitorPlugin("AlphaTestSingleton")).toBe(capacitorPlugin("AlphaTestSingleton"));
  expect(outcomeOf(new Garbled({ cause: "bad json" }))).toEqual({ confirmed: false, known: false });
  expect([isDeclinedStatus(400), isDeclinedStatus(408), isDeclinedStatus(429)]).toEqual([true, false, false]);
  expect([parseRetryAfter(undefined), parseRetryAfter("30"), parseRetryAfter("86401"), boundWaitSeconds(86400), boundWaitSeconds(999999)]).toEqual([undefined, 30, undefined, 86400, undefined]);
  const ungivenRateLimit = mapHttpFailure("slack", new Refused({ status: 429 }));
  expect(ungivenRateLimit._tag === "RateLimited" ? ungivenRateLimit.retryAfter : "other").toBeUndefined();
  expect(await Effect.runPromise(assertSlackUserToken("xoxp-user"))).toBe("xoxp-user");
  expect(await Effect.runPromise(assertSlackUserToken("xoxe.xoxp-rotated"))).toBe("xoxe.xoxp-rotated");
  for (const rejected of ["xoxb-bot", "xoxe.xoxb-rotated-bot", "xapp-app"]) {
    expect(failed(await Effect.runPromiseExit(assertSlackUserToken(rejected)))?._tag).toBe("BotTokenRejected");
  }
  const pkce = await Effect.runPromise(createPkcePair());
  expect([pkce.method, pkce.verifier.length > 0, pkce.challenge.length > 0]).toEqual(["S256", true, true]);
  expect([
    ownedCaptureId("content://media/external/images/media/42", false),
    ownedCaptureId("content://media/external_primary/video/media/99", true),
  ]).toEqual(["42", "v:99"]);
});

it('Removes agent stream listeners even when abort fails (spec/app/platform/index.md, "A request or stream Alpha stops waiting for is withdrawn from the phone, and may still have reached the agent")', async () => {
  const world = { ...scene(), phone: true };
  world.platform.abortFails = true;
  const { alpha } = await open(world, only("home"));
  const first = await alpha.runtime.runPromise(Effect.flatMap(Agent, (agent) => Stream.runCollect(Stream.take(agent.events(HttpClientRequest.post("/api/platform/drip")), 1))));
  expect(first).toEqual(["first"]);
  await vi.waitFor(() => expect([listenerCount("ElizaAgent", "streamData"), listenerCount("ElizaAgent", "streamEnd")]).toEqual([0, 0]));
});

it('Voice probe recovers after interruption and cloud openMic cancels capture after shut (spec/app/voice/index.md, "Story: Hold a spoken conversation"; spec/app/voice/index.md, "Story: Mute, interrupt and stop")', async () => {
  const world = { ...scene(), phone: true };
  let releaseProbe = () => {};
  world.voice.probeGate = () => new Promise<void>((resolve) => { releaseProbe = resolve; });
  const { alpha } = await open(world, only("home"));
  const firstProbe = alpha.runtime.runFork(Effect.flatMap(VoiceBridge, (voice) => voice.probeStatus(false)));
  await vi.waitFor(() => expect(world.voice.localSpeechStatusCalls).toBeGreaterThan(0));
  await alpha.runtime.runPromise(Fiber.interrupt(firstProbe));
  world.voice.probeGate = undefined;
  releaseProbe();
  const secondProbe = alpha.runtime.runPromise(Effect.timeoutOption(Effect.flatMap(VoiceBridge, (voice) => voice.probeStatus(false)), "2 seconds"));
  await later(alpha, 2_000);
  expect(Option.isSome(await secondProbe)).toBe(true);

  let releaseCloud = () => {};
  world.voice.cloudStartGate = () => new Promise<void>((resolve) => { releaseCloud = resolve; });
  const opening = alpha.runtime.runPromiseExit(Effect.flatMap(VoiceBridge, (voice) => voice.openMic(10, true)));
  await vi.waitFor(() => expect(world.voice.cloudStarts.length).toBeGreaterThan(0));
  await alpha.runtime.runPromise(Effect.flatMap(VoiceBridge, (voice) => voice.shut(10)));
  releaseCloud();
  const opened = await opening;
  expect(Exit.isFailure(opened)).toBe(true);
  expect(world.voice.activeMicSession).toBeUndefined();
});

it('Browser camera releases audio track on recorder error and clears film on interrupted finish (spec/app/camera/index.md, "Story: Take photos and videos")', async () => {
  const stoppedTracks: string[] = [];
  const makeTrack = (label: string, extra?: Record<string, unknown>) => ({
    stop: () => { stoppedTracks.push(label); },
    readyState: "live",
    getCapabilities: () => ({}),
    ...extra,
  }) as unknown as MediaStreamTrack;
  const fakeStream = (label: "audio" | "video" | "framed") => {
    const track = makeTrack(label, label === "framed" ? { requestFrame: () => undefined } : undefined);
    return Object.assign(new MediaStream(), {
      getTracks: () => [track],
      getVideoTracks: () => label === "audio" ? [] : [track],
      getAudioTracks: () => label === "audio" ? [track] : [],
    });
  };
  const originalMediaDevices = navigator.mediaDevices;
  const originalMediaRecorder = globalThis.MediaRecorder;
  const originalGetContext = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "getContext");
  const originalCaptureStream = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "captureStream");
  let lastRecorder: { state: string; mimeType: string; ondataavailable?: () => void; onerror?: () => void; onstop?: () => void; start: () => void; stop: () => void } | undefined;
  let autoStop = false;
  function FakeMediaRecorder() {
    const instance = {
      state: "inactive",
      mimeType: "video/webm",
      ondataavailable: undefined as (() => void) | undefined,
      onerror: undefined as (() => void) | undefined,
      onstop: undefined as (() => void) | undefined,
      start() { instance.state = "recording"; lastRecorder = instance; },
      stop() { instance.state = "inactive"; if (autoStop) instance.onstop?.(); },
    };
    return instance;
  }
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: (constraints: MediaStreamConstraints) => Promise.resolve(fakeStream(constraints.audio ? "audio" : "video")),
      enumerateDevices: () => Promise.resolve([]),
    },
  });
  Object.defineProperty(globalThis, "MediaRecorder", { configurable: true, value: FakeMediaRecorder });
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () => ({ setTransform: () => undefined, drawImage: () => undefined }),
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "captureStream", {
    configurable: true,
    value: () => fakeStream("framed"),
  });
  try {
    const result = await Effect.runPromise(Effect.scoped(Effect.flatMap(CameraPort, (camera) => Effect.gen(function* () {
      const video = document.createElement("video");
      Object.defineProperty(video, "videoWidth", { configurable: true, value: 640 });
      Object.defineProperty(video, "videoHeight", { configurable: true, value: 480 });
      Object.defineProperty(video, "play", { configurable: true, value: () => Promise.resolve() });
      Object.defineProperty(video, "requestVideoFrameCallback", { configurable: true, value: () => 1 });
      Object.defineProperty(video, "cancelVideoFrameCallback", { configurable: true, value: () => undefined });
      yield* camera.bind(video);
      yield* camera.start(1, "Back", "4:3");
      const started1 = yield* camera.record(true);
      lastRecorder?.onerror?.();
      const tracksAfterError = [...stoppedTracks];
      yield* camera.finish();

      const started2 = yield* camera.record(false);
      const finishing = yield* Effect.forkChild(camera.finish());
      yield* Effect.yieldNow;
      yield* Fiber.interrupt(finishing);
      autoStop = true;
      const started3 = yield* camera.record(false);
      return { started1: started1 !== undefined, tracksAfterError, started2: started2 !== undefined, started3: started3 !== undefined };
    }))).pipe(Effect.provide(browserCamera)));
    expect(result).toEqual({ started1: true, tracksAfterError: ["framed", "audio"], started2: true, started3: true });
  } finally {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: originalMediaDevices });
    Object.defineProperty(globalThis, "MediaRecorder", { configurable: true, value: originalMediaRecorder });
    if (originalGetContext) Object.defineProperty(HTMLCanvasElement.prototype, "getContext", originalGetContext);
    else Reflect.deleteProperty(HTMLCanvasElement.prototype, "getContext");
    if (originalCaptureStream) Object.defineProperty(HTMLCanvasElement.prototype, "captureStream", originalCaptureStream);
    else Reflect.deleteProperty(HTMLCanvasElement.prototype, "captureStream");
  }
});

it('Telegram signIn handles 200 SESSION_PASSWORD_NEEDED responses (spec/app/platform/index.md, "Story: Talk to the resident agent")', async () => {
  const client = Layer.succeed(HttpClient.HttpClient, HttpClient.make((request) =>
    Effect.succeed(HttpClientResponse.fromWeb(request, Response.json({
      ok: false, error_code: 401, error_message: "SESSION_PASSWORD_NEEDED", hint: "pet", pending_auth_id: "pa-1",
    }, { status: 200 })))));
  const result = await Effect.runPromise(Effect.flatMap(Telegram, (telegram) => telegram.signIn("+15551234567", "hash-1", "12345"))
    .pipe(Effect.provide(Layer.provide(telegramAt("http://telegram.test"), client))));
  expect(result).toEqual({ kind: "PasswordRequired", hint: "pet", pendingAuthId: "pa-1" });
});

it('Cloud fetch preserves Request metadata and parses empty or non-JSON bodies without throwing (spec/kit/read.md, "Story: Read from outside")', () => {
  const controller = new AbortController();
  const parsed = cloudAsked(new Request("https://cloud.invalid/api/v1/user", {
    method: "POST",
    headers: { "x-alpha-probe": "yes" },
    signal: controller.signal,
  }));
  expect([parsed.method, parsed.headers["x-alpha-probe"], parsed.signal]).toEqual(["POST", "yes", controller.signal]);
  expect([cloudJsonBody(""), cloudJsonBody("{bad"), cloudJsonBody('{"ok":true}')]).toEqual([
    { ok: true, value: undefined },
    { ok: false },
    { ok: true, value: { ok: true } },
  ]);
});
