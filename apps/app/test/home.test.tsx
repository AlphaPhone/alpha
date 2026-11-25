// @vitest-environment happy-dom
import { digestInbox, type DigestResult, hostedDigestProtocol } from "@elizaos/plugin-workflow-client";
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as Home from "../gen/app__home.effect.vibe";
import { Machine as DigestSchedules } from "../gen/app__digests__schedules.effect.vibe";
import { Machine as WorkflowList } from "../gen/app__workflows__list.effect.vibe";
import * as Cards from "../gen/app__home__cards.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Toasts } from "../gen/app__notices__toasts.effect.vibe";
import home from "../src/home/index.tsx";
import type { Alpha } from "../src/runtime/area.tsx";
import { button, closeAll, drawn, fill, hardware, later, only, open, press, seen, underAct, until } from "./alpha.tsx";
import { scene, type Scene } from "./fakes/scene.ts";
import { savedKey, written } from "../src/home/saved.vibe";
import { waiting } from "../src/home/waiting.vibe";
import { fromAreas } from "../src/home/cards.vibe";
import { digestScope } from "../src/workflows/brief.vibe";
import workflows from "../src/workflows/index.tsx";
import type { NativeDigestScene, WorkflowsScene } from "./fakes/workflows.ts";

underAct();
afterEach(closeAll);

const tiles = () => [...document.querySelectorAll("nav[aria-label='Apps on Home'] [data-home-tile]")].map((tile) => tile.getAttribute("data-home-tile"));
const tileButton = (id: string) => document.querySelector<HTMLButtonElement>(`[data-home-tile="${id}"]`);
const toast = () => document.querySelector("[role=status]")?.textContent;
const held = (name: string) => button(name)?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
const pointer = (type: string, clientX: number, clientY: number) => new PointerEvent(type, { bubbles: true, isPrimary: true, pointerId: 1, button: 0, clientX, clientY });
const pulled = (startY = 68, dx = 0) => drawn(() => {
  const zone = document.querySelector("h1")?.parentElement;
  zone?.dispatchEvent(pointer("pointerdown", 100, startY));
  zone?.dispatchEvent(pointer("pointerup", 100 + dx, startY + 80));
});
const alphaApps = ["view:Inbox", "view:Calendar", "view:Browser", "view:Camera", "view:Photos", "view:Maps", "view:Notes", "view:Files", "view:Workflows", "view:Settings"];
const holdingHome = (world: Scene) => {
  world.settings.roles = world.settings.roles.map((role) => role.role === "home" ? { ...role, held: true, holders: ["ai.alphacompute.alphaphone"] } : role);
  return world;
};

const digestResult = (cursor: number, status: string, output: string): DigestResult => {
  const at = new Date(cursor * 3_600_000).toISOString();
  return { cursor, runId: `run-${cursor}`, workflowId: "workflow", workflowVersionId: "version", templateVersion: "template",
    scheduledAt: at, startedAt: at, completedAt: at, source: {}, status, output, error: null };
};

function keepDigests(alpha: Alpha, scope: string, entries: readonly DigestResult[]) {
  let acknowledged = false;
  const agent = hostedDigestProtocol((path) => Effect.sync(() => {
    if (path.endsWith("/ack")) { acknowledged = true; return {}; }
    return { entries: acknowledged ? [] : entries };
  }));
  return alpha.runtime.runPromise(Effect.flatMap(digestInbox(scope), (inbox) => inbox.sync(agent, 1)));
}

