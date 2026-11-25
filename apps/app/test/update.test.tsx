// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Layers } from "../gen/app__shell__layers.effect.vibe";
import { type Engagement, Engagements } from "../src/update/activity.vibe";
import * as Updates from "../gen/app__update.effect.vibe";
import * as Page from "../gen/app__update__page.effect.vibe";
import { button, closeAll, drawn, hardware, later, open, press, seen, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import { apk, manifestDigest, release, tell } from "./fakes/update.ts";

underAct();
afterEach(closeAll);

/** The pressable row whose title is `title`, regardless of its second-line detail. */
const rowButton = (title: string) => [...document.querySelectorAll("button")].find((found) => found.querySelector("span > span")?.textContent === title);
const pressRow = (title: string) => drawn(() => {
  const found = rowButton(title);
  if (!found) throw new Error(`no button ${title}`);
  found.click();
});

const updatesOf = (alpha: Awaited<ReturnType<typeof open>>["alpha"]) => alpha.runtime.runPromise(Updates.Machine.use((updates) => updates.get()));

/** A phone running Alpha 120, signed by `signer`, whose channel offers `offered`. */
function phoneWith(offered: readonly ReturnType<typeof release>[], digest: string | undefined = manifestDigest) {
  const world = { ...scene(), phone: true };
  world.update.manifest = JSON.stringify(offered.length === 1 ? offered[0] : { schema: "alpha-update/index-v1", releases: offered });
  world.update.digest = digest;
  return world;
}

/** What another area reports to updates, as that area does. */
const report = (alpha: Awaited<ReturnType<typeof open>>["alpha"], area: string, engagement: Partial<Engagement>) =>
  alpha.runtime.runPromise(Effect.flatMap(Engagements, (reports) => reports.report(area, engagement)));

/** Settings → About, where the update rows are drawn. */
async function about(alpha: Awaited<ReturnType<typeof open>>["alpha"]) {
  await press("Settings");
  await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Settings");
  await press("General");
}

describe("Updates", () => {
  it("Check for updates and install the one offered (spec/app/update/index.md, \"Story: Check for updates\"; spec/app/update/index.md, \"Story: Install an update\")", async () => {
    const world = phoneWith([release(121, { notes: "Fixes the clock." }), release(122, { signerSha256: "d".repeat(64) })]);
    world.update.permission = "permission-required";
    const { alpha } = await open(world);
    // spec/app/update/index.md, "Alpha checks on its own only while on screen, when a check is due, and never during another check or an install": the first check runs at once.
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.checked === "Fine" && s.installed === 120);
    // spec/app/update/index.md, "Of a complete manifest, Alpha keeps only the well-formed launcher release signed by the phone's own signing root"
    expect((await updatesOf(alpha)).offer.release.version).toBe(121);
    expect(world.update.installs).toEqual([]);
    await about(alpha);
    // spec/app/update/index.md, "A version name is shown only when it has 1 to 64 characters, and notes only when they have at most 500"
    expect([document.body.textContent?.includes("Version 1.121 (121)"), document.body.textContent?.includes("Fixes the clock.")]).toEqual([true, true]);
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
    // spec/app/update/index.md, "Android's install permission is unsupported, required, starting or supported"
    expect(document.body.textContent).toContain("Automatic updatesAllowed");
    let letGo = () => {};
    world.update.installHeld = new Promise<void>((resolve) => { letGo = resolve; });
    await pressRow("Install update");
    // spec/app/update/index.md, "Settings shows Install update with the offered version while an offer applies, and its label says when it is downloading"
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.installing);
    expect([document.body.textContent?.includes("Downloading update"), button("Check for updates")]).toEqual([true, undefined]);
    letGo();
    await until(alpha, alpha.runtime, Updates.Machine, (s) => !s.installing);
    expect(world.update.installs).toEqual([{ apkUrl: "https://releases.alphacompute.cc/alpha-121.apk", sha256: apk, sizeBytes: 4096, versionCode: 121 }]);
    // spec/app/update/index.md, "After Install update, Settings says whether Android took the update, the offer is gone, Android's permission is missing, or it could not start"
    expect(document.body.textContent).toContain("Android is installing the update.");
  });

  it("Install update that Android refuses says why at once (spec/app/update/index.md, \"Story: Install an update\")", async () => {
    const world = phoneWith([release(121)]);
    world.update.permission = "unsupported";
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.checked === "Fine" && s.offer.release.version === 121);
    await about(alpha);
    // spec/app/update/index.md, "An install Android refused for its permission offers Allow automatic updates at once"
    world.update.installAnswer = "permission-required";
    await pressRow("Install update");
    await until(alpha, alpha.runtime, Updates.Machine, (s) => !s.installing && s.permission === "Required");
    expect([button("Allow automatic updates") !== undefined, rowButton("Install update"), document.body.textContent?.includes("Allow Alpha to install updates, then try again.")]).toEqual([true, undefined, true]);
    // spec/app/update/index.md, "When the install ends, is put off, or finds its offer changed or withdrawn, Alpha is free again": a withdrawn offer goes, and a check falls due at once.
    world.update.permission = "supported";
    await seen(false);
    await seen(true);
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.permission === "Supported");
    // spec/app/update/index.md, "After Install update, Settings says whether Android took the update, the offer is gone, Android's permission is missing, or it could not start": a changed offer waits for the next check.
    world.update.installAnswer = "offer-response-changed";
    await pressRow("Install update");
    await until(alpha, alpha.runtime, Updates.Machine, (s) => !s.installing && s.note === "CouldNotStart");
    expect([(await updatesOf(alpha)).offer.manifest, document.body.textContent?.includes("The update couldn’t start. Try again.")]).toEqual([0, true]);
    world.update.installAnswer = "offer-withdrawn";
    world.update.manifest = undefined;
    world.update.digest = undefined;
    const checks = world.update.checks.length;
    await pressRow("Install update");
    await until(alpha, alpha.runtime, Updates.Machine, (s) => !s.installing && s.offer.release.version === 0);
    expect(document.body.textContent).toContain("The update is no longer offered.");
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.checked === "Fine");
    expect(world.update.checks.length).toBe(checks + 1);
  });

  it("A failed check keeps the offer and the channel's withdrawal removes it (spec/app/update/index.md, \"Story: Keep the offer that fits this phone\")", async () => {
    const world = phoneWith([release(121)]);
    world.update.permission = "starting";
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.checked === "Fine");
    // spec/app/update/index.md, "A check that fails never replaces the saved offer"
    world.update.unreadable = true;
    await about(alpha);
    // spec/app/update/index.md, "Android's install permission is unsupported, required, starting or supported": a phone still starting says so, and installs nothing on its own.
    expect([document.body.textContent?.includes("Automatic updatesStarting"), world.update.installs]).toEqual([true, []]);
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
    // spec/app/update/index.md, "The owner is idle only on Home with nothing open, not typing, no voice, no dialog and the connection not busy, and the phone is quiet only with Alpha in front, no call and normal audio": a recording another area reports keeps it waiting too.
    await report(alpha, "notes", { recording: true });
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.activity.recording);
    await alpha.back();
    await later(alpha, 120_000);
    expect(world.update.installs.length).toBe(1);
    // spec/app/update/index.md, "A signed-out phone resting on its untouched sign-in card is idle; a card touched in any way is an open screen"
    await report(alpha, "account", { card: "Touched" });
    await report(alpha, "notes", {});
    await until(alpha, alpha.runtime, Updates.Machine, (s) => !s.activity.recording && s.activity.open);
    await later(alpha, 120_000);
    expect(world.update.installs.length).toBe(1);
    await report(alpha, "account", { card: "Resting" });
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
    await press("Settings");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Settings");
    // spec/app/update/page.md, "A pending update is read for this page, never an older one than the page has taken up"; spec/app/update/page.md, "When every area has saved its drafts the page answers ready, and otherwise it refuses"
    world.update.state = { pending: true, phase: "preparing", activationId: "a1", bridgeId: "b1" };
    tell(world.update, "alphaUpdateReady");
    await until(alpha, alpha.runtime, Page.Machine, (s) => s.reply === "Readied");
    expect(world.update.answers).toEqual([{ activationId: "a1", ready: true }]);
    // spec/app/update/page.md, "A mounted page's navigation is frozen exactly while an update is pending": Back and Home take nothing.
    await until(alpha, alpha.runtime, Layers, (s) => s.holds.includes("update"));
    await hardware("back");
    await hardware("home");
    expect((await alpha.runtime.runPromise(Shell.use((shell) => shell.get()))).trail).toEqual(["Settings"]);
    // spec/app/update/page.md, "Updating Alpha… shows while a page holds or an update is pending, and Continue update only while it is paused and Android allows"
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
    // spec/app/update/page.md, "A page reconnects only after a cancelled update it was ready for"
    await until(alpha, alpha.runtime, Page.Machine, (s) => s.activation === 0 && !s.frozen);
    await until(alpha, alpha.runtime, Layers, (s) => s.holds.length === 0);
    expect(document.body.textContent).not.toContain("Updating Alpha…");
    await alpha.back();
    expect((await alpha.runtime.runPromise(Shell.use((shell) => shell.get()))).trail).toEqual([]);
  });

  it("refuses an update during a recording, and after the manual update fails says to finish first (spec/app/update/page.md, \"A page is ready for an update only with no voice turn, connection step, call or recording under way, and for a hands-off update only while the phone is still idle\")", async () => {
    const world = { ...scene(), phone: true };
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Page.Machine, (s) => s.mount === "Mounted");
    await report(alpha, "notes", { recording: true });
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.activity.recording);
    world.update.state = { pending: true, phase: "preparing", activationId: "a3", bridgeId: "b3" };
    tell(world.update, "alphaUpdateReady");
    // spec/app/update/page.md, "No page is ready for an update while it is recording"
    await until(alpha, alpha.runtime, Page.Machine, (s) => s.reply === "Refused");
    expect(world.update.answers).toEqual([{ activationId: "a3", ready: false }]);
    // spec/app/update/page.md, "The refusal is explained only for a manual update this page itself refused"
    world.update.state = { activationId: "a3", bridgeId: "b3", outcome: "failed" };
    tell(world.update, "alphaUpdateSettled");
    await until(alpha, alpha.runtime, Page.Machine, (s) => s.activation === 0 && s.notice);
    await later(alpha, 0);
    expect(document.body.textContent).toContain("Finish your changes, then try updating again.");
  });

  it("a page that cannot read the update holds, and a browser has no update to wait for (spec/app/update/page.md, \"A page that cannot read the update state holds rather than mount\")", async () => {
    const world = { ...scene(), phone: true };
    world.update.stateUnreadable = true;
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Page.Machine, (s) => s.mount === "Holding");
    expect([document.body.textContent?.includes("Updating Alpha…"), button("Settings")]).toEqual([true, undefined]);
    world.update.stateUnreadable = false;
    await later(alpha, 1_000);
    await until(alpha, alpha.runtime, Page.Machine, (s) => s.mount === "Mounted");
    expect(button("Settings")).toBeDefined();
    await closeAll();
    const browser = await open(scene());
    await until(browser.alpha, browser.alpha.runtime, Page.Machine, (s) => s.mount === "Mounted");
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
