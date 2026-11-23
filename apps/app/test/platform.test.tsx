// @vitest-environment happy-dom
import { CloudError } from "@elizaos/cloud/client";
import { Effect, Exit, Layer, Option, Redacted } from "effect";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { at, mounts } from "../src/areas.ts";
import { Cloud } from "../src/platform/cloud.vibe";
import { type Slot, Vault } from "../src/platform/vault.vibe";
import { area } from "../src/runtime/area.tsx";
import { button, closeAll, hardware, only, open, press, underAct, until } from "./alpha.tsx";
import { account } from "./fakes/cloud.ts";
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
    world.signedIn = false;
    expect(failed(await alpha.runtime.runPromiseExit(Effect.flatMap(Cloud, (cloud) => cloud.call(HttpClientRequest.get("/api/v1/user")))))?._tag).toBe("Unsent");
    expect(failed(await asked())).toBeInstanceOf(CloudError);
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
});
