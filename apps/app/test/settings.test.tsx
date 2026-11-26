// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import * as Activity from "../gen/app__settings__activity.effect.vibe";
import * as Android from "../gen/app__settings__android.effect.vibe";
import * as Carrier from "../gen/app__settings__carrier.effect.vibe";
import * as Developer from "../gen/app__settings__developer.effect.vibe";
import * as Facts from "../gen/app__settings__facts.effect.vibe";
import * as Licences from "../gen/app__settings__licences.effect.vibe";
import * as Network from "../gen/app__settings__network.effect.vibe";
import * as Prefs from "../gen/app__settings__preferences.effect.vibe";
import * as Reset from "../gen/app__settings__reset.effect.vibe";
import * as Pages from "../gen/app__settings.effect.vibe";
import { Machine as Home } from "../gen/app__home.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import * as Layers from "../gen/app__shell__layers.effect.vibe";
import home from "../src/home/index.tsx";
import { reportOf } from "../src/settings/about.vibe";
import settings from "../src/settings/index.tsx";
import { button, closeAll, drawn, fill, hardware, later, only, open as openAlpha, press, seen, underAct, until } from "./alpha.tsx";
import { account, checkoutSession, checkoutUrl, type CheckoutScene, type RedemptionScene } from "./fakes/cloud.ts";
import { type ListenerScene, notices } from "./fakes/settings.ts";
import { type Scene, scene } from "./fakes/scene.ts";
import { textReview } from "./fakes/text-review.ts";

underAct();
afterEach(closeAll);
// spec/app/settings/index.md, "The build says once whether it is a development build, and the phone whether Alpha runs on a phone and on an Alpha image": these journeys open the development build with its developer tools.
history.replaceState(null, "", "/?tools=1");

const shipped = vi.fn(() => Promise.resolve(Response.json(notices)));
const originalFetch = globalThis.fetch;
const fetchWithNotices: typeof fetch = (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  return url.endsWith("licenses/third-party-notices.json") ? shipped() : originalFetch(input, init);
};
vi.stubGlobal("fetch", fetchWithNotices);

const open = (world: Scene) => openAlpha(world, only("home", "view:Settings", "settings/phone", "settings/activity", "settings/notification-collection", "overlay"));

/** The row, switch or choice whose title is `title`, as a person reads it: a row's title, never its decorative icon or its value beside it. */
const titled = (title: string) => [...document.querySelectorAll<HTMLElement>("button, label")].find((found) => found.querySelector("span:not([aria-hidden]) > span")?.textContent === title);

/** Press the row titled `title`; a switch's or a choice's row presses its control, as a tap on the row does. */
const tap = (title: string) => drawn(() => {
  const found = titled(title);
  if (!found) throw new Error(`no row ${title}`);
  const control = found instanceof HTMLLabelElement ? document.getElementById(found.htmlFor) : found;
  (control ?? found).click();
});

const page = (alpha: Awaited<ReturnType<typeof open>>["alpha"]) => alpha.runtime.runPromise(Pages.Machine.use((pages) => pages.get())).then((state) => state.page);

/** Alpha on a phone, its Settings open at the first page with the phone's facts read. */
async function settingsOpen(world = { ...scene(), phone: true }) {
  const running = await open(world);
  await until(running.alpha, home.runtime(running.alpha), Home, (state) => state.tiles.load.status === "Loaded");
  await vi.waitFor(() => expect(button("Settings")).toBeDefined(), { timeout: 15_000 });
  await press("Settings");
  await until(running.alpha, running.alpha.runtime, Shell, (s) => s.trail.at(-1) === "Settings");
  const machines = settings.runtime(running.alpha);
  return { ...running, world, machines };
}