describe("Home on a phone", () => {
  // spec/app/home/index.md, "Story: Start Home"; spec/app/home/index.md, "Story: Keep my apps on Home"; spec/app/home/index.md, "Story: Edit Home"
  it("Start Home, keep my apps on it and edit it (spec/app/home/index.md, \"Story: Start Home\"; spec/app/home/index.md, \"Story: Keep my apps on Home\"; spec/app/home/index.md, \"Story: Edit Home\")", async () => {
    const world = holdingHome({ ...scene(), phone: true });
    const first = await open(world);
    const { alpha } = first;
    const homes = home.runtime(alpha);

    // spec/app/home/index.md, "Startup says once per run how Alpha is presented, and Home then reads its saved tiles": with nothing saved Home shows Alpha's own apps that this phone admits, and the Apps drawer tile on the admitted phone.
    await until(alpha, homes, Home.Machine, (h) => h.host === "AsLauncher" && h.tiles.load.status === "Loaded");
    expect([tiles(), Boolean(button("Apps"))]).toEqual([alphaApps, true]);

    // spec/app/home/tiles.md, "Only Phone, Messages and Inbox carry a badge, only when something waits there, and no tile does while Home is being edited"
    await drawn(() => { waiting.tell("Inbox", "3 unread"); waiting.tell("Notes", "1 shared"); });
    expect([button("Inbox3 unread") !== undefined, button("Notes") !== undefined]).toEqual([true, true]);

    // spec/app/home/index.md, "A long press on bare Home starts editing, only on the phone and once the tiles are read"
    await drawn(() => button("Notes")?.dispatchEvent(pointer("pointerdown", 80, 330)));
    await drawn(() => button("Notes")?.dispatchEvent(pointer("pointermove", 80, 352)));
    await later(alpha, 450);
    expect((await homes.runPromise(Home.Machine.use((m) => m.get()))).editing).toBe(false);
    await drawn(() => button("Notes")?.dispatchEvent(pointer("pointerdown", 80, 330)));
    await later(alpha, 450);
    await until(alpha, homes, Home.Machine, (h) => h.editing);
    await drawn(() => button("Notes")?.dispatchEvent(pointer("pointerup", 80, 330)));
    expect(button("Inbox") !== undefined).toBe(true);

    // spec/app/home/index.md, "A tile on Home is removed or moved only while Home is being edited"; spec/app/home/index.md, "Every change is sent whole to be saved under its number, and nothing else is ever saved"
    await press("Remove Notes");
    await until(alpha, homes, Home.Machine, (h) => h.tiles.save.outcome === "Confirmed");
    expect(tiles()).toEqual(alphaApps.filter((tile) => tile !== "view:Notes"));

    // spec/app/home/index.md, "While editing, Add to Home lists Alpha's own apps that this phone admits and Home does not hold, and opens only if there is one"
    await press("Add to Home");
    await until(alpha, homes, Home.Machine, (h) => h.adding);
    await press("Notes");
    // spec/app/home/index.md, "Add to Home closes once there is nothing left to add"
    await until(alpha, homes, Home.Machine, (h) => !h.adding && h.tiles.save.outcome === "Confirmed" && h.tiles.save.id === 2);
    expect(tiles().at(-1)).toBe("view:Notes");

    // spec/app/home/index.md, "Back closes one layer of Home's own: Add to Home, then editing; Done ends editing"
    await hardware("back");
    await until(alpha, homes, Home.Machine, (h) => !h.editing);
    expect(Boolean(button("Done"))).toBe(false);

    // spec/app/home/index.md, "A restart forgets everything but its numbers, which keep rising, so nothing asked before it can answer after it": the tiles come back as they were saved.
    await first.close();
    const second = await open(world);
    await until(second.alpha, home.runtime(second.alpha), Home.Machine, (h) => h.tiles.load.status === "Loaded" && h.tiles.load.ticket === 2);
    expect(tiles().at(-1)).toBe("view:Notes");

    // spec/app/home/tiles.md, "What was saved comes back as it was saved, an empty Home included; with no record Home shows its defaults"
    await second.close();
    localStorage.setItem(savedKey, "{invalid");
    const recovered = await open(world);
    await until(recovered.alpha, home.runtime(recovered.alpha), Home.Machine, (h) => h.tiles.load.status === "Failed");
    expect([tiles(), localStorage.getItem(savedKey)]).toEqual([alphaApps, "{invalid"]);
  });

  it('Keeps my existing Clock and Reminders pins on the phone (spec/app/home/tiles.md, "What was saved comes back as it was saved, an empty Home included; with no record Home shows its defaults")', async () => {
    const chosen = written([{ tag: "Own", view: "Reminders" }, { tag: "Own", view: "Clock" }, { tag: "Own", view: "Notes" }]);
    localStorage.setItem(savedKey, chosen);
    const world = holdingHome({ ...scene(), phone: true });
    const { alpha } = await open(world, only("home"));
    await until(alpha, home.runtime(alpha), Home.Machine, (state) => state.host === "AsLauncher" && state.tiles.load.status === "Loaded");
    expect([tiles(), localStorage.getItem(savedKey)]).toEqual([["view:Reminders", "view:Clock", "view:Notes"], chosen]);
  });

  it('Find an installed app in Apps (spec/app/home/index.md, "Story: Find an installed app in Apps"; spec/app/home/drawer.md, "Story: Find an installed app by name")', async () => {
    const world = { ...scene(), phone: true };
    const { alpha } = await open(world, only("home", "assistant"));
    const homes = home.runtime(alpha);
    const dialog = () => document.querySelector('[role="dialog"][aria-label="Apps"]');
    const search = () => dialog()?.querySelector<HTMLInputElement>('input[aria-label="Search apps"]');
    const focusedAfterFrames = async (target: HTMLElement | null | undefined) => {
      expect(target).toBeInstanceOf(HTMLElement);
      for (let frame = 0; frame < 13 && document.activeElement !== target; frame += 1) await later(alpha, 16);
      expect(document.activeElement).toBe(target);
    };
    await until(alpha, homes, Home.Machine, (h) => h.host === "AsApp" && h.tiles.load.status === "Loaded");
    expect((await homes.runPromise(Home.Machine.use((m) => m.get()))).installed.read.status).toBe("Idle");

    const opener = button("Apps");
    await press("Apps");
    await until(alpha, homes, Home.Machine, (h) => h.installed.read.status === "Loaded");
    await focusedAfterFrames(dialog()?.querySelector("h1"));
    expect(opener?.closest("[inert]")).not.toBeNull();

    await drawn(() => search()?.focus());
    await fill("Search apps", "fíxture.clock");
    expect([Boolean(button("Open Clock")), Boolean(button("Open Mail"))]).toEqual([true, false]);
    await press("Open Clock");
    await vi.waitFor(() => expect(world.launcher.opened).toEqual(["org.fixture.clock"]));

    // spec/app/shell/focus.md, "A layer that closes gives focus back to the control that opened it, never over a control that took it"
    await hardware("back");
    await until(alpha, alpha.runtime, Shell, (state) => !state.drawer);
    await focusedAfterFrames(opener);

    await press("Apps");
    await until(alpha, alpha.runtime, Shell, (state) => state.drawer);
    await vi.waitFor(() => expect([search()?.value, Boolean(button("Open Mail"))]).toEqual(["", true]));

    // spec/app/shell/index.md, "Back closes one layer: Ask Alpha by a step, then the app on top": Ask Alpha stays above the drawer and leaves first.
    await press("Open conversation");
    await until(alpha, alpha.runtime, Shell, (state) => state.drawer && state.assistant === "Sheet");
    await hardware("back");
    await until(alpha, alpha.runtime, Shell, (state) => state.drawer && state.assistant === "Bar");
    expect(dialog()).not.toBeNull();
    const composer = document.activeElement;
    expect(composer?.getAttribute("aria-label")).toBe("Message Alpha");
    await hardware("back");
    await until(alpha, alpha.runtime, Shell, (state) => !state.drawer);
    expect(document.activeElement).toBe(composer);

    await press("Apps");
    await until(alpha, alpha.runtime, Shell, (state) => state.drawer);
    await hardware("home");
    await until(alpha, alpha.runtime, Shell, (state) => !state.drawer && state.trail.length === 0);
    expect(dialog()).toBeNull();
  });

  it('Holds a native app for App info and to pin it (spec/app/home/drawer.md, "Story: Act on an installed app from its menu")', async () => {
    const world = { ...scene(), phone: true };
    const { alpha } = await open(world, only("home"));
    const homes = home.runtime(alpha);
    const menu = () => document.querySelector('[role="menu"][aria-label="Clock"]');
    const action = (label: string) => [...(menu()?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
      .find((item) => item.textContent === label);
    const selectAction = async (label: string) => {
      const item = action(label);
      expect(item).toBeInstanceOf(HTMLElement);
      await drawn(() => item?.click());
    };
    const holdClock = async () => {
      const clock = button("Open Clock");
      expect(clock).toBeInstanceOf(HTMLButtonElement);
      await drawn(() => clock?.dispatchEvent(pointer("pointerdown", 100, 235)));
      await later(alpha, 450);
      await vi.waitFor(() => expect(menu()).not.toBeNull());
      await drawn(() => clock?.dispatchEvent(pointer("pointerup", 100, 235)));
    };

    await until(alpha, homes, Home.Machine, (state) => state.host === "AsApp" && state.tiles.load.status === "Loaded");
    await press("Apps");
    await until(alpha, homes, Home.Machine, (state) => state.installed.read.status === "Loaded");
    await holdClock();
    await hardware("back");
    await vi.waitFor(() => expect(menu()).toBeNull());
    expect((await alpha.runtime.runPromise(Shell.use((shell) => shell.get()))).drawer).toBe(true);
    expect(world.launcher.opened).toEqual([]);

    await holdClock();
    await selectAction("App info");
    await until(alpha, homes, Home.Machine, (state) => state.handoff.ask.tag === "AppInfo" && state.handoff.attempt.outcome === "Confirmed");
    expect([world.launcher.infos, world.launcher.opened, menu()]).toEqual([["org.fixture.clock"], [], null]);

    await holdClock();
    await selectAction("Add to Home");
    await until(alpha, homes, Home.Machine, (state) => state.tiles.save.outcome === "Confirmed");
    await until(alpha, alpha.runtime, Shell, (state) => !state.drawer);
    expect(tiles()).toContain("app:org.fixture.clock/org.fixture.clock.Main");

    await press("Apps");
    await until(alpha, alpha.runtime, Shell, (state) => state.drawer);
    await holdClock();
    expect(action("On Home")?.getAttribute("aria-disabled")).toBe("true");
  });

  // spec/app/home/cards.md, "Story: See my day at a glance"; spec/app/home/cards.md, "Story: The agenda card"; spec/app/home/cards.md, "Story: Open my day from a card"
  it("See my day at a glance and open it from a card (spec/app/home/cards.md, \"Story: See my day at a glance\"; spec/app/home/cards.md, \"Story: The agenda card\"; spec/app/home/cards.md, \"Story: Open my day from a card\")", async () => {
    const hour = 3_600_000;
    const day = 10 * 86_400_000;
    const world = { ...scene(), phone: true, now: day + 8 * hour };
    world.calendar.granted = true;
    world.calendar.calendars.push({ id: "1", name: "Work", writable: true, local: true }, { id: "2", name: "Family", writable: true, local: true });
    world.calendar.phoneEvents = [
      { id: "a", calendarId: "1", title: "Standup", begin: day + 10 * hour, end: day + 11 * hour, allDay: false, recurring: false },
      { id: "b", calendarId: "2", title: "Dentist", begin: day + 9 * hour, end: day + 10 * hour, allDay: false, recurring: false },
    ];
    const { alpha } = await open(world);
    const homes = home.runtime(alpha);
    const agenda = () => document.querySelector<HTMLButtonElement>("button[aria-label^='Open calendar event:'], button[aria-label^='Open overdue reminder:']");
    const time = (offset: number) => new Date(day + offset * hour).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    // spec/app/home/cards.md, "When Home shows, when Alpha comes back to the front, and when the local day turns while Home shows, Home asks again for every calendar it has not read today"; spec/app/home/cards.md, "The card leads with an overdue reminder, then the item that begins first; of two alike, the first read"
    await until(alpha, homes, Cards.Machine, (c) => c.calendar.source === "Ready" && c.calendar.items.length === 2);
    expect(agenda()?.getAttribute("aria-label")).toMatch(/^Open calendar event: Dentist,/);
    expect(agenda()?.textContent).toContain(`${time(9)} – `);
    expect(agenda()?.textContent).toContain(time(10));

    // spec/app/home/cards.md, "The agenda draws on both calendars and the reminders saved on the phone, leaving out a calendar Calendar hides and a reminder already done"
    await drawn(() => fromAreas.hidden([2]));
    expect(agenda()?.getAttribute("aria-label")).toMatch(/^Open calendar event: Standup,/);
    await drawn(() => fromAreas.reminders([{ due: day + 7 * hour, overdue: true, done: false, title: "Call the bank" }, { due: day, overdue: true, done: true, title: "Paid rent" }]));
    // spec/app/home/cards.md, "Under an overdue reminder the card also names the next item that is not overdue, so the reminder never hides it"
    expect(agenda()?.textContent).toMatch(/^Overdue reminderCall the bank.*Standup/);

    // spec/app/home/cards.md, "A card opens its app: the agenda Calendar, Messages and Phone their own, mail Inbox, the brief and Workflows Workflows; the agenda asks its calendar again if the last read did not succeed"
    await drawn(() => agenda()?.click());
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Calendar");
    await drawn(() => { fromAreas.reminders([]); fromAreas.hidden([]); });
  });

  // spec/app/home/cards.md, "Story: The other cards"; spec/app/home/cards.md, "Story: Open my day from a card"
  it("See what waits in my apps on Home's cards and open one (spec/app/home/cards.md, \"Story: The other cards\"; spec/app/home/cards.md, \"Story: Open my day from a card\")", async () => {
    const world = { ...scene(), phone: true, image: true };
    world.telephony.calls = [];
    world.telephony.texts = [];
    world.telephony.voicemails = [];
    const { alpha } = await open(world);
    await until(alpha, home.runtime(alpha), Home.Machine, (h) => h.tiles.load.status === "Loaded");
    await until(alpha, alpha.runtime, Shell, (s) => s.image);
    const card = (title: string) => [...document.querySelectorAll<HTMLButtonElement>("section[aria-label='Your day'] > button")]
      .find((found) => found.textContent?.startsWith(title) || found.getAttribute("aria-label")?.startsWith(`Open ${title}`));
    const pressCard = (title: string) => drawn(() => {
      const found = card(title);
      if (!found || found.disabled) throw new Error(`Home card unavailable: ${title}`);
      found.click();
    });
    const showing = (view?: "Inbox" | "Workflows") => vi.waitFor(async () => {
      const state = await alpha.runtime.runPromise(Shell.use((shell) => shell.get()));
      expect(state.trail.at(-1)).toBe(view);
    }, { timeout: 5_000 });
    const mail = { connected: true, unread: 4, rows: [{ title: "Bank", detail: "Statement ready" }], current: false };

    // spec/app/home/cards.md, "The Messages and Phone cards show their waiting rows, only on an Alpha image, and are not drawn without a row"; spec/app/home/cards.md, "The mail card shows the unread count, senders and subjects only, never a message body; marked not up to date when Inbox's page is not, and not drawn without an account or a row"
    await drawn(() => {
      fromAreas.messages([{ title: "Ana", detail: "Lunch at one?" }]);
      fromAreas.phone([]);
      fromAreas.mail(mail);
    });
    expect([card("Messages") !== undefined, card("Phone") !== undefined, card("4 unread")?.textContent]).toEqual([true, false, expect.stringMatching(/Not up to date/)]);

    // spec/app/home/cards.md, "The Workflows card shows the first two enabled rows and how many more, marked when they are not current, stale or partly unavailable, and is not drawn without a row"; spec/app/home/cards.md, "The brief card shows the brief kept for Home, or that its run failed, and is not drawn without one"
    await drawn(() => {
      fromAreas.flows({ rows: [{ title: "Morning brief", detail: "Daily" }, { title: "Inbox sweep", detail: "Hourly" }, { title: "Rent", detail: "Monthly" }], freshness: "SomeUnavailable" });
      fromAreas.brief({ outcome: "RunFailed", at: 7 * 3_600_000 });
    });
    expect(card("Morning brief")?.textContent).toMatch(/Morning brief.*Inbox sweep.*Some unavailable/);
    expect(card("Morning brief")?.textContent).not.toMatch(/Rent/);

    // spec/app/home/cards.md, "The row holds the agenda, Messages, Phone, Workflows, mail and brief cards in that order, each only when drawn, and is not drawn when none is"
    expect([...document.querySelectorAll("section[aria-label='Your day'] > button")].map((found) => ["Messages", "Morning brief", "4 unread", "Latest brief"].find((title) => found.textContent?.startsWith(title) || found.getAttribute("aria-label")?.startsWith(`Open ${title}`)))).toEqual(["Messages", "Morning brief", "4 unread", "Latest brief"]);

    await drawn(() => { fromAreas.messages([]); fromAreas.mail({ connected: false, unread: 0, rows: [], current: false }); fromAreas.flows({ rows: [], freshness: "UpToDate" }); fromAreas.brief(undefined); });
    expect(document.querySelector("section[aria-label='Your day']")).toBeNull();

    // spec/app/home/cards.md, "A card opens its app: the agenda Calendar, Messages and Phone their own, mail Inbox, the brief and Workflows Workflows; the agenda asks its calendar again if the last read did not succeed"
    await drawn(() => fromAreas.mail(mail));
    await pressCard("4 unread");
    await showing("Inbox");

    // spec/app/digests/index.md, "Home shows the newest kept result of the owner that ran, finished or failed, through a restart; a result that did not run never replaces it, and a page of another owner never reaches it"
    await keepDigests(alpha, digestScope({ agentId: world.notes.owner, identityId: world.notes.ownerIdentity }), [digestResult(1, "failed", "The morning brief could not run.")]);
    await hardware("home");
    await showing();
    await vi.waitFor(() => expect(card("Latest brief")?.textContent).toMatch(/The morning brief could not run\..*Failed/), { timeout: 5_000 });
    await pressCard("Latest brief");
    await showing("Workflows");
  });

  it('Shows Android’s retained brief and refreshes its digest results through the native inbox (spec/app/digests/index.md, "Android supplies one verified view of retained results and background checks")', async () => {
    const world = { ...scene(), phone: true };
    const initial = digestResult(1, "finished", "Owner’s retained Android brief");
    const missed = digestResult(2, "missed", "A missed run cannot replace the brief");
    const resultText = "The exact result from native refresh";
    const refreshed = digestResult(3, "finished", resultText);
    world.ask.spokenFiles = [];
    const browser: NonNullable<WorkflowsScene["hosted"]> = {
      entries: [digestResult(90, "finished", "Browser result for the same agent")], reads: 0, acknowledgements: [],
    };
    const native: NativeDigestScene = {
      snapshot: { rows: [initial, missed], backgroundEnabled: false, noticesAllowed: false, lease: "native-digest-lease", support: "nativeScheduled" },
      incoming: undefined,
      manualLeases: [],
    };
    world.workflows.hosted = browser;
    world.workflows.nativeDigests = native;
    const { alpha } = await open(world);
    const brief = () => [...document.querySelectorAll("section[aria-label='Your day'] > button")]
      .find((candidate) => candidate.textContent?.startsWith("Latest brief"))?.textContent;
    const results = () => [...document.querySelectorAll<HTMLButtonElement>("ul[aria-label='Digest results'] li > button")];
    await vi.waitFor(() => expect(brief()).toContain(initial.output), { timeout: 5_000 });
    expect(brief()).not.toContain(missed.output);
    expect(native.manualLeases).toEqual([]);

    await press("Workflows");
    const area = workflows.runtime(alpha);
    await until(alpha, area, WorkflowList, (state) => state.list.status === "Loaded");
    await press("Add to Workflows");
    await press("Scheduled digests");
    await until(alpha, area, DigestSchedules, (state) => state.open && state.schedules.status === "Loaded");
    await vi.waitFor(() => expect(results()).toHaveLength(2), { timeout: 5_000 });

    const started = native.manualLeases.length;
    native.incoming = [initial, missed, refreshed];
    await press("Refresh digests");
    await vi.waitFor(() => expect(results()).toHaveLength(3), { timeout: 5_000 });
    expect(native.manualLeases.slice(started)).toEqual([native.snapshot.lease]);

    await drawn(() => {
      const row = results().find((item) => item.textContent?.includes(new Date(refreshed.scheduledAt).toLocaleString()));
      if (row === undefined) throw new Error("Refreshed digest unavailable");
      row.click();
    });
    await vi.waitFor(() => expect(document.querySelector("[aria-label='Digest result']")?.textContent).toContain(resultText));

    // spec/app/digests/index.md, "Ask Alpha about a result hands that result to Ask Alpha"
    const composer = () => document.querySelector<HTMLTextAreaElement>("textarea[aria-label='Message Alpha']");
    const attachment = "Remove Saved result.txt";
    const recorded = () => document.querySelectorAll("section[aria-label='Ask Alpha'] [role=log] article").length;
    const unsent = () => expect([recorded(), world.ask.kept.size, world.ask.said, world.ask.spokenFiles]).toEqual([0, 0, [], []]);
    await vi.waitFor(() => expect(button("Ask Alpha")).toBeDefined());
    await press("Ask Alpha");
    await vi.waitFor(() => expect([composer()?.value, Boolean(button(attachment))]).toEqual(["Help me understand this saved result.", true]));
    unsent();

    await press(attachment);
    await vi.waitFor(() => expect(button(attachment)).toBeUndefined());
    const draft = "Tell me which part should come first.";
    await fill("Message Alpha", draft);
    await press("Minimize chat");
    await vi.waitFor(() => expect(button("Ask Alpha")).toBeDefined());
    await press("Ask Alpha");
    await vi.waitFor(() => expect([composer()?.value, Boolean(button(attachment))]).toEqual([draft, true]));
    unsent();

    await vi.waitFor(() => expect(button("Send")?.disabled).toBe(false));
    await press("Send");
    await vi.waitFor(() => expect(world.ask.said).toEqual([draft]));
    expect(world.ask.spokenFiles?.map(({ images }) => images)).toEqual([
      [{ name: "Saved result.txt", mimeType: "text/plain", data: btoa(resultText) }],
    ]);

    await hardware("home");
    await vi.waitFor(() => expect(brief()).toContain(refreshed.output), { timeout: 5_000 });
    expect([browser.reads, browser.acknowledgements]).toEqual([0, []]);
  });

  // spec/app/home/index.md, "Story: See the apps on this phone"; spec/app/home/index.md, "Story: Open an app"
  it("Keep saved installed apps on Home up to date and open them (spec/app/home/index.md, \"Story: See the apps on this phone\"; spec/app/home/index.md, \"Story: Open an app\")", async () => {
    const world = { ...scene(), phone: true };
    localStorage.setItem(savedKey, written([{ tag: "Own", view: "Notes" }, { tag: "Installed", app: "org.fixture.clock/org.fixture.clock.Main" }]));
    const { alpha } = await open(world);
    const homes = home.runtime(alpha);

    // spec/app/home/index.md, "Once the saved tiles are read, the phone's apps are read if Home holds an installed app, and a record that could not be read is told"
    await until(alpha, homes, Home.Machine, (h) => h.installed.read.status === "Loaded");
    expect([tiles(), Boolean(button("Apps"))]).toEqual([["view:Notes", "app:org.fixture.clock/org.fixture.clock.Main"], true]);

    // spec/app/home/index.md, "Only an app in the last reading is opened, never while Home is being edited"
    await drawn(() => tileButton("app:org.fixture.clock/org.fixture.clock.Main")?.click());
    await until(alpha, homes, Home.Machine, (h) => h.handoff.attempt.outcome === "Confirmed");
    expect(world.launcher.opened).toEqual(["org.fixture.clock"]);

    // spec/app/home/index.md, "Android's answer ends the wait; a refusal is told with its reason, and the apps are read again"
    world.launcher.refusing.set("org.fixture.clock", "disabled");
    await drawn(() => tileButton("app:org.fixture.clock/org.fixture.clock.Main")?.click());
    await until(alpha, homes, Home.Machine, (h) => h.handoff.attempt.outcome === "Refused" && h.installed.read.status === "Loaded");
    await until(alpha, alpha.runtime, Toasts, (t) => t.showing);
    expect([toast(), world.launcher.opened.length]).toEqual(["Couldn't open Clock. It's turned off.", 2]);

    // spec/app/home/index.md, "A failed reading that takes an installed tile off Home says so"; spec/app/home/index.md, "Home shows a tile only while its app is on this phone; a tile whose app has gone keeps its place and comes back with the app"
    const [clock, ...rest] = world.launcher.apps;
    world.launcher.apps = rest;
    world.launcher.changed();
    await until(alpha, homes, Home.Machine, (h) => !h.installed.apps.includes("org.fixture.clock/org.fixture.clock.Main") && h.installed.read.status === "Loaded");
    expect(tiles()).not.toContain("app:org.fixture.clock/org.fixture.clock.Main");
    world.launcher.apps = [clock, ...world.launcher.apps];
    world.launcher.changed();
    await until(alpha, homes, Home.Machine, (h) => h.installed.apps.includes("org.fixture.clock/org.fixture.clock.Main"));
    expect(tiles().at(-1)).toBe("app:org.fixture.clock/org.fixture.clock.Main");
  });

  // spec/app/home/index.md, "Story: Pull down for notifications"
  it("Pull down for notifications (spec/app/home/index.md, \"Story: Pull down for notifications\")", async () => {
    const world = holdingHome({ ...scene(), phone: true });
    world.launcher.shade = "silent";
    const { alpha } = await open(world);
    const homes = home.runtime(alpha);
    await until(alpha, homes, Home.Machine, (h) => h.host === "AsLauncher" && h.tiles.load.status === "Loaded");

    // spec/app/shell/gestures.md, "A pull opens the shade only when it is clearly downward, one and a half times its sideways travel, starts below the 44-point status band, on Home itself and not in a field, with no keyboard up and nothing under the finger scrolled from its top"
    await pulled(10);
    await pulled(68, 70);
    expect(world.launcher.shades).toBe(0);

    // spec/app/home/index.md, "When Android has not answered in time the wait ends; Alpha says nothing of an app, and says Android did not answer about the shade"
    await pulled();
    await until(alpha, homes, Home.Machine, (h) => h.handoff.attempt.outcome === "Sent");
    await later(alpha, 5_000);
    await until(alpha, homes, Home.Machine, (h) => h.handoff.attempt.outcome === "Unknown");
    await until(alpha, alpha.runtime, Toasts, (t) => t.showing);
    expect(toast()).toBe("Android didn't answer about notifications");

    // spec/app/home/index.md, "Alpha speaks about the shade only to say that Android did not open it or did not answer"
    world.launcher.shade = "opened";
    await pulled();
    await until(alpha, homes, Home.Machine, (h) => h.handoff.attempt.outcome === "Confirmed");
    expect(world.launcher.shades).toBe(2);

    // spec/app/home/index.md, "Alpha is told when it becomes, or stops being, the phone's launcher"
    world.settings.roles = world.settings.roles.map((role) => role.role === "home" ? { ...role, held: false, holders: ["com.android.launcher3"] } : role);
    await seen(true);
    await until(alpha, homes, Home.Machine, (h) => h.host === "AsApp");
    await pulled();
    expect(world.launcher.shades).toBe(2);
  });
});

describe("Home in a browser", () => {
  // spec/app/digests/index.md, "Home shows the newest kept result of the owner that ran, finished or failed, through a restart; a result that did not run never replaces it, and a page of another owner never reaches it"
  it("Shows the current owner's retained brief after restart (spec/app/digests/index.md, \"Story: Receive results without losing or repeating one\")", async () => {
    const world = scene();
    const setup = await open(world);
    await keepDigests(setup.alpha, digestScope({ agentId: world.notes.owner, identityId: world.notes.ownerIdentity }), [digestResult(1, "finished", "Owner’s morning brief"), digestResult(2, "missed", "Must stay off Home")]);
    await keepDigests(setup.alpha, digestScope({ agentId: world.notes.owner, identityId: "another-owner" }),
      [digestResult(1, "finished", "Another owner’s morning brief")]);
    await keepDigests(setup.alpha, `alpha/workflows/digests/${encodeURIComponent(world.notes.owner)}`,
      [digestResult(100, "finished", "Unverified older brief")]);
    await setup.close();

    await open(world);
    const latest = () => [...document.querySelectorAll("section[aria-label='Your day'] > button")]
      .find((card) => card.textContent?.startsWith("Latest brief"))?.textContent;
    await vi.waitFor(() => expect(latest()).toContain("Owner’s morning brief"));
    expect(latest()).not.toContain("Must stay off Home");
    expect(latest()).not.toContain("Unverified older brief");

    world.notes.ownerIdentity = "another-owner";
    await seen(false);
    await seen(true);
    await vi.waitFor(() => expect(latest()).toContain("Another owner’s morning brief"));
  });

  // spec/app/home/index.md, "Story: Open an app"
  it("Open one of Alpha's apps from Home (spec/app/home/index.md, \"Story: Open an app\")", async () => {
    const world = scene();
    const { alpha } = await open(world);
    const homes = home.runtime(alpha);
    await until(alpha, homes, Home.Machine, (h) => h.tiles.load.status === "Loaded");

    // spec/app/home/index.md, "Off the phone Home reads no apps, edits nothing and asks Android nothing"
    await pulled();
    expect([Boolean(button("Apps")), (await homes.runPromise(Home.Machine.use((m) => m.get()))).handoff.attempt.id]).toEqual([false, 0]);
    held("Notes");
    expect((await homes.runPromise(Home.Machine.use((m) => m.get()))).editing).toBe(false);

    // spec/app/home/index.md, "A tap on one of Alpha's own tiles on bare Home asks the shell to open that app, never while Home is being edited"
    await press("Notes");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Notes");
  });
});
