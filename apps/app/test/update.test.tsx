// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import * as Updates from "../gen/app__update.effect.vibe";
import * as Page from "../gen/app__update__page.effect.vibe";
import { button, closeAll, later, open, press, seen, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import { apk, manifestDigest, release, tell } from "./fakes/update.ts";

underAct();
afterEach(closeAll);

const updatesOf = (alpha: Awaited<ReturnType<typeof open>>["alpha"]) => alpha.runtime.runPromise(Updates.Machine.use((updates) => updates.get()));

/** A phone running Alpha 120, signed by `signer`, whose channel offers `offered`. */
function phoneWith(offered: readonly ReturnType<typeof release>[], digest: string | undefined = manifestDigest) {
  const world = { ...scene(), phone: true };
  world.update.manifest = JSON.stringify(offered.length === 1 ? offered[0] : { schema: "alpha-update/index-v1", releases: offered });
  world.update.digest = digest;
  return world;
}

/** Settings → About, where the update rows are drawn. */
async function about(alpha: Awaited<ReturnType<typeof open>>["alpha"]) {
  await press("Settings");
  await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Settings");
  await press("About");
}

describe("Updates", () => {
  it("Check for updates and install the one offered (spec/app/update/index.md, \"Story: Check for updates\"; spec/app/update/index.md, \"Story: Install an update\")", async () => {
    const world = phoneWith([release(121), release(122, { signerSha256: "d".repeat(64) })]);
    world.update.permission = "permission-required";
    const { alpha } = await open(world);
    // spec/app/update/index.md, "Alpha checks on its own only while on screen, when a check is due, and never during another check or an install": the first check runs at once.
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.checked === "Fine" && s.installed === 120);
    // spec/app/update/index.md, "Of a complete manifest, Alpha keeps only the well-formed launcher release signed by the phone's own signing root"
    expect((await updatesOf(alpha)).offer.release.version).toBe(121);
    expect(world.update.installs).toEqual([]);
    await about(alpha);
    // spec/app/update/index.md, "Allow automatic updates is offered only while the permission is required, and opens Android's setting"
    await press("Allow automatic updates");
    expect(world.update.opened).toEqual(["install-unknown-apps"]);
    // spec/app/update/index.md, "Check for updates checks at once, unless a check or an install is under way"
    await press("Check for updates");
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.note === "Ready");
    expect([world.update.checks.length, document.body.textContent?.includes("A compatible update is ready below.")]).toEqual([2, true]);
    // spec/app/update/index.md, "Install update installs the offer that applies, unless Android's install permission is missing or Alpha is busy": the permission arrives, and the owner installs.
    world.update.permission = "supported";
    await seen(false);
    await seen(true);
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.permission === "Supported");
    await press("Install update");
    await until(alpha, alpha.runtime, Updates.Machine, (s) => !s.installing);
    expect(world.update.installs).toEqual([{ apkUrl: "https://releases.alphacompute.cc/alpha-121.apk", sha256: apk, sizeBytes: 4096, versionCode: 121 }]);
  });

  it("A failed check keeps the offer and the channel's withdrawal removes it (spec/app/update/index.md, \"Story: Keep the offer that fits this phone\")", async () => {
    const world = phoneWith([release(121)]);
    world.update.permission = "permission-required";
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.checked === "Fine");
    // spec/app/update/index.md, "A check that fails never replaces the saved offer"
    world.update.unreadable = true;
    await about(alpha);
    await press("Check for updates");
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.note === "CouldNotCheck");
    expect([(await updatesOf(alpha)).offer.release.version, (await updatesOf(alpha)).offer.manifest]).toEqual([121, 0]);
    // spec/app/update/index.md, "A check is due fifteen minutes after one that was answered, a minute after one that failed, and at once before the first or when the clock went back"
    world.update.unreadable = false;
    world.update.manifest = undefined;
    world.update.digest = undefined;
    const before = world.update.checks.length;
    await later(alpha, 59_000);
    expect(world.update.checks.length).toBe(before);
    await later(alpha, 2_000);
    // spec/app/update/index.md, "Only the answer to the newest check is taken: a complete manifest replaces the offer, a withdrawn one removes it, and anything else keeps it"
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.checked === "Fine" && s.offer.release.version === 0);
    expect(button("Install update")).toBeUndefined();
  });

  it("Alpha updates itself while the phone rests on Home, and waits while it is busy (spec/app/update/index.md, \"Story: Install an update\")", async () => {
    const world = phoneWith([release(121)]);
    world.update.installAnswer = "starting";
    const { alpha } = await open(world);
    // spec/app/update/index.md, "An automatic update starts only on screen, with the owner idle, the phone quiet, Android's permission, and an offer from a check that succeeded"
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.deferrals === 1);
    expect(world.update.installs).toEqual([{ apkUrl: "https://releases.alphacompute.cc/alpha-121.apk", sha256: apk, sizeBytes: 4096, versionCode: 121, automatic: true, manifestSha256: manifestDigest }]);
    // spec/app/update/index.md, "An automatic update Android put off is tried again after a minute, then two, four and eight, and then every fifteen"
    world.update.installAnswer = undefined;
    await later(alpha, 30_000);
    expect(world.update.installs.length).toBe(1);
    // spec/app/update/index.md, "Any one activity keeps an automatic update from starting": an open app keeps it waiting past its retry time.
    await press("Settings");
    await later(alpha, 60_000);
    expect(world.update.installs.length).toBe(1);
    await alpha.back();
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.deferrals === 0 && !s.installing);
    expect(world.update.installs.length).toBe(2);
  });

  it("A restart keeps the offer and the last check (spec/app/update/index.md, \"Story: Start again where Alpha left off\")", async () => {
    const world = phoneWith([release(121)], undefined);
    world.update.permission = "permission-required";
    const first = await open(world);
    await until(first.alpha, first.alpha.runtime, Updates.Machine, (s) => s.checked === "Fine" && s.offer.release.version === 121);
    await first.close();
    world.now += 60_000;
    const { alpha } = await open(world);
    // spec/app/update/index.md, "A restart keeps the installed version, the signing root, the saved offer, the last check and the deferrals, and forgets the permission, the owner's activity, a check or install under way, and the note"
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.installed === 120 && s.permission === "Required");
    expect([(await updatesOf(alpha)).offer.release.version, world.update.checks.length]).toEqual([121, 1]);
  });
});