describe("Settings", () => {
  it("Recovers an unavailable browser account only after Try again", async () => {
    const world = { ...scene(), signedIn: false };
    const { alpha } = await settingsOpen(world);
    await vi.waitFor(() => expect(titled("Account")?.textContent).toContain("Signed out"));
    await tap("Account");
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Unavailable"));

    world.signedIn = true;
    expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain(account.email);
    await press("Try again");
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')?.textContent).toContain(account.email));
    await hardware("back");
    await until(alpha, alpha.runtime, Layers.Machine, (state) => !Layers.listed(state, "account"));
    expect(await page(alpha)).toBe("Top");

    world.signedIn = false;
    await drawn(() => titled("Account")?.focus());
    await tap("Account");
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Unavailable"));
    await press("Back");
    await until(alpha, alpha.runtime, Layers.Machine, (state) => !Layers.listed(state, "account"));
    await vi.waitFor(() => expect(document.activeElement).toBe(titled("Account")));
    expect(await page(alpha)).toBe("Top");
  });

  it("Find a setting and come back (spec/app/settings/index.md, \"Story: Find a setting and come back\"; spec/app/account/plan.md, \"Story: Know my plan\"; spec/app/account/billing.md, \"Story: Pay in the browser\")", async () => {
    const { alpha, machines, world } = await settingsOpen();
    // spec/app/settings/index.md, "The build says once whether it is a development build, and the phone whether Alpha runs on a phone and on an Alpha image"
    await until(alpha, alpha.runtime, Pages.Machine, (s) => s.told && s.phone && !s.image && s.development);
    // spec/app/settings/index.md, "A row opens only an admitted page that hangs from the page showing, at its top"
    await press("General");
    expect([await page(alpha), Boolean(button("Network")), Boolean(titled("Carrier & SIM setup")), Boolean(button("Phone"))]).toEqual(["General", true, true, false]);
    await tap("Display");
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
    // spec/app/settings/index.md, "Each page links to what another area owns there": the Account row and sheet read the signed-in account and Back returns to Settings.
    await vi.waitFor(() => expect(titled("Account")?.textContent).toContain(account.email));
    await tap("Account");
    await until(alpha, alpha.runtime, Layers.Machine, (state) => Layers.listed(state, "account"));
    const shownBalance = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(12.5);
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')?.textContent).toContain(account.email));
    await vi.waitFor(() => expect(document.querySelector('[aria-label="Cloud plan"]')?.textContent).toContain(shownBalance));
    await drawn(() => document.querySelector<HTMLElement>('[role="dialog"] summary')?.click());
    const offerPrice = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(19.5);
    const roundUsd = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    await vi.waitFor(() => {
      const [plus, pro] = [...document.querySelectorAll('[aria-label="Plans"] li')].map((row) => row.textContent);
      expect(plus).toContain(offerPrice);
      expect(plus).toContain(roundUsd.format(16));
      expect(pro).toContain(roundUsd.format(49));
    });
    await hardware("back");
    await until(alpha, alpha.runtime, Layers.Machine, (state) => !Layers.listed(state, "account"));
    expect(await page(alpha)).toBe("Top");

    world.signedIn = false;
    await tap("Account");
    await until(alpha, alpha.runtime, Layers.Machine, (state) => Layers.listed(state, "account"));
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Sign-in required"));
    expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain(account.email);
    expect(document.querySelector('[aria-label="Cloud plan"]')).toBeNull();
    await press("Close Account");
    await until(alpha, alpha.runtime, Layers.Machine, (state) => !Layers.listed(state, "account"));
    await vi.waitFor(() => expect(titled("Account")?.textContent).toContain("Signed out"));
    world.signedIn = true;

    // spec/app/settings/index.md, "Each page links to what another area owns there": Agent activity offers the conversations as Alpha's earlier build did, New and History; New starts one, which the shell opens over the app.
    await press("About");
    await tap("Agent activity");
    expect([Boolean(button("New conversation")), Boolean(button("Load conversations"))]).toEqual([true, true]);
    await press("New conversation");
    await until(alpha, alpha.runtime, Shell, (s) => s.assistant === "Full");
    expect((await machines.runPromise(Facts.Machine.use((facts) => facts.get()))).read.read.status).toBe("Loaded");
    expect(world.settings.opened).toEqual([]);
  });

  it("Answer for what the agent did on the phone (spec/app/settings/activity.md, \"Story: Answer for what the agent did on the phone\")", async () => {
    const world = { ...scene(), phone: true };
    const review = textReview(world.notes.owner, "draft-for-maya", { type: "sms_compose", query: "Maya", body: "Meet at the front door" });
    world.telephony.textReview = review;
    const { alpha, machines } = await settingsOpen(world);
    await press("About");
    await tap("Agent activity");
    // spec/app/settings/activity.md, "The journal is read only while the agent is ready, one read at a time, with ten seconds to answer"
    await until(alpha, machines, Activity.Machine, (s) => s.journal.read.status === "Loaded" && s.rows.length === 1 && s.rows.every((row) => row.declinable));
    // spec/app/settings/activity.md, "A proposal can be declined, and an unsettled action marked as happened or not, while the agent is ready, from a journal read and not being read again"; spec/app/settings/activity.md, "The owner's word goes only for an action shown that takes it, once, and is followed by reading the journal again"
    const before = (await machines.runPromise(Activity.Machine.use((activity) => activity.get()))).journal.read.ticket;
    await press("Decline");
    await until(alpha, machines, Activity.Machine, (s) => s.journal.read.status === "Loaded" && s.journal.read.ticket > before && s.wordResult === "WordTaken" && !s.rows.some((row) => row.declinable));
    expect([review.rejections, review.decisions, review.proposal.state]).toEqual([["draft-for-maya"], [], "rejected"]);
    // spec/app/settings/activity.md, "Leaving the history forgets the proposals and retires a read"
    await hardware("back");
    await until(alpha, machines, Activity.Machine, (s) => s.rows.length === 0);
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

  it.each([3, 2])("Review retained agent records before restarting (spec/app/account/records.md, \"Story: Restart after a failure that kept records\")", async (archived) => {
    const recovery = { retained: 3, archived, starts: 0, tokens: [] as string[] };
    const world = { ...scene(), phone: true };
    world.settings.recovery = recovery;
    await settingsOpen(world);
    await press("About");
    await tap("Agent activity");
    // spec/app/settings/activity.md, "Restart Alpha is offered only when the account area says the agent needs a restart, and Try again only when it needs another try"
    expect(button("Try again")).toBeUndefined();
    await press("Restart Alpha");
    await vi.waitFor(() => expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain("3 records"));
    expect(recovery.tokens).toEqual([]);
    await press("Cancel");
    await vi.waitFor(() => expect(document.querySelector('[role="alertdialog"]')).toBeNull());
    expect(recovery.tokens).toEqual([]);

    await press("Restart Alpha");
    await vi.waitFor(() => expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain("3 records"));
    world.signedIn = false;
    await press("Archive and restart");
    await vi.waitFor(() => expect(document.body.textContent).toContain("Alpha couldn’t confirm the recovery"));
    expect(recovery.tokens).toEqual([]);
    await press("Close review");
    world.signedIn = true;

    await press("Restart Alpha");
    await vi.waitFor(() => expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain("3 records"));
    await press("Archive and restart");
    await vi.waitFor(() => {
      expect(recovery.tokens).toEqual(["1.check"]);
      if (archived === recovery.retained) expect(recovery.starts).toBe(1);
      else expect(document.body.textContent).toContain("Restart your phone");
    });
    expect(recovery.starts).toBe(archived === recovery.retained ? 1 : 0);
  });

  it("Reviews the price and confirms only the exact Stripe checkout (spec/app/account/billing.md, \"Story: Pay in the browser\"; spec/app/account/billing.md, \"Story: Keep billing to its sign-in\")", async () => {
    const checkout: CheckoutScene = { starts: [], confirmations: [], opened: [], returned: null, paid: false };
    const world = { ...scene(), phone: true, checkout };
    await settingsOpen(world);
    await press("Account");
    await vi.waitFor(() => expect(document.querySelector('[aria-label="Cloud plan"]')?.textContent).toContain("No plan"));
    await drawn(() => document.querySelector<HTMLElement>('[role="dialog"] summary')?.click());
    await vi.waitFor(() => expect(button("Review Plus subscription")).toBeTruthy());
    await press("Review Plus subscription");
    await vi.waitFor(() => expect(document.querySelector('[aria-label="Review subscription"]')?.textContent).toContain("$19.50"));
    expect(checkout.starts).toEqual([]);
    await press("Not now");
    expect(checkout.opened).toEqual([]);
    await press("Review Plus subscription");
    world.voice.credentialId = "cred-new";
    await press("Continue to Stripe");
    await vi.waitFor(() => expect(button("Review Plus subscription")).toBeTruthy());
    expect(checkout.starts).toEqual([]);
    await press("Review Plus subscription");
    await press("Continue to Stripe");
    await vi.waitFor(() => expect(checkout.opened).toEqual([checkoutUrl]));
    expect(checkout.starts).toHaveLength(1);
    expect(checkout.starts[0]).toMatchObject({ planKey: "plus_monthly", presentation: "mobile", key: expect.any(String) });
    await seen(false);
    checkout.returned = "cs_test_other";
    await seen(true);
    await vi.waitFor(() => expect(checkout.returned).toBeNull());
    expect(checkout.confirmations).toEqual([]);
    checkout.paid = true;
    checkout.returned = checkoutSession;
    await drawn(() => window.dispatchEvent(new Event("alpha-billing-return")));
    await vi.waitFor(() => expect(checkout.confirmations).toEqual([checkoutSession]));
    await vi.waitFor(() => expect(document.querySelector('[aria-label="Cloud plan"]')?.textContent).toContain("Plus"));
    checkout.returned = checkoutSession;
    await drawn(() => window.dispatchEvent(new Event("alpha-billing-return")));
    expect(checkout.confirmations).toEqual([checkoutSession]);
  });

  it('Redeems the owner’s code once and refreshes the plan (spec/app/account/codes.md, "Story: Redeem a code")', async () => {
    const redemption: RedemptionScene = { calls: [] };
    await settingsOpen({ ...scene(), phone: true, redemption });
    await press("Account");
    await vi.waitFor(() => {
      const form = [...document.querySelectorAll("summary")].find((row) => row.textContent === "Redeem code");
      if (!form) throw new Error("No redemption control");
      return drawn(() => form.click());
    });
    await fill("Redemption code", "ABCD-2345-EFGH-6789");
    await press("Redeem");
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Code redeemed"));
    await vi.waitFor(() => expect(document.querySelector('[aria-label="Cloud plan"]')?.textContent).toContain("Plus"));
    expect(redemption.calls).toEqual([{ code: "ABCD2345EFGH6789", key: expect.any(String) }]);
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
      await until(alpha, machines, Facts.Machine, (state) => state.read.read.status === "Loaded");
      expect(Boolean(button("Refresh"))).toBe(phone);
      await press("General");
      expect(Boolean(button("Refresh"))).toBe(phone);
      // spec/app/settings/android.md, "Each Android page is offered on the Settings page it belongs to": only on a phone does General offer Wi-Fi.
      if (!phone) return void expect(titled("Wi-Fi")).toBeUndefined();
      // spec/app/settings/android.md, "Android says whether it opened that page, a nearby one, or none"
      await tap("Wi-Fi");
      await until(alpha, machines, Android.Machine, (s) => s.start.read.status !== "Loading");
      const exactly = await machines.runPromise(Android.Machine.use((android) => android.get()));
      expect(exactly.told).toBe("Silent");
      await tap("Mobile data");
      await until(alpha, machines, Android.Machine, (s) => s.told === "SaidNearby");
      // spec/app/settings/android.md, "Alpha's alert, permission and photo pages open for Alpha itself, never for another app, and a channel's page names its channel"
      await tap("Notifications");
      await tap("Notifications");
      await until(alpha, machines, Android.Machine, (s) => s.target === "AlphaAlerts" && s.start.read.status === "Loaded");
      await tap("Reminders");
      await until(alpha, machines, Android.Machine, (s) => s.target === "AlertChannel" && s.start.read.status === "Loaded");
      expect(world.settings.opened).toEqual(["wifi", "mobile", "notifications", "channel opaque-reminders"]);
    });
  });

  it("Review notification collection and choose apps (spec/app/notices/collection.md, \"Story: Manage collection in Settings\")", async () => {
    const { world } = await settingsOpen();
    await press("General");
    await tap("Notifications");
    await vi.waitFor(() => expect(titled("Other apps’ notifications")).toBeDefined());
    await tap("Other apps’ notifications");
    expect(world.settings.mirror.enabled).toBe(false);
    await press("Turn on");
    await vi.waitFor(() => expect(world.settings.mirror.enabled).toBe(true));
    await vi.waitFor(() => expect(titled("Choose notification apps")?.hasAttribute("disabled")).toBe(false));
    await tap("Choose notification apps");
    await press("Add News reader");
    await vi.waitFor(() => expect(world.settings.mirror.apps).toEqual([{
      packageName: "example.reader", label: "News reader", preview: false, available: true,
    }]));
    await vi.waitFor(() => expect(titled("Keep notification history")).toBeDefined());
    await tap("Keep notification history");
    await press("Turn on");
    await vi.waitFor(() => expect(world.settings.mirror.history).toBe(true));
    world.settings.mirrorHistory.push({ id: "old", appLabel: "Reading archive", at: 1000, state: "Posted" });
    await vi.waitFor(() => expect(titled("View history")).toBeDefined());
    await tap("View history");
    await vi.waitFor(() => expect(document.body.textContent).toContain("Reading archive"));
    await tap("Clear history");
    await press("Clear");
    await vi.waitFor(() => expect(document.body.textContent).not.toContain("Reading archive"));
    expect(world.settings.mirrorHistory).toEqual([]);
  });

  it("Manage saved passwords and choose Android autofill (spec/app/settings/facts.md, \"Story: Manage my saved passwords\"; spec/app/settings/android.md, \"Story: Change what only Android can change\")", async () => {
    const { alpha, machines, world } = await settingsOpen();
    await press("Apps");
    await press("Passwords");
    await until(alpha, machines, Facts.Machine, (s) => s.reported.some(({ fact, value }) => fact === "AutofillService" && value === "None"));
    world.settings.autofillDestination = "system-settings";
    await tap("Use for autofill");
    await until(alpha, machines, Android.Machine, (s) => s.target === "PasswordAutofill" && s.told === "SaidNearby");
    world.settings.autofillDestination = "autofill-picker";
    await tap("Use for autofill");
    await until(alpha, machines, Android.Machine, (s) => s.start.read.status === "Loaded" && s.told === "Silent");
    expect(world.settings.opened).toEqual(["system-settings", "autofill-picker"]);

    world.settings.autofill = { supported: true, selected: "this-app" };
    await seen(false);
    await seen(true);
    await until(alpha, machines, Facts.Machine, (s) => s.reported.some(({ fact, value }) => fact === "AutofillService" && value === "Alpha"));
    expect(titled("Use for autofill")).toBeUndefined();

    world.settings.passwords.push({
      id: "entry-47", revision: 4, label: "Example account", username: "owner",
      bindings: [{ kind: "web", facet: "https://example.test", display: "example.test" }], updatedAt: 1000,
    });
    await vi.waitFor(() => expect(titled("Unlock")).toBeDefined());
    await tap("Unlock");
    await vi.waitFor(() => expect(titled("Example account")).toBeDefined());
    await fill("Search passwords", "another site");
    expect(titled("Example account")).toBeUndefined();
    await fill("Search passwords", "example.test");
    await tap("Example account");
    await vi.waitFor(() => expect(titled("Updated account")).toBeDefined());
    await fill("Search passwords", "");
    await press("Add password");
    await vi.waitFor(() => expect(titled("New account")).toBeDefined());
    expect(world.settings.passwordEdits).toEqual([{ entryId: "entry-47", expectedRevision: 4 }, undefined]);

    const choosePasswordAction = async (label: string, choice: string) => {
      await drawn(() => button(`Options for ${label}`)?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })));
      const item = () => [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((row) => row.textContent === choice);
      await vi.waitFor(() => expect(item()).toBeDefined());
      await drawn(() => item()?.click());
    };
    await choosePasswordAction("Updated account", "Reveal password");
    await vi.waitFor(() => expect(world.settings.passwordRowActions[0]).toEqual({ choice: "reveal", id: "entry-47", revision: 5 }));
    await vi.waitFor(() => expect(titled("Updated account")).toBeDefined());
    await choosePasswordAction("Updated account", "Copy password");
    await vi.waitFor(() => expect(document.body.textContent).toContain("Password copied"));
    await choosePasswordAction("New account", "Delete password");
    await press("Cancel");
    expect(world.settings.passwords.some(({ id }) => id === "entry-new")).toBe(true);
    await choosePasswordAction("New account", "Delete password");
    await press("Delete");
    await vi.waitFor(() => expect(document.body.textContent).toContain("Password deleted"));
    expect(world.settings.passwordRowActions).toEqual([
      { choice: "reveal", id: "entry-47", revision: 5 },
      { choice: "copy", id: "entry-47", revision: 5 },
      { choice: "remove", id: "entry-new", revision: 1 },
    ]);

    await seen(false);
    await vi.waitFor(() => expect(world.settings.passwordsUnlocked).toBe(false));
    await seen(true);
    await vi.waitFor(() => expect(titled("Unlock")).toBeDefined());
    expect(titled("Updated account")).toBeUndefined();
    await tap("Unlock");
    await vi.waitFor(() => expect(titled("Updated account")).toBeDefined());
    await tap("Lock");
    await vi.waitFor(() => expect(titled("Unlock")).toBeDefined());
    expect(titled("Updated account")).toBeUndefined();
    await hardware("back");
    expect(await page(alpha)).toBe("Apps");
  });

  it("Shows and opens Proton Pass only from the owner's native Password manager (spec/app/settings/facts.md, \"Story: Manage my saved passwords\")", async () => {
    const sceneWithProton = { ...scene(), phone: true };
    sceneWithProton.settings.passwordProvider = { installation: "absent", selection: "none", support: "available" };
    const { world } = await settingsOpen(sceneWithProton);
    await press("Apps");
    await press("Passwords");
    await vi.waitFor(() => expect(button(/^Proton Pass/)?.textContent).toContain("Not installed"));
    expect(world.settings.opened).toEqual([]);
    expect(button("Get Proton Pass")).toBeUndefined();
    await press(/^Proton Pass/);
    expect(button(/^Proton Pass/)?.getAttribute("aria-expanded")).toBe("true");
    expect(button("Open Proton Pass")).toBeUndefined();
    await press("Get Proton Pass");
    await vi.waitFor(() => expect(world.settings.opened).toEqual(["password-provider install"]));

    world.settings.passwordProvider = { installation: "installed", selection: "proton", support: "available" };
    await vi.waitFor(() => expect(button("Refresh password provider status")?.disabled).toBe(false));
    await press("Refresh password provider status");
    await vi.waitFor(() => expect(button(/^Proton Pass/)?.textContent).toContain("Verified"));
    expect(button("Get Proton Pass")).toBeUndefined();
    expect(document.body.textContent).toContain("Selected");
    await press("Open Proton Pass");
    await vi.waitFor(() => expect(world.settings.opened).toEqual(["password-provider install", "password-provider open"]));
    await vi.waitFor(() => expect(button("Choose provider")?.disabled).toBe(false));
    await press("Choose provider");
    await vi.waitFor(() => expect(world.settings.opened).toEqual(["password-provider install", "password-provider open", "password-provider settings"]));
    await hardware("back");
    await vi.waitFor(() => expect(button(/^Proton Pass/)).toBeUndefined());
  });

  it("See and control the listener (spec/app/voice/listener.md, \"Story: See and control the listener\")", async () => {
    const pause = Promise.withResolvers<unknown>();
    const listener: ListenerScene = {
      status: { available: true, state: "LISTENING", label: "Listening", consented: true, listening: true, microphoneOpen: true },
      pauseReply: pause.promise,
      openSettings: false,
    };
    await settingsOpen({ ...scene(), phone: true });
    await press("Privacy");
    await vi.waitFor(() => expect(button("Permissions")).toBeDefined());
    expect(button("Listening settings")).toBeUndefined();
    await closeAll();

    const world = { ...scene(), phone: true, image: true };
    world.settings.listener = listener;
    const { alpha } = await settingsOpen(world);
    await press("Privacy");
    const listening = () => {
      const row = titled("Listening");
      return row instanceof HTMLLabelElement ? document.getElementById(row.htmlFor) : undefined;
    };
    await vi.waitFor(() => expect(listening()?.getAttribute("aria-checked")).toBe("true"));
    await press("Pause listening");
    await hardware("back");
    expect(await page(alpha)).toBe("Top");
    expect(button(/^Microphone may be on/)).toBeUndefined();
    await drawn(() => pause.resolve({ ...listener.status, state: "PAUSED_USER", listening: false, microphoneOpen: false, saved: false }));
    await vi.waitFor(() => expect(button(/^Microphone may be on/)).toBeDefined());
    await press(/^Microphone may be on/);
    await vi.waitFor(() => expect(world.settings.opened).toEqual(["home"]));
    await press("Privacy");
    await press("Turn off listening");
    await vi.waitFor(() => expect(listening()?.getAttribute("aria-checked")).toBe("false"));
    expect(button(/^Microphone may be on/)).toBeUndefined();
    await press("Listening settings");
    await vi.waitFor(() => expect(document.body.textContent).toContain("Listening settings are unavailable"));
    listener.openSettings = true;
    await tap("Listening");
    await vi.waitFor(() => expect(world.settings.opened).toEqual(["home", "sense-settings"]));
    expect(listening()?.getAttribute("aria-checked")).toBe("false");

    listener.status = { available: true, state: "PAUSED_CALL", label: "Paused", consented: true, listening: false, microphoneOpen: false };
    await seen(false);
    await seen(true);
    await vi.waitFor(() => expect(titled("Listening")?.textContent).toContain("Paused during a call"));
  });

  it("Look at access again (spec/app/startup/access.md, \"Story: Look at access again\")", async () => {
    const { alpha, world, machines } = await settingsOpen();
    await press("Privacy");
    await press("Permissions");
    await until(alpha, machines, Facts.Machine, (s) => Facts.accessWord(s, "MicrophoneAccess") === "Off");
    await tap("Microphone");
    // spec/app/startup/access.md, "Settings opens one access of this walkthrough in review, also from the list of all, and the agent may ask to show one"
    await vi.waitFor(() => {
      const review = document.querySelector('[role="dialog"]');
      const current = review?.querySelector('[aria-current="step"]');
      expect([review?.querySelectorAll("li").length, current?.textContent?.includes("Microphone"), [...(review?.querySelectorAll("li button") ?? [])].map((action) => action.closest("li") === current)])
        .toEqual([7, true, [true]]);
    });
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
    await tap("Display");
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
    // spec/app/settings/preferences.md, "A new phone lets Alpha act without asking first, load images in Inbox, use its location, the Browser page open, and Telegram or Slack screen context, and change Gmail and Calendar"
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.document.read.status === "Loaded" && Prefs.allows(s, "BrowserPage") && Prefs.allows(s, "TelegramContext") && Prefs.allows(s, "SlackContext") && !Prefs.asksBeforeActing(s, "WebAction") && s.images);
    // spec/app/settings/preferences.md, "The owner changes Ask before Alpha acts, Load images or what Alpha may share only once the phone has read them, one save at a time, with ten seconds to save"
    await tap("Ask before Alpha acts");
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.saving.read.status === "Loaded" && Prefs.asksBeforeActing(s, "WebAction"));
    await tap("Browser page for Alpha");
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.saving.read.status === "Loaded" && !Prefs.allows(s, "BrowserPage"));
    // spec/app/settings/preferences.md, "Alpha shares the phone's location, the Browser page open, or Telegram or Slack screen context with a chat turn, and changes Gmail or Calendar, only when the phone read that the owner allowed it"
    await tap("Telegram screen");
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.saving.read.status === "Loaded" && !Prefs.allows(s, "TelegramContext"));
    expect(JSON.parse(localStorage.getItem("alpha.preferences") ?? "{}")).toEqual({ askFirst: true, images: true, shares: ["AgentLocation", "GmailChanges", "CalendarEdits", "SlackContext"] });
    await tap("Gmail changes");
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.saving.read.status === "Loaded" && !Prefs.allows(s, "GmailChanges"));
    await vi.waitFor(() => expect(world.settings.consents).toEqual([
      { gmailChanges: false, calendarEdits: false }, { gmailChanges: true, calendarEdits: true }, { gmailChanges: false, calendarEdits: true },
    ]));
    // spec/app/settings/preferences.md, "The agent is launched allowed to change Gmail and Calendar exactly as the phone last read or saved, allowed neither once it could not read them, and Alpha says nothing of it before the first answer": a change the host refuses is put back and not saved, and a save that changes neither still saves.
    world.settings.refusesConsent = true;
    await tap("Calendar changes");
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.saving.read.status === "Failed" && s.notice === "NotSaved");
    const refused = await alpha.runtime.runPromise(Prefs.Machine.use((prefs) => prefs.get()));
    expect([Prefs.allows(refused, "CalendarEdits"), refused.agentGoogle]).toEqual([true, { tag: "Consents", gmailChanges: false, calendarEdits: true }]);
    expect(JSON.parse(localStorage.getItem("alpha.preferences") ?? "{}")).toEqual({ askFirst: true, images: true, shares: ["AgentLocation", "CalendarEdits", "SlackContext"] });
    const toldBefore = world.settings.told;
    await tap("Location for Alpha");
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.saving.read.status === "Loaded" && !Prefs.allows(s, "AgentLocation"));
    await later(alpha, 0);
    expect([world.settings.consents.length, world.settings.told - toldBefore]).toEqual([3, 0]);
    // spec/app/settings/preferences.md, "A change takes effect when the phone saved it; when the phone refuses it, Alpha says it was not saved and nothing changes; when the phone does not answer in time, Alpha says it was not saved and reads the device preferences again": a change the host takes too late is what Settings shows once the phone has finished with it.
    world.settings.refusesConsent = false;
    let answer = () => undefined as void;
    world.settings.consentGate = new Promise((resolve) => { answer = resolve; });
    await tap("Gmail changes");
    await later(alpha, 10_000);
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.saving.read.status === "Failed" && s.document.read.status === "Loading" && !Prefs.allows(s, "GmailChanges"));
    answer();
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.document.read.status === "Loaded" && Prefs.allows(s, "GmailChanges") && Prefs.allows(s, "CalendarEdits"));
    await vi.waitFor(() => expect(world.settings.consents.at(-1)).toEqual({ gmailChanges: true, calendarEdits: true }));
    world.settings.consentGate = new Promise((resolve) => { answer = resolve; });
    world.settings.refusesConsent = true;
    await tap("Gmail changes");
    await later(alpha, 10_000);
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.saving.read.status === "Failed" && s.document.read.status === "Loading");
    answer();
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.document.read.status === "Loaded" && Prefs.allows(s, "GmailChanges"));
    expect([JSON.parse(localStorage.getItem("alpha.preferences") ?? "{}"), world.settings.consents.at(-1)])
      .toEqual([{ askFirst: true, images: true, shares: ["CalendarEdits", "SlackContext", "GmailChanges"] }, { gmailChanges: true, calendarEdits: true }]);
  });

  it("A consent the host refused after a read is told again at the next read (spec/app/settings/preferences.md, \"Story: Decide whether Alpha asks before it acts\")", async () => {
    // spec/app/settings/preferences.md, "The agent is launched allowed to change Gmail and Calendar exactly as the phone last read or saved, allowed neither once it could not read them, and Alpha says nothing of it before the first answer"
    localStorage.setItem("alpha.preferences", JSON.stringify({ askFirst: true, images: false, shares: ["CalendarEdits"] }));
    const world = { ...scene(), phone: true };
    world.settings.refusesConsent = true;
    const first = await open(world);
    await until(first.alpha, first.alpha.runtime, Prefs.Machine, (s) => s.document.read.status === "Loaded" && Prefs.allows(s, "CalendarEdits"));
    expect(world.settings.consents).toEqual([]);
    world.settings.refusesConsent = false;
    await press("Settings");
    await vi.waitFor(() => expect(world.settings.consents).toEqual([{ gmailChanges: false, calendarEdits: true }]));
  });

  it("The host ends on the Google consent Settings shows when a read and a save cross (spec/app/settings/preferences.md, \"Story: Decide whether Alpha asks before it acts\")", async () => {
    // spec/app/settings/preferences.md, "The agent is launched allowed to change Gmail and Calendar exactly as the phone last read or saved, allowed neither once it could not read them, and Alpha says nothing of it before the first answer"
    const { alpha, world } = await settingsOpen();
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.document.read.status === "Loaded" && Prefs.allows(s, "GmailChanges"));
    await vi.waitFor(() => expect(world.settings.consents).toEqual([{ gmailChanges: true, calendarEdits: true }]));
    await press("Privacy");
    // spec/app/settings/preferences.md, "The agent is launched allowed to change Gmail and Calendar exactly as the phone last read or saved, allowed neither once it could not read them, and Alpha says nothing of it before the first answer": a read answers while the host is slow, the owner's save waits for the host to take the read's consent, and once the save is kept the host is told the saved consent again from Settings.
    let answer = () => undefined as void;
    world.settings.consentGate = new Promise((resolve) => { answer = resolve; });
    let told = world.settings.told;
    await seen(false);
    await seen(true);
    await vi.waitFor(() => expect(world.settings.told).toBe(told + 1));
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.document.read.status === "Loaded");
    await tap("Gmail changes");
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.saving.read.status === "Loading");
    await later(alpha, 0);
    expect(world.settings.told).toBe(told + 1);
    answer();
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.saving.read.status === "Loaded" && !Prefs.allows(s, "GmailChanges"));
    await later(alpha, 0);
    await vi.waitFor(() => expect(world.settings.consents.at(-1)).toEqual({ gmailChanges: false, calendarEdits: true }));
    await vi.waitFor(() => expect(world.settings.told).toBe(told + 3));
    expect(JSON.parse(localStorage.getItem("alpha.preferences") ?? "{}")).toEqual({ askFirst: false, images: true, shares: ["AgentLocation", "BrowserPage", "CalendarEdits", "TelegramContext", "SlackContext"] });
    // spec/app/settings/preferences.md, "The agent is launched allowed to change Gmail and Calendar exactly as the phone last read or saved, allowed neither once it could not read them, and Alpha says nothing of it before the first answer": a save holds the host past both ten-second limits while the consent of the read that gave up waits its turn, so the host is told neither, and the next read tells it what the save kept.
    world.settings.consentGate = new Promise((resolve) => { answer = resolve; });
    told = world.settings.told;
    await tap("Gmail changes");
    await later(alpha, 10_000);
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.saving.read.status === "Failed" && s.document.read.status === "Loading");
    await later(alpha, 10_000);
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.document.read.status === "Failed" && s.agentGoogle.tag === "Consents" && !s.agentGoogle.gmailChanges && !s.agentGoogle.calendarEdits);
    expect(world.settings.told).toBe(told + 1);
    answer();
    await vi.waitFor(() => expect(world.settings.consents.slice(-2)).toEqual([{ gmailChanges: true, calendarEdits: true }, { gmailChanges: false, calendarEdits: false }]));
    expect(JSON.parse(localStorage.getItem("alpha.preferences") ?? "{}")).toEqual({ askFirst: false, images: true, shares: ["AgentLocation", "BrowserPage", "CalendarEdits", "TelegramContext", "SlackContext", "GmailChanges"] });
    await seen(false);
    await seen(true);
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.document.read.status === "Loaded" && Prefs.allows(s, "GmailChanges"));
    await vi.waitFor(() => expect(world.settings.consents.at(-1)).toEqual({ gmailChanges: true, calendarEdits: true }));
  });

  it("A phone updated from the previous Alpha keeps its choices (spec/app/settings/preferences.md, \"The device preferences are read when Alpha starts, when Settings opens, when Alpha comes back while Settings shows, and after a change the phone did not answer in time, with ten seconds to answer, never while a change or a recovery is in flight\")", async () => {
    localStorage.setItem("alpha.browser.device.v1", JSON.stringify({ askBeforeAgentActions: false, agentLocationEnabled: false, autoLoadMailImages: true }));
    const { alpha } = await open({ ...scene(), phone: true });
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.document.read.status === "Loaded");
    const adopted = await alpha.runtime.runPromise(Prefs.Machine.use((prefs) => prefs.get()));
    expect([adopted.askFirst, adopted.images, adopted.shares]).toEqual([false, true, ["BrowserPage", "GmailChanges", "CalendarEdits", "TelegramContext", "SlackContext"]]);
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
    await press("Export");
    await until(alpha, machines, Developer.Machine, (s) => s.exporting.read.status === "Loaded");
    const text = await sharedFiles[0]?.text();
    const report: unknown = JSON.parse(text ?? "{}");
    if (typeof report !== "object" || report === null || !("problems" in report) ||
      typeof report.problems !== "object" || report.problems === null || !("count" in report.problems)) throw new Error("The diagnostics report has no problem count");
    expect(report.problems.count).toBe(2);
    expect(report).toEqual(expect.objectContaining({
      format: "alpha-diagnostics/v1",
      roles: [{ role: "home", held: false, available: true }, { role: "assistant", held: false, available: true }],
      permissions: { CalendarAccess: true, FilesAccess: true, LocationAccess: true, MicrophoneAccess: false, NotificationsAccess: true },
      talk: { format: "alpha-cloud-stream-timing-v1", sessions: [{ sttConnectedMs: 812, firstFrameSentMs: 815, consentRetry: true }, { sttConnectedMs: 390, firstFrameSentMs: null, consentRetry: false }] },
    }));
    expect([text?.includes("launcher3"), text?.includes("ai.alphacompute"), text?.includes("\"session\"")]).toEqual([false, false, false]);
    // spec/app/settings/developer.md, "Clear is offered only for a log with problems, one at a time; once the startup area answers, the log is read again": Clear asks first, and backing out clears nothing.
    await press("Clear problem log");
    await press("Cancel");
    expect(world.settings.crashes.length).toBe(2);
    await press("Clear problem log");
    await press("Clear log");
    await until(alpha, machines, Developer.Machine, (s) => s.log.read.status === "Loaded" && s.problems === 0);
    expect([world.settings.crashes, Boolean(button("Clear problem log"))]).toEqual([[], false]);
    // spec/app/settings/developer.md, "The report copies only the fields Alpha allows, so no text, address, key or identifier can reach it": of the digests the host names, only those of the packaged agent files Alpha lists, each a digest, reach the report.
    const digest = "c".repeat(64);
    const listed = reportOf({
      at: 0, native: true, problems: [], talk: undefined,
      phone: { readings: [], grants: [], alerts: [], home: "AnotherApp", assistant: "NoSuchRole", launcher: false },
      facts: { runtimeHashes: { "agent/inventory.json": digest, "agent/agent.mjs": digest, "agent/secrets.json": digest, "agent/alpha-source.json": "not a digest" } },
    });
    expect(listed.runtimeHashes).toEqual({ "agent/inventory.json": digest, "agent/agent.mjs": digest });
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

  it("Shows Carrier setup guidance on the web without exposing phone identifiers", async () => {
    const { alpha } = await open(scene());
    await press("Settings");
    await press("General");
    expect(button("Wi-Fi")).toBeUndefined();
    expect(button("Default apps in Android")).toBeUndefined();
    await drawn(() => titled("Carrier & SIM setup")?.focus());
    await tap("Carrier & SIM setup");
    await vi.waitFor(() => expect(document.body.textContent).toContain("Available only on an Android phone"));
    expect(await page(alpha)).toBe("CarrierInfoPage");
    expect(button("Show identifiers")).toBeUndefined();
    expect(button("Android SIM settings")).toBeUndefined();
    await hardware("back");
    await vi.waitFor(() => expect(titled("Carrier & SIM setup")).toBe(document.activeElement));
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
    // spec/app/settings/network.md, "Only the newest scan's answer is taken: the networks it found, or why it could not scan": Location off is said as such
    world.settings.scanRefusal = "LOCATION_DISABLED";
    await press("Network");
    await until(alpha, machines, Network.Machine, (s) => s.scan === "LocationOff" && s.found === 0);
    await vi.waitFor(() => expect(document.body.textContent).toContain("Turn on Location to scan"));
    world.settings.scanRefusal = undefined;
    await press("Scan again");
    await until(alpha, machines, Network.Machine, (s) => s.scan === "Found" && s.found === 1);
  });

  it("Read what my carrier needs to activate a SIM (spec/app/settings/carrier.md, \"Story: Read what my carrier needs to activate a SIM\")", async () => {
    const { alpha, machines, world } = await settingsOpen();
    world.settings.carrier.eid = { status: "not-read" };
    await press("General");
    await tap("Carrier & SIM setup");
    await until(alpha, machines, Carrier.Machine, (s) => s.showing);
    // spec/app/settings/carrier.md, "Opening the page reads nothing; leaving it, the phone locking or Alpha going to the background forgets everything it read, and an answer that comes later is refused"
    expect((await machines.runPromise(Carrier.Machine.use((carrier) => carrier.get()))).read.read.ticket).toBe(0);
    await press("Show identifiers");
    await until(alpha, machines, Carrier.Machine, (s) => s.read.read.status === "Loaded" && s.fields.length > 0);
    // spec/app/settings/carrier.md, "The EID is its own read, asked by the owner after the identifiers and only on a phone with an eSIM, so it never delays them"
    // spec/app/settings/carrier.md, "The EID is its own read, asked by the owner after the identifiers and only on a phone with an eSIM, so it never delays them": an EID Android refused or could not read yet stays not read, and can be read again.
    await press("Read EID");
    await until(alpha, machines, Carrier.Machine, (s) => s.eidRead.read.status !== "Loading");
    expect([(await machines.runPromise(Carrier.Machine.use((carrier) => carrier.get()))).eid.status, Boolean(button("Read EID"))]).toEqual(["NotRead", true]);
    world.settings.carrier.eid = { status: "available", value: "89049032000000000000000000000001" };
    await press("Read EID");
    await until(alpha, machines, Carrier.Machine, (s) => s.eid.status === "Returned");
    // spec/app/settings/carrier.md, "Copy puts one identifier Android returned on the clipboard, one copy at a time, and the page says whether it was copied"
    expect([Boolean(titled("IMEI 1")), Boolean(titled("IMEI 2")), Boolean(titled("ICCID"))]).toEqual([true, false, false]);
    await tap("IMEI 1");
    await until(alpha, machines, Carrier.Machine, (s) => s.copied === "CopiedIt");
    expect([world.settings.copied, document.querySelector('[role="status"]')?.textContent]).toEqual([["356938035643809"], "Copied"]);
    await seen(false);
    await until(alpha, machines, Carrier.Machine, (s) => s.fields.length === 0 && !s.showing);
    await seen(true);
    // spec/app/settings/timed.md, "Leaving a screen retires its asking: nothing is waited for, and a late answer is refused": a finished read stays finished, its fields forgotten, and coming back asks nothing.
    await until(alpha, machines, Carrier.Machine, (s) => s.showing && s.read.read.status !== "Loading" && s.read.read.ticket === 1 && s.fields.length === 0 && s.eid.status === "NotRead" && s.copied === "NotCopied");
    await press("Show identifiers");
    await until(alpha, machines, Carrier.Machine, (s) => s.read.read.status === "Loaded" && s.fields.length > 0);
  });
});
