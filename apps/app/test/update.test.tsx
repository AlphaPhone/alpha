// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Layers } from "../gen/app__shell__layers.effect.vibe";
import { type Engagement, Engagements } from "../src/update/activity.vibe";
import * as Updates from "../gen/app__update.effect.vibe";
import * as Page from "../gen/app__update__page.effect.vibe";
import * as Voice from "../gen/app__voice.effect.vibe";
import { dictate } from "../src/assistant/dictation.vibe";
import assistant from "../src/assistant/index.tsx";
import { button, closeAll, drawn, hardware, later, open, press, seen, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import { apk, manifestDigest, release, signer, tell } from "./fakes/update.ts";

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

/** What the account reports to updates, as its sign-in card will once the account area draws it. */
const report = (alpha: Awaited<ReturnType<typeof open>>["alpha"], area: string, engagement: Partial<Engagement>) =>
  alpha.runtime.runPromise(Effect.flatMap(Engagements, (reports) => reports.report(area, engagement)));

/** Settings → General, where the update rows are drawn. */
async function general(alpha: Awaited<ReturnType<typeof open>>["alpha"]) {
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
    await general(alpha);
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
    await general(alpha);
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
    await general(alpha);
    // spec/app/update/index.md, "Android's install permission is unsupported, required, starting or supported": a phone still starting says so, and installs nothing on its own.
    expect([document.body.textContent?.includes("Automatic updatesStarting"), world.update.installs]).toEqual([true, []]);
    await press("Check for updates");
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.note === "CouldNotCheck");
    expect([(await updatesOf(alpha)).offer.release.version, (await updatesOf(alpha)).offer.manifest]).toEqual([121, 0]);
    // spec/app/update/index.md, "A check is due fifteen minutes after one that was answered, a minute after one that failed, and at once before the first or when the clock went back"
    world.update.manifest = undefined;
    world.update.digest = undefined;
    const before = world.update.checks.length;
    await later(alpha, 59_000);
    expect(world.update.checks.length).toBe(before);
    await later(alpha, 2_000);
    await until(alpha, alpha.runtime, Updates.Machine, (s) => world.update.checks.length > before && s.check.status !== "Loading");
    // spec/app/update/index.md, "Checks that keep failing are tried again after a minute, then two, four and eight, and then every fifteen": a second failure waits two minutes.
    expect((await updatesOf(alpha)).misses).toBe(2);
    await later(alpha, 110_000);
    expect(world.update.checks.length).toBe(before + 1);
    world.update.unreadable = false;
    await later(alpha, 20_000);
    // spec/app/update/index.md, "Only the answer to the newest check is taken: a complete manifest replaces the offer, a withdrawn one removes it, and anything else keeps it"
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.checked === "Fine" && s.offer.release.version === 0);
    expect(button("Install update")).toBeUndefined();
  });

  it("Only a complete manifest of well-formed releases is understood, and a check that never answers is unreadable (spec/app/update/index.md, \"Story: Read the update channel\")", async () => {
    const world = phoneWith([release(121)]);
    world.update.permission = "permission-required";
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.checked === "Fine" && s.offer.release.version === 121);
    await general(alpha);
    /** Asks for a check from Settings while the channel serves `manifest`, and waits for what Settings says. */
    const checking = async (manifest: unknown) => {
      world.update.manifest = JSON.stringify(manifest);
      const before = world.update.checks.length;
      await press("Check for updates");
      await until(alpha, alpha.runtime, Updates.Machine, (s) => world.update.checks.length > before && s.note !== "Silent");
      return updatesOf(alpha);
    };
    // spec/app/update/index.md, "A release is well formed only with a signer, a version, an HTTPS address of at most 2048 characters without credentials, a digest, and a size of at most 2 GiB"; spec/app/update/index.md, "A check that fails never replaces the saved offer"
    for (const broken of [
      { apkUrl: "http://releases.alphacompute.cc/alpha-122.apk" }, { apkUrl: "https://owner:secret@releases.alphacompute.cc/alpha-122.apk" },
      { sha256: "B".repeat(64) }, { sha256: "b".repeat(63) }, { signerSha256: signer.toUpperCase() }, { sizeBytes: 0 },
    ]) expect(await checking(release(122, broken))).toMatchObject({ note: "CouldNotCheck", checked: "Missed", offer: { release: { version: 121 }, manifest: 0 } });
    // spec/app/update/index.md, "An index of more than 16 releases is not complete"
    const seventeen = Array.from({ length: 17 }, (_, at) => release(122, { signerSha256: at === 0 ? signer : at.toString(16).padStart(64, "e") }));
    expect(await checking({ schema: "alpha-update/index-v1", releases: seventeen })).toMatchObject({ note: "CouldNotCheck", offer: { release: { version: 121 } } });
    // spec/app/update/index.md, "A version name is shown only when it has 1 to 64 characters, and notes only when they have at most 500": a name with a control character counts as none.
    expect(await checking(release(122, { versionName: "1.122\u0007" }))).toMatchObject({ note: "Ready", offer: { release: { version: 122, name: 0, versionName: "" } } });
    expect([document.body.textContent?.includes("Version 1.122"), document.body.textContent?.includes("122")]).toEqual([false, true]);
    // spec/app/update/index.md, "Every check and every install ends, so Settings never waits on one for ever": a check the channel never answers is unreadable after a minute.
    world.update.checkHeld = new Promise<void>(() => {});
    const before = world.update.checks.length;
    await press("Check for updates");
    await until(alpha, alpha.runtime, Updates.Machine, (s) => world.update.checks.length > before && s.check.status === "Loading");
    await later(alpha, 60_000);
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.note === "CouldNotCheck" && s.check.status !== "Loading");
    expect((await updatesOf(alpha)).offer.release.version).toBe(122);
  });

  it("Alpha updates itself while the phone rests on Home, and waits while it is busy (spec/app/update/index.md, \"Story: Install an update\")", async () => {
    const world = phoneWith([release(121)]);
    world.update.installAnswer = "starting";
    world.voice.onDevice = false;
    world.voice.credentialId = "cred-owner-9";
    const { alpha } = await open(world);
    // spec/app/update/index.md, "An automatic update starts only on screen, with the owner idle, the phone quiet, Android's permission, and an offer from a check that succeeded"
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.deferrals === 1);
    expect(world.update.installs).toEqual([{ apkUrl: "https://releases.alphacompute.cc/alpha-121.apk", sha256: apk, sizeBytes: 4096, versionCode: 121, automatic: true, manifestSha256: manifestDigest }]);
    // spec/app/update/index.md, "An automatic update Android put off is tried again after a minute, then two, four and eight, and then every fifteen"
    world.update.installAnswer = undefined;
    await later(alpha, 30_000);
    expect(world.update.installs.length).toBe(1);
    // spec/app/update/index.md, "The owner is idle only on Home with nothing open, not typing, no voice, no dialog and the connection not busy, and the phone is quiet only with Alpha in front, no call and normal audio"; spec/app/update/index.md, "Alpha holds what the phone reports, the owner's activity, the check, the saved offer and whether an install is under way": a voice conversation, as voice reports it, keeps it waiting past its retry time.
    await until(alpha, assistant.runtime(alpha), Voice.Machine, (s) => s.route.account === "CloudAccount" && s.route.consent && s.warmed);
    await press("Talk");
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.activity.voice);
    await later(alpha, 60_000);
    expect(world.update.installs.length).toBe(1);
    // spec/app/update/index.md, "A signed-out phone resting on its untouched sign-in card is idle; a card touched in any way is an open screen"
    await report(alpha, "account", { card: "Touched" });
    await press("Stop voice conversation");
    await until(alpha, alpha.runtime, Updates.Machine, (s) => !s.activity.voice && s.activity.open);
    await alpha.back();
    await later(alpha, 120_000);
    expect(world.update.installs.length).toBe(1);
    // spec/app/update/index.md, "Any one activity keeps an automatic update from starting": an open app keeps it waiting too.
    await press("Settings");
    await later(alpha, 60_000);
    expect(world.update.installs.length).toBe(1);
    await alpha.back();
    const field = document.body.appendChild(document.createElement("input"));
    await drawn(() => field.focus());
    await report(alpha, "account", { card: "Resting" });
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.deferrals === 0 && !s.installing);
    expect([world.update.installs.length, (await updatesOf(alpha)).activity.typing]).toEqual([2, false]);
    field.remove();
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
    // spec/app/update/page.md, "An update read under another bridge is never taken up or answered by this page"
    world.update.state = { pending: true, phase: "preparing", activationId: "a2", bridgeId: "b2" };
    await later(alpha, 1_000);
    await until(alpha, alpha.runtime, Page.Machine, (s) => !s.canContinue && s.activation !== 0);
    expect([world.update.answers.length, document.body.textContent?.includes("Updating Alpha…")]).toEqual([1, true]);
    // spec/app/update/page.md, "An unknown outcome lets a page go only once Android's updater is idle, and then neither reconnects nor explains"
    world.update.state = { activationId: "a1", bridgeId: "b1", outcome: "rolled-back" };
    await later(alpha, 1_000);
    expect((await alpha.runtime.runPromise(Page.Machine.use((page) => page.get()))).activation).not.toBe(0);
    // spec/app/update/page.md, "The update settles for this page when nothing is pending, or with the outcome of its own activation"
    const reconnects = world.update.health.length;
    world.update.state = { activationId: "a1", bridgeId: "b1", outcome: "canceled", resume: true, idle: true };
    tell(world.update, "alphaUpdateSettled");
    // spec/app/update/page.md, "A page reconnects only after a cancelled update it was ready for"
    await until(alpha, alpha.runtime, Page.Machine, (s) => s.activation === 0 && !s.frozen);
    await until(alpha, alpha.runtime, Layers, (s) => s.holds.length === 0);
    await later(alpha, 0);
    expect(world.update.health.length).toBeGreaterThan(reconnects);
    expect(document.body.textContent).not.toContain("Updating Alpha…");
    await alpha.back();
    expect((await alpha.runtime.runPromise(Shell.use((shell) => shell.get()))).trail).toEqual([]);
  });

  it("refuses an update during a recording, and after the manual update fails says to finish first (spec/app/update/page.md, \"A page is ready for an update only with no voice turn, connection step, call or recording under way, and for a hands-off update only while the phone is still idle\")", async () => {
    const world = { ...scene(), phone: true };
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Page.Machine, (s) => s.mount === "Mounted");
    // spec/app/update/index.md, "Alpha holds what the phone reports, the owner's activity, the check, the saved offer and whether an install is under way": a recording opened for Ask Alpha's composer, as voice reports it.
    const area = assistant.runtime(alpha);
    await until(alpha, area, Voice.Machine, (s) => s.warmed);
    await drawn(() => document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]")?.focus());
    await drawn(() => area.runPromise(dictate()));
    await until(alpha, alpha.runtime, Updates.Machine, (s) => s.activity.recording);
    world.update.state = { pending: true, phase: "preparing", activationId: "a3", bridgeId: "b3" };
    tell(world.update, "alphaUpdateReady");
    // spec/app/update/page.md, "No page is ready for an update while it is recording"
    await until(alpha, alpha.runtime, Page.Machine, (s) => s.reply === "Refused");
    expect(world.update.answers).toEqual([{ activationId: "a3", ready: false }]);
    // spec/app/update/page.md, "The refusal is explained only for a manual update this page itself refused"
    const reconnects = world.update.health.length;
    world.update.state = { activationId: "a3", bridgeId: "b3", outcome: "failed", idle: true };
    tell(world.update, "alphaUpdateSettled");
    await until(alpha, alpha.runtime, Page.Machine, (s) => s.activation === 0 && s.notice);
    await later(alpha, 0);
    expect(document.body.textContent).toContain("Finish your changes, then try updating again.");
    // spec/app/update/page.md, "A page reconnects only after a cancelled update it was ready for": a failure is no reason to.
    expect(world.update.health.length).toBe(reconnects);
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
    world.update.state = { activationId: "a7", bridgeId: "b7", outcome: "installed", idle: true };
    await later(alpha, 1_000);
    await until(alpha, alpha.runtime, Page.Machine, (s) => s.mount === "Mounted");
  });
});