describe("An open page during an update (spec/app/update/page.md, \"Story: Save my work before Alpha updates\")", () => {
  it("answers Android ready once, holds with Continue update while Android pauses, and carries on when the update settles (spec/app/update/page.md, \"Story: Carry on after the update\")", async () => {
    const world = { ...scene(), phone: true };
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Page.Machine, (s) => s.mount === "Mounted");
    // spec/app/update/page.md, "A pending update is read for this page, never an older one than the page has taken up"; spec/app/update/page.md, "When every area has saved its drafts the page answers ready, and otherwise it refuses"
    world.update.state = { pending: true, phase: "preparing", activationId: "a1", bridgeId: "b1" };
    tell(world.update, "alphaUpdateReady");
    await until(alpha, alpha.runtime, Page.Machine, (s) => s.reply === "Readied");
    expect(world.update.answers).toEqual([{ activationId: "a1", ready: true }]);
    // spec/app/update/page.md, "\"Updating Alpha…\" shows while a page holds or an update is pending, and \"Continue update\" only while it is paused and Android allows"
    world.update.state = { ...world.update.state, phase: "paused", canContinue: true };
    await later(alpha, 1_000);
    await until(alpha, alpha.runtime, Page.Machine, (s) => s.canContinue);
    expect(document.body.textContent).toContain("Updating Alpha…");
    // spec/app/update/page.md, "Continue update is sent once per tap, never while the last one is still going"
    await press("Continue update");
    await until(alpha, alpha.runtime, Page.Machine, (s) => !s.continuing);
    expect([world.update.continued, world.update.answers.length]).toEqual([["a1"], 1]);
    // spec/app/update/page.md, "The update settles for this page when nothing is pending, or with the outcome of its own activation"
    world.update.state = { activationId: "a1", bridgeId: "b1", outcome: "canceled", resumeEligible: true };
    tell(world.update, "alphaUpdateSettled");
    await until(alpha, alpha.runtime, Page.Machine, (s) => s.activation === 0 && !s.frozen);
    expect(document.body.textContent).not.toContain("Updating Alpha…");
  });

  it("a page that opens during an update holds and answers ready at once (spec/app/update/page.md, \"Story: Open Alpha while an update is pending\")", async () => {
    const world = { ...scene(), phone: true };
    world.update.state = { pending: true, phase: "preparing", activationId: "a7", bridgeId: "b7", automatic: true };
    const { alpha } = await open(world);
    // spec/app/update/page.md, "A page that was not mounted mounts its editors only once no update is pending"
    await until(alpha, alpha.runtime, Page.Machine, (s) => s.mount === "Holding" && s.reply === "Readied");
    expect([world.update.answers, document.body.textContent?.includes("Updating Alpha…")]).toEqual([[{ activationId: "a7", ready: true }], true]);
    world.update.state = { activationId: "a7", bridgeId: "b7", outcome: "installed" };
    await later(alpha, 1_000);
    await until(alpha, alpha.runtime, Page.Machine, (s) => s.mount === "Mounted");
  });
});
