// @vitest-environment happy-dom
import { CloudError, isCredentialInvalid } from "@elizaos/cloud/client";
import { Effect, Exit, Layer, Option, Redacted, Stream } from "effect";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { at, mounts } from "../src/areas.ts";
import { adopt, earlierSlot, keptAt, vaulted } from "../src/platform/adoption.vibe";
import { Agent } from "../src/platform/agent.vibe";
import { Cloud } from "../src/platform/cloud.vibe";
import { type Slot, Vault } from "../src/platform/vault.vibe";
import type { Platform } from "../src/platform/platform.vibe";
import { area } from "../src/runtime/area.tsx";
import { button, closeAll, hardware, only, open, press, underAct, until } from "./alpha.tsx";
import { account } from "./fakes/cloud.ts";
import { publish } from "./fakes/platform.ts";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

/** How an effect that must fail did: the tag and the code of what it failed with. */
const failed = (exit: Exit.Exit<unknown, unknown>) => (Exit.isFailure(exit) ? Option.getOrUndefined(Exit.findErrorOption(exit)) : undefined) as { _tag?: string; code?: string } | undefined;

// spec/app/shell/index.md, "Story: Move between Home and the apps"
it("Move between Home and the apps on an Alpha image, where a screen that throws or cannot be loaded stops alone (spec/app/shell/index.md, \"Story: Move between Home and the apps\")", async () => {
  const reported = vi.spyOn(console, "error").mockImplementation(() => {});
  const broken = area(Layer.empty, () => { throw new Error("this screen is broken"); });
  const { alpha } = await open({ ...scene(), phone: true, image: true }, [
    ...mounts,
    at("overlay", () => Promise.resolve({ default: broken })),
    at("view:Files", () => Promise.resolve({ default: broken })),
    at("view:Maps", () => Promise.reject(new Error("the code of this screen cannot be loaded"))),
  ]);
  // spec/app/shell/index.md, "Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it": the phone admits them by the plugins its host registered, and the broken layer over Home took nothing away.
  await until(alpha, alpha.runtime, Shell, (s) => s.image && s.contacts);
  expect(["Phone", "Messages", "Contacts"].map((name) => Boolean(button(name)))).toEqual([true, true, true]);

  // spec/app/shell/index.md, "Opening an app shows it on top, closes the drawer and lowers Ask Alpha to its bar"
  for (const view of ["Files", "Maps"]) {
    await press(view);
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === view);
    expect(document.querySelector("main > [role=alert]")?.textContent).toBe("This part of Alpha stopped. Go back, and open it again.");
    // spec/app/shell/index.md, "Back closes one layer: the drawer, then Ask Alpha by a step, then the app on top"
    await hardware("back");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.length === 0);
    expect(Boolean(button("Notes"))).toBe(true);
  }
  reported.mockRestore();
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
    // spec/app/platform/index.md, "A stream Alpha stops reading is withdrawn from the phone, and may still have reached the agent"
    const first = alpha.runtime.runPromise(Effect.flatMap(Agent, (agent) => Stream.runCollect(Stream.take(agent.events(HttpClientRequest.post("/api/platform/drip")), 1))));
    expect(await first).toEqual(["first"]);
    await vi.waitFor(() => expect(world.platform.dripping.size).toBe(0));
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
      const failure = failed(await alpha.runtime.runPromiseExit(work)) as { _tag?: string; status?: number; wait?: number } | undefined;
      return [failure?._tag, failure?.status, failure?.wait];
    };
    const agent = (status: number) => refused(Effect.flatMap(Agent, (one) => one.call(busy(status))));
    const cloud = (status: number) => refused(Effect.flatMap(Cloud, (one) => one.call(cloudBusy(status))));
    // spec/app/platform/index.md, "A refusal carries a wait only when the other side answered 429 with a whole number of seconds, at most a day"
    expect([await agent(429), await agent(503)]).toEqual([["Refused", 429, 30], ["Refused", 503, undefined]]);
    if (phone) return;
    expect([await cloud(429), await cloud(503)]).toEqual([["Refused", 429, 30], ["Refused", 503, undefined]]);
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
    const run = <A, E, R extends Platform>(work: Effect.Effect<A, E, R>) => alpha.runtime.runPromise(work as Effect.Effect<A, E, Platform>);
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
    world.platform.earlier.set("assistant-draft:v1:device", "Draft");
    const slotted = (slot: Slot) => run(Effect.flatMap(vaulted(slot), (to) => adopt(earlierSlot("assistant-draft:v1:device"), to, (value: string) => Option.some(Redacted.make(value)))));
    expect([await slotted(shut), world.platform.earlier.get("assistant-draft:v1:device")]).toEqual(["NotAdopted", "Draft"]);
    expect([await slotted(open_), world.platform.earlier.has("assistant-draft:v1:device"), world.secrets.get("alpha.test.open")]).toEqual(["Adopted", false, "\"Draft\""]);
  });
});

// spec/app/platform/index.md, "Story: Keep my phone's state across restarts"
it("Keep my phone's state across restarts: a kept value Alpha can no longer read is set aside, and no copy waiting is written over (spec/app/platform/index.md, \"Story: Keep my phone's state across restarts\")", async () => {
  const kept = "alpha/app/shell/index@1";
  let waiting: [string, string][] = [];
  const reopened = async (value: string) => {
    await closeAll();
    localStorage.setItem(kept, value);
    for (const [key, held] of waiting) localStorage.setItem(key, held);
    const { alpha } = await open(scene(), only("home"));
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.length === 0);
    waiting = Object.entries(localStorage).filter(([key]) => key.startsWith(`${kept}.unreadable`));
  };
  // spec/app/platform/index.md, "A kept value that is no longer a state is set aside where nothing is held, and its machine starts afresh"
  await reopened(JSON.stringify({ trail: "of another shape" }));
  await reopened(JSON.stringify({ trail: 7 }));
  expect(Object.fromEntries(waiting)).toEqual({ [`${kept}.unreadable`]: JSON.stringify({ trail: "of another shape" }), [`${kept}.unreadable.2`]: JSON.stringify({ trail: 7 }) });
  expect(Boolean(button("Notes"))).toBe(true);
});
