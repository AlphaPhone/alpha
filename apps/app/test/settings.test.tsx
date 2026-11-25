// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as Android from "../gen/app__settings__android.effect.vibe";
import * as Carrier from "../gen/app__settings__carrier.effect.vibe";
import * as Developer from "../gen/app__settings__developer.effect.vibe";
import * as Facts from "../gen/app__settings__facts.effect.vibe";
import * as Licences from "../gen/app__settings__licences.effect.vibe";
import * as Network from "../gen/app__settings__network.effect.vibe";
import * as Prefs from "../gen/app__settings__preferences.effect.vibe";
import * as Reset from "../gen/app__settings__reset.effect.vibe";
import * as Pages from "../gen/app__settings.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import * as Layers from "../gen/app__shell__layers.effect.vibe";
import settings from "../src/settings/index.tsx";
import { button, closeAll, fill, hardware, later, only, open as openAlpha, press, seen, underAct, until } from "./alpha.tsx";
import { account } from "./fakes/cloud.ts";
import { notices } from "./fakes/settings.ts";
import { type Scene, scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const shipped = vi.fn(() => Promise.resolve(Response.json(notices)));
vi.stubGlobal("fetch", ((input: RequestInfo | URL, init?: RequestInit) => (String(input).endsWith("licenses/third-party-notices.json") ? shipped() : fetch(input, init))) as typeof fetch);

const open = (world: Scene) => openAlpha(world, only("home", "view:Settings", "settings/phone", "settings/activity", "overlay"));

/** The row, switch or choice whose title is `title`, as a person reads it: a row's title, never its value beside it. */
const titled = (title: string) => [...document.querySelectorAll<HTMLElement>("button, label")].find((found) => found.querySelector("span > span")?.textContent === title);

/** Press the row titled `title`; a switch's or a choice's row presses its control, as a tap on the row does. */
const tap = (title: string) => act(async () => {
  const found = titled(title);
  if (!found) throw new Error(`no row ${title}`);
  const control = found instanceof HTMLLabelElement ? document.getElementById(found.htmlFor) : found;
  (control ?? found).click();
});

const page = (alpha: Awaited<ReturnType<typeof open>>["alpha"]) => alpha.runtime.runPromise(Pages.Machine.use((pages) => pages.get())).then((state) => state.page);

/** Alpha on a phone, its Settings open at the first page with the phone's facts read. */
async function settingsOpen(world = { ...scene(), phone: true }) {
  const running = await open(world);
  await press("Settings");
  await until(running.alpha, running.alpha.runtime, Shell, (s) => s.trail.at(-1) === "Settings");
  const machines = settings.runtime(running.alpha);
  return { ...running, world, machines };
}

describe("Settings", () => {
  it("Find a setting and come back (spec/app/settings/index.md, \"Story: Find a setting and come back\")", async () => {
    const { alpha, machines, world } = await settingsOpen();
    // spec/app/settings/index.md, "The build says once whether it is a development build, and the phone whether Alpha runs on a phone and on an Alpha image"
    await until(alpha, alpha.runtime, Pages.Machine, (s) => s.told && s.phone && !s.image && s.development);
    // spec/app/settings/index.md, "A row opens only an admitted page that hangs from the page showing, at its top"
    await press("General");
    expect([await page(alpha), Boolean(button("Network")), Boolean(button("Carrier & SIM setup")), Boolean(button("Phone"))]).toEqual(["General", true, true, false]);
    await press("Display");
    // spec/app/settings/index.md, "Back shows the parent and forgets the page it closed": Back inside Settings closes the page, and on the first page leaves the app.
    await hardware("back");
    expect(await page(alpha)).toBe("General");
    await hardware("back");
    await hardware("back");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.length === 0);
    // spec/app/settings/index.md, "A notice or Ask Alpha may open a section directly, at its top, and Back from it goes to its parent"
    await alpha.runtime.runPromise(Pages.Machine.use((pages) => pages.send({ type: "openSection", page: "Display" })));
    await press("Settings");
    await until(alpha, alpha.runtime, Pages.Machine, (s) => s.page === "Display");
    await hardware("back");
    expect(await page(alpha)).toBe("General");
    await hardware("back");
    // spec/app/settings/index.md, "Each page links to what another area owns there": the Account sheet reads the signed-in account and Back returns to Settings.
    await press("Account");
    await until(alpha, alpha.runtime, Layers.Machine, (state) => Layers.listed(state, "account"));
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')?.textContent).toContain(account.email));
    await hardware("back");
    await until(alpha, alpha.runtime, Layers.Machine, (state) => !Layers.listed(state, "account"));
    expect(await page(alpha)).toBe("Top");

    world.signedIn = false;
    await press("Account");
    await until(alpha, alpha.runtime, Layers.Machine, (state) => Layers.listed(state, "account"));
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Sign-in required"));
    expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain(account.email);
    await press("Close Account");
    await until(alpha, alpha.runtime, Layers.Machine, (state) => !Layers.listed(state, "account"));
    world.signedIn = true;

    // spec/app/settings/index.md, "Each page links to what another area owns there": Agent activity offers the conversations, which the shell opens over the app.
    await press("About");
    await press("Agent activity");
    await press("Conversations");
    await until(alpha, alpha.runtime, Shell, (s) => s.assistant === "Full");
    expect((await machines.runPromise(Facts.Machine.use((facts) => facts.get()))).read.read.status).toBe("Loaded");
    expect(world.settings.opened).toEqual([]);
  });

  it("See what the phone says (spec/app/settings/facts.md, \"Story: See what the phone says\")", async () => {
    const initial = { ...scene(), phone: true };
    initial.maps.precision = "approximate";
    const { alpha, machines, world } = await settingsOpen(initial);
    await until(alpha, machines, Facts.Machine, (s) => s.read.read.status === "Loaded");
    const shown = await machines.runPromise(Facts.Machine.use((facts) => facts.get()));
    // spec/app/settings/facts.md, "Only the newest asking's answer is taken, and it replaces everything shown": what the phone did not report is unavailable, never guessed.
    expect([Facts.word(shown, "Wifi"), Facts.word(shown, "Bluetooth"), Facts.word(shown, "Versions"), Facts.word(shown, "AndroidVersion"), Facts.accessWord(shown, "LocationAccess"), Facts.accessWord(shown, "CameraAccess"), Facts.accessWord(shown, "MicrophoneAccess")])
      .toEqual(["Reported", "Unavailable", "Reported", "Reported", "Approximate", "AccessUnavailable", "Off"]);
    // spec/app/settings/facts.md, "A read not answered within ten seconds is abandoned, and every fact is then unavailable"
    let answer = () => {};
    world.settings.gate = new Promise<void>((done) => { answer = done; });
    await press("General");
    await press("Refresh");
    await until(alpha, machines, Facts.Machine, (s) => s.read.read.status === "Loading");
    await later(alpha, 10_000);
    await until(alpha, machines, Facts.Machine, (s) => s.read.read.status === "Failed" && s.reported.length === 0);
    answer();
    // spec/app/settings/facts.md, "Leaving Settings retires the read in flight and forgets what was shown, so the next opening waits for a fresh answer"
    await hardware("home");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.length === 0);
    await until(alpha, machines, Facts.Machine, (s) => s.reported.length === 0 && s.read.read.status !== "Loading");
    await press("Settings");
    await until(alpha, machines, Facts.Machine, (s) => s.read.read.status === "Loaded" && s.reported.length > 0);
    // spec/app/settings/facts.md, "Opening Settings and Refresh read the phone; Alpha coming back to the front reads it again if Settings is showing"
    world.settings.facts = { ...world.settings.facts, bluetoothEnabled: true };
    await seen(false);
    await seen(true);
    await until(alpha, machines, Facts.Machine, (s) => Facts.word(s, "Bluetooth") === "Reported");
  });

  it("Make Alpha the Home app (spec/app/settings/facts.md, \"Story: Make Alpha the Home app\")", async () => {
    const { alpha, machines } = await settingsOpen();
    await press("General");
    await until(alpha, machines, Facts.Machine, (s) => s.read.read.status === "Loaded" && s.home === "AnotherApp");
    // spec/app/settings/facts.md, "When Android's dialog closes, the phone is read again if Settings is showing, and the role shown is what that read reports"
    await tap("Set as Home");
    await until(alpha, machines, Facts.Machine, (s) => s.home === "Alpha" && s.read.read.status === "Loaded");
    expect(Boolean(titled("Set as Home"))).toBe(false);
  });

  describe.each([["a browser", false], ["a phone", true]])("in %s", (_where, phone) => {
    it("Change what only Android can change (spec/app/settings/android.md, \"Story: Change what only Android can change\")", async () => {
      const { alpha, machines, world } = await settingsOpen({ ...scene(), phone });
      await press("General");
      // spec/app/settings/android.md, "Android says whether it opened that page, a nearby one, or none"
      await tap("Wi-Fi");
      await until(alpha, machines, Android.Machine, (s) => s.start.read.status !== "Loading");
      const exactly = await machines.runPromise(Android.Machine.use((android) => android.get()));
      expect(exactly.told).toBe(phone ? "Silent" : "SaidUnavailable");
      if (!phone) return;
      await tap("Mobile data");
      await until(alpha, machines, Android.Machine, (s) => s.told === "SaidNearby");
      // spec/app/settings/android.md, "Alpha's alert, permission and photo pages open for Alpha itself, never for another app, and a channel's page names its channel"
      await press("Notifications");
      await tap("Alpha's alerts");
      await until(alpha, machines, Android.Machine, (s) => s.target === "AlphaAlerts" && s.start.read.status === "Loaded");
      await tap("Reminders");
      await until(alpha, machines, Android.Machine, (s) => s.target === "AlertChannel" && s.start.read.status === "Loaded");
      expect(world.settings.opened).toEqual(["wifi", "mobile", "notifications", "channel opaque-reminders"]);
    });
  });

  it("Look at access again (spec/app/startup/access.md, \"Story: Look at access again\")", async () => {
    const { alpha, world, machines } = await settingsOpen();
    await press("Privacy");
    await press("Permissions");
    await until(alpha, machines, Facts.Machine, (s) => Facts.accessWord(s, "MicrophoneAccess") === "Off");
    await tap("Microphone");
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"] [aria-current="step"]')?.textContent).toContain("Microphone"));
    await press("Settings");
    await vi.waitFor(() => expect(world.settings.opened).toEqual(["privacy"]));
    world.settings.hostFacts.permissions.Microphone = true;
    await seen(false);
    await seen(true);
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"] [aria-current="step"]')?.textContent).toContain("Allowed"));
    await press("Done");
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    expect(await page(alpha)).toBe("Permissions");
  });

  it("Choose how Alpha looks, at my size, and keep it (spec/app/settings/preferences.md, \"Story: Choose how Alpha looks\"; spec/app/settings/preferences.md, \"Story: Make the text larger or smaller\"; spec/app/settings/preferences.md, \"Story: Keep my preferences through a restart\")", async () => {
    // spec/app/settings/preferences.md, "Alpha starts with the appearance and legible text it kept, or Light and ordinary text when nothing readable was kept, and the phone's look; it reads the text size and the device preferences again, and drops what was in flight": the previous Alpha's dark theme is kept.
    localStorage.setItem("alpha.appearance.v1", "dark");
    const world = { ...scene(), phone: true };
    const first = await open(world);
    await until(first.alpha, first.alpha.runtime, Prefs.Machine, (s) => s.kept === "Dark" && s.size === 100);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    await press("Settings");
    await press("General");
    await press("Display");
    // spec/app/settings/preferences.md, "A choice shows at once and is kept on the phone, one at a time, with ten seconds to be kept"
    await press("Light");
    await until(first.alpha, first.alpha.runtime, Prefs.Machine, (s) => s.kept === "Light" && s.keeping.read.status === "Loaded");
    // spec/app/settings/preferences.md, "Legible text is turned on or off by the owner and kept with the appearance, the same way"
    await tap("Legible text");
    await until(first.alpha, first.alpha.runtime, Prefs.Machine, (s) => s.keptLegible);
    // spec/app/settings/preferences.md, "The size shown is the one the phone says it applied; when it cannot say, Alpha says so and reads the size again"
    await press("150 percent");
    await until(first.alpha, first.alpha.runtime, Prefs.Machine, (s) => s.size === 150 && !s.changing);
    expect([document.documentElement.classList.contains("dark"), document.documentElement.hasAttribute("data-alpha-legible"), document.documentElement.style.fontSize, document.documentElement.hasAttribute("data-alpha-large-text")])
      .toEqual([false, true, "150%", true]);
    await first.close();
    const second = await open(world);
    await until(second.alpha, second.alpha.runtime, Prefs.Machine, (s) => s.kept === "Light" && s.keptLegible && s.size === 150);
  });

  it("Decide whether Alpha asks before it acts (spec/app/settings/preferences.md, \"Story: Decide whether Alpha asks before it acts\")", async () => {
    // spec/app/settings/preferences.md, "What the phone could not read is taken as asking first, loading no images and sharing nothing"
    localStorage.setItem("alpha.preferences", "{ not json");
    const { alpha, world } = await settingsOpen();
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.document.read.status === "Failed");
    const unread = await alpha.runtime.runPromise(Prefs.Machine.use((prefs) => prefs.get()));
    expect([Prefs.asksBeforeActing(unread, "WebAction"), Prefs.allows(unread, "BrowserPage")]).toEqual([true, false]);
    // spec/app/settings/preferences.md, "The agent is launched allowed to change Gmail and Calendar exactly as the phone last read or saved, allowed neither once it could not read them, and Alpha says nothing of it before the first answer"
    await vi.waitFor(() => expect(world.settings.consents).toEqual([{ gmailChanges: false, calendarEdits: false }]));
    // spec/app/settings/preferences.md, "When the device preferences cannot be read, the owner can recover them: the phone resets them to its defaults, and they are read again"
    await press("Privacy");
    await tap("Recover device settings");
    await press("Recover");
    // spec/app/settings/preferences.md, "A new phone lets Alpha act without asking first, load images in Inbox, use its location and the Browser page open, and change Gmail and Calendar"
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.document.read.status === "Loaded" && Prefs.allows(s, "BrowserPage") && !Prefs.asksBeforeActing(s, "WebAction") && s.images);
    // spec/app/settings/preferences.md, "The owner changes Ask before Alpha acts, Load images or what Alpha may share only once the phone has read them, one save at a time, with ten seconds to save"
    await tap("Ask before Alpha acts");
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.saving.read.status === "Loaded" && Prefs.asksBeforeActing(s, "WebAction"));
    await tap("Browser page");
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.saving.read.status === "Loaded" && !Prefs.allows(s, "BrowserPage"));
    expect(JSON.parse(localStorage.getItem("alpha.preferences") ?? "{}")).toEqual({ askFirst: true, images: true, shares: ["AgentLocation", "GmailChanges", "CalendarEdits"] });
    await tap("Gmail changes");
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.saving.read.status === "Loaded" && !Prefs.allows(s, "GmailChanges"));
    await vi.waitFor(() => expect(world.settings.consents).toEqual([
      { gmailChanges: false, calendarEdits: false }, { gmailChanges: true, calendarEdits: true }, { gmailChanges: false, calendarEdits: true },
    ]));
  });

  it("A phone updated from the previous Alpha keeps its choices (spec/app/settings/preferences.md, \"The device preferences are read when Alpha starts, when Settings opens, and when Alpha comes back while Settings shows, with ten seconds to answer, never while a change or a recovery is in flight\")", async () => {
    localStorage.setItem("alpha.browser.device.v1", JSON.stringify({ askBeforeAgentActions: false, agentLocationEnabled: false, autoLoadMailImages: true }));
    const { alpha } = await open({ ...scene(), phone: true });
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.document.read.status === "Loaded");
    const adopted = await alpha.runtime.runPromise(Prefs.Machine.use((prefs) => prefs.get()));
    expect([adopted.askFirst, adopted.images, adopted.shares]).toEqual([false, true, ["BrowserPage", "GmailChanges", "CalendarEdits"]]);
    expect(localStorage.getItem("alpha.preferences")).toBeNull();
  });

  it("Read the licences (spec/app/settings/licences.md, \"Story: Read the licences\")", async () => {
    const { alpha, machines } = await settingsOpen();
    await press("About");
    await press("Licenses");
    await until(alpha, machines, Licences.Machine, (s) => s.load.read.status === "Loaded" && s.found === 3);
    // spec/app/settings/licences.md, "Searching narrows the loaded list to the licences that match, from its top, and an empty search shows them all"
    await fill("Search licenses", "mpl");
    await until(alpha, machines, Licences.Machine, (s) => s.query === "mpl" && s.shown === 1);
    // spec/app/settings/licences.md, "Back from a licence returns to the same search"
    await tap("mediabunny");
    await until(alpha, machines, Licences.Machine, (s) => s.licence === 0);
    await hardware("back");
    await until(alpha, machines, Licences.Machine, (s) => s.licence < 0 && s.query === "mpl");
    // spec/app/settings/licences.md, "Opening the page clears the search, and loads the licences unless they are loading or loaded with some found"
    await hardware("back");
    await press("Licenses");
    await until(alpha, machines, Licences.Machine, (s) => s.query === "" && s.shown === 3);
    expect(shipped).toHaveBeenCalledTimes(1);
  });

  it("Read the problem log (spec/app/settings/developer.md, \"Story: Read the problem log\")", async () => {
    const world = { ...scene(), phone: true };
    world.settings.crashes = [{ at: Date.now() - 2000, source: "uncaught", errorClass: "java.lang.IllegalStateException" }, { at: Date.now() - 1000, source: "renderer", kind: "render", errorClass: "TypeError" }];
    const row = (session: number, stage: string, elapsedMs: number) => ({ session, stage, elapsedMs, clock: "monotonic-observed", sentFrames: 0, sentBytes: 0, receivedFrames: 0, receivedBytes: 0 });
    world.voice.streamTiming = {
      format: "alpha-cloud-stream-timing-v1",
      records: [row(4, "start", 0), row(4, "capture-open", 41), row(4, "consent-retry", 300), row(4, "stt-connected", 812), row(4, "first-frame-sent", 815), row(5, "start", 0), row(5, "stt-connected", 390)],
    };
    const { alpha, machines } = await settingsOpen(world);
    await press("Developer");
    await press("Problem log");
    await until(alpha, machines, Developer.Machine, (s) => s.log.read.status === "Loaded" && s.problems === 2);
    // spec/app/settings/developer.md, "Export diagnostics shares the log and Alpha's diagnostics, one export at a time, with ten seconds to start"; spec/app/settings/developer.md, "The report copies only the fields Alpha allows, so no text, address, key or identifier can reach it"
    const sharedFiles: File[] = [];
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    Object.defineProperty(navigator, "share", { configurable: true, value: (data: ShareData) => { sharedFiles.push(...(data.files ?? [])); return Promise.resolve(); } });
    await press("Export diagnostics");
    await until(alpha, machines, Developer.Machine, (s) => s.exporting.read.status === "Loaded");
    const text = await sharedFiles[0]?.text();
    const report = JSON.parse(text ?? "{}");
    expect([report.format, report.roles, report.problems.count, report.permissions, text?.includes("launcher3"), text?.includes("ai.alphacompute"), text?.includes("\"session\""), report.talk]).toEqual([
      "alpha-diagnostics/v1", [{ role: "home", held: false, available: true }, { role: "assistant", held: false, available: true }], 2, { FilesAccess: true, LocationAccess: true }, false, false, false,
      { format: "alpha-cloud-stream-timing-v1", sessions: [{ sttConnectedMs: 812, firstFrameSentMs: 815, consentRetry: true }, { sttConnectedMs: 390, firstFrameSentMs: null, consentRetry: false }] },
    ]);
    // spec/app/settings/developer.md, "Clear is offered only for a log with problems, one at a time; once the startup area answers, the log is read again": Clear asks first, and backing out clears nothing.
    await press("Clear");
    await press("Cancel");
    expect(world.settings.crashes.length).toBe(2);
    await press("Clear");
    await press("Clear log");
    await until(alpha, machines, Developer.Machine, (s) => s.log.read.status === "Loaded" && s.problems === 0);
    expect([world.settings.crashes, Boolean(button("Clear"))]).toEqual([[], false]);
  });

  it("Erase all data (spec/app/settings/reset.md, \"Story: Erase all data\")", async () => {
    const { alpha, machines, world } = await settingsOpen();
    await press("General");
    // spec/app/settings/reset.md, "Only the phone's answer to the latest review counts; an approval is recorded on the phone before anything else": a cancelled review erases nothing and needs no word.
    await press("Erase all data");
    await until(alpha, machines, Reset.Machine, (s) => s.review.read.status === "Failed");
    expect((await machines.runPromise(Reset.Machine.use((reset) => reset.get()))).said).toBe("Quiet");
    world.settings.reset = { status: "unavailable", message: "Reset is unavailable." };
    await press("Erase all data");
    await until(alpha, machines, Reset.Machine, (s) => s.said === "EraseUnavailable");
    expect([world.settings.reviews, (await machines.runPromise(Reset.Machine.use((reset) => reset.get()))).pending]).toEqual([[1, 2], false]);
  });

  it("Join a nearby network (spec/app/settings/network.md, \"Story: Join a nearby network\"; spec/app/settings/network.md, \"Story: See whether I am online\")", async () => {
    const { alpha, machines, world } = await settingsOpen();
    await press("General");
    await press("Network");
    await until(alpha, machines, Network.Machine, (s) => s.scan === "Found" && s.found === 1 && s.online === "Validated");
    await tap("home");
    // spec/app/settings/network.md, "A passphrase fits its network before Android is asked: none for an open network, 8 to 63 printable characters for WPA2 and 1 to 63 for WPA3"
    await fill("Password for home", "short");
    expect(button("Join home")?.hasAttribute("disabled")).toBe(true);
    await fill("Password for home", "correct horse");
    await press("Join home");
    await until(alpha, machines, Network.Machine, (s) => s.joined === "Connected" && s.reading.read.status === "Loaded");
    expect(world.settings.joins).toEqual([{ ssid: "home", security: "wpa2", password: "correct horse" }]);
    // spec/app/settings/network.md, "Leaving the page retires what it asked and forgets what it found; a join in flight is Android's and goes on"
    await hardware("back");
    await until(alpha, machines, Network.Machine, (s) => s.found === 0 && s.scan === "NotScanned");
  });

  it("Read what my carrier needs to activate a SIM (spec/app/settings/carrier.md, \"Story: Read what my carrier needs to activate a SIM\")", async () => {
    const { alpha, machines, world } = await settingsOpen();
    await press("General");
    await press("Carrier & SIM setup");
    await until(alpha, machines, Carrier.Machine, (s) => s.showing);
    // spec/app/settings/carrier.md, "Opening the page reads nothing; leaving it, the phone locking or Alpha going to the background forgets everything it read, and an answer that comes later is refused"
    expect((await machines.runPromise(Carrier.Machine.use((carrier) => carrier.get()))).read.read.ticket).toBe(0);
    await press("Show identifiers");
    await until(alpha, machines, Carrier.Machine, (s) => s.read.read.status === "Loaded" && s.fields.length > 0);
    // spec/app/settings/carrier.md, "The EID is its own read, asked by the owner after the identifiers and only on a phone with an eSIM, so it never delays them"
    await press("Read EID");
    await until(alpha, machines, Carrier.Machine, (s) => s.eid.status === "Returned");
    // spec/app/settings/carrier.md, "Copy puts one identifier Android returned on the clipboard, one copy at a time, and the page says whether it was copied"
    expect([Boolean(button("Copy IMEI 1")), Boolean(button("Copy IMEI 2")), Boolean(button("Copy ICCID"))]).toEqual([true, false, false]);
    await press("Copy IMEI 1");
    await until(alpha, machines, Carrier.Machine, (s) => s.copied === "CopiedIt");
    expect(world.settings.copied).toEqual(["356938035643809"]);
    await seen(false);
    await until(alpha, machines, Carrier.Machine, (s) => s.fields.length === 0 && !s.showing);
    await seen(true);
    await until(alpha, machines, Carrier.Machine, (s) => s.showing && s.read.read.status === "Idle" && s.fields.length === 0);
    await press("Show identifiers");
    await until(alpha, machines, Carrier.Machine, (s) => s.read.read.status === "Loaded" && s.fields.length > 0);
  });
});
