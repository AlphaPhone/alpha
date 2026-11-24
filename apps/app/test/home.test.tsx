// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import * as Home from "../gen/app__home.effect.vibe";
import * as Cards from "../gen/app__home__cards.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Toasts } from "../gen/app__notices__toasts.effect.vibe";
import home from "../src/home/index.tsx";
import { button, closeAll, drawn, fill, hardware, later, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import { waiting } from "../src/home/waiting.vibe";
import { agendaFrom } from "../src/home/cards.vibe";

underAct();
afterEach(closeAll);

const tiles = () => [...document.querySelectorAll("nav[aria-label='Apps on Home'] [data-home-tile]")].map((tile) => tile.getAttribute("data-home-tile"));
const tileButton = (id: string) => document.querySelector<HTMLButtonElement>(`[data-home-tile="${id}"]`);
const drawerButton = (name: string) => [...document.querySelectorAll<HTMLButtonElement>("section button, [data-apps-drawer] button, button")].filter((found) => !found.hasAttribute("data-home-tile")).find((found) => (found.getAttribute("aria-label") ?? found.textContent) === name);
const toast = () => document.querySelector("[role=status]")?.textContent;
const held = (name: string) => button(name)?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
const pulled = () => drawn(() => {
  const zone = document.querySelector("h1")?.parentElement;
  zone?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, isPrimary: true, clientX: 100, clientY: 10 }));
  zone?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, isPrimary: true, clientX: 100, clientY: 120 }));
});
const alphaApps = ["view:Inbox", "view:Calendar", "view:Clock", "view:Reminders", "view:Browser", "view:Camera", "view:Photos", "view:Maps", "view:Notes", "view:Files", "view:Workflows", "view:Settings"];

describe("Home on a phone", () => {
  // spec/app/home/index.md, "Story: Start Home"; spec/app/home/index.md, "Story: Keep my apps on Home"; spec/app/home/index.md, "Story: Edit Home"
  it("Start Home, keep my apps on it and edit it (spec/app/home/index.md, \"Story: Start Home\"; spec/app/home/index.md, \"Story: Keep my apps on Home\"; spec/app/home/index.md, \"Story: Edit Home\")", async () => {
    const world = { ...scene(), phone: true };
    const first = await open(world);
    const { alpha } = first;
    const homes = home.runtime(alpha);

    // spec/app/home/index.md, "Startup says once per run how Alpha is presented, and Home then reads its saved tiles": with nothing saved Home shows Alpha's own apps that this phone admits.
    await until(alpha, homes, Home.Machine, (h) => h.host === "AsLauncher" && h.tiles.load.status === "Loaded");
    expect(tiles()).toEqual(alphaApps);

    // spec/app/home/tiles.md, "Only Phone, Messages and Inbox carry a badge, only when something waits there, and no tile does while Home is being edited"
    await drawn(() => { waiting.tell("Inbox", "3 unread"); waiting.tell("Notes", "1 shared"); });
    expect([button("Inbox3 unread") !== undefined, button("Notes") !== undefined]).toEqual([true, true]);

    // spec/app/home/index.md, "A long press on bare Home starts editing, only on the phone and once the tiles are read"
    held("Notes");
    await until(alpha, homes, Home.Machine, (h) => h.editing);
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

    // spec/app/home/index.md, "Back closes one layer of Home's own: an app's menu, then Add to Home, then editing; Done ends editing"
    await hardware("back");
    await until(alpha, homes, Home.Machine, (h) => !h.editing);
    expect(Boolean(button("Done"))).toBe(false);

    // spec/app/home/index.md, "A restart forgets everything but its numbers, which keep rising, so nothing asked before it can answer after it": the tiles come back as they were saved.
    await first.close();
    const second = await open(world);
    await until(second.alpha, home.runtime(second.alpha), Home.Machine, (h) => h.tiles.load.status === "Loaded" && h.tiles.load.ticket === 2);
    expect(tiles().at(-1)).toBe("view:Notes");
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
    const agenda = () => [...document.querySelectorAll("button")].find((found) => /^Open (calendar event|overdue reminder)/.test(found.getAttribute("aria-label") ?? ""));

    // spec/app/home/cards.md, "When Home shows, when Alpha comes back to the front, and when the local day turns while Home shows, Home asks again for every calendar it has not read today"; spec/app/home/cards.md, "The card leads with an overdue reminder, then the item that begins first; of two alike, the first read"
    await until(alpha, homes, Cards.Machine, (c) => c.calendar.source === "Ready" && c.calendar.items.length === 2);
    expect(agenda()?.getAttribute("aria-label")).toMatch(/^Open calendar event: Dentist/);

    // spec/app/home/cards.md, "The agenda draws on both calendars and the reminders saved on the phone, leaving out a calendar Calendar hides and a reminder already done"
    await drawn(() => agendaFrom.hidden([2]));
    expect(agenda()?.getAttribute("aria-label")).toMatch(/^Open calendar event: Standup/);
    await drawn(() => agendaFrom.reminders([{ due: day + 7 * hour, overdue: true, done: false, title: "Call the bank" }, { due: day, overdue: true, done: true, title: "Paid rent" }]));
    // spec/app/home/cards.md, "Under an overdue reminder the card also names the next item that is not overdue, so the reminder never hides it"
    expect(agenda()?.getAttribute("aria-label")).toMatch(/^Open overdue reminder: Call the bank/);
    expect(agenda()?.textContent).toContain("Standup");

    // spec/app/home/cards.md, "A card opens its app: the agenda Calendar, Messages and Phone their own, mail Inbox, the brief and Workflows Workflows; the agenda asks its calendar again if the last read did not succeed"
    await drawn(() => agenda()?.click());
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Calendar");
    await drawn(() => { agendaFrom.reminders([]); agendaFrom.hidden([]); });
  });

  // spec/app/home/index.md, "Story: See the apps on this phone"; spec/app/home/index.md, "Story: Find an app and see its details"; spec/app/home/index.md, "Story: Open an app"
  it("See the apps on this phone, find one and open it (spec/app/home/index.md, \"Story: See the apps on this phone\"; spec/app/home/index.md, \"Story: Find an app and see its details\"; spec/app/home/index.md, \"Story: Open an app\")", async () => {
    const world = { ...scene(), phone: true };
    const { alpha } = await open(world);
    const homes = home.runtime(alpha);
    await until(alpha, homes, Home.Machine, (h) => h.tiles.load.status === "Loaded");

    // spec/app/home/index.md, "When the shell moves, what no longer fits closes: anything over Home ends editing, the drawer opening included, and a closed drawer drops its search and menu": the drawer opening reads the apps.
    world.launcher.unlisted = true;
    await press("Apps");
    await until(alpha, homes, Home.Machine, (h) => h.installed.read.status === "Failed");

    // spec/app/home/index.md, "In the open drawer that could not read the apps, Try again reads them once more"
    world.launcher.unlisted = false;
    await press("Try again");
    await until(alpha, homes, Home.Machine, (h) => h.installed.read.status === "Loaded");
    expect([Boolean(drawerButton("Clock")), Boolean(drawerButton("Mail"))]).toEqual([true, true]);

    // spec/app/home/index.md, "A new search in the open drawer replaces the last and closes any open menu"
    await fill("Search apps", "cl");
    await until(alpha, homes, Home.Machine, (h) => h.query === "cl");
    expect([Boolean(drawerButton("Clock")), Boolean(drawerButton("Mail"))]).toEqual([true, false]);

    // spec/app/home/index.md, "An app's menu opens in the open drawer, for an app in the last reading, and says Add to Home or On Home"
    await drawn(() => drawerButton("Clock")?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })));
    await until(alpha, homes, Home.Machine, (h) => Home.menuIsOpen(h.menu));
    // spec/app/home/index.md, "Add to Home adds one of Alpha's own apps it lists, and an app's menu in the drawer adds that app; adding from the menu closes the drawer"
    await drawn(() => {
      const add = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((item) => item.textContent === "Add to Home");
      if (!add) throw new Error("no Add to Home menu item");
      add.click();
    });
    await until(alpha, alpha.runtime, Shell, (s) => !s.drawer);
    await until(alpha, homes, Home.Machine, (h) => h.tiles.save.outcome === "Confirmed");
    expect(tiles().at(-1)).toBe("app:org.fixture.clock/org.fixture.clock.Main");

    // spec/app/home/index.md, "Only an app in the last reading is opened, never while Home is being edited, and never by the touch that opened its menu"
    await drawn(() => tileButton("app:org.fixture.clock/org.fixture.clock.Main")?.click());
    await until(alpha, homes, Home.Machine, (h) => h.handoff.attempt.outcome === "Confirmed");
    expect(world.launcher.opened).toEqual(["org.fixture.clock"]);

    // spec/app/home/index.md, "Android's answer ends the wait; a refusal is told with its reason, and the apps are read again"
    world.launcher.refusing.set("org.fixture.clock", "disabled");
    await drawn(() => tileButton("app:org.fixture.clock/org.fixture.clock.Main")?.click());
    await until(alpha, homes, Home.Machine, (h) => h.handoff.attempt.outcome === "Refused" && h.installed.read.status === "Loaded");
    await until(alpha, alpha.runtime, Toasts, (t) => t.showing);
    expect([toast(), world.launcher.opened.length]).toEqual(["Couldn't open Clock. It's turned off.", 2]);

    // spec/app/home/index.md, "A reading's answer closes a menu whose app has gone, and a failed one that takes an installed tile off Home says so"; spec/app/home/index.md, "Home shows a tile only while its app is on this phone; a tile whose app has gone keeps its place and comes back with the app"
    const clock = world.launcher.apps[0]!;
    world.launcher.apps = world.launcher.apps.slice(1);
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
    const world = { ...scene(), phone: true };
    world.launcher.shade = "silent";
    const { alpha } = await open(world);
    const homes = home.runtime(alpha);
    await until(alpha, homes, Home.Machine, (h) => h.host === "AsLauncher" && h.tiles.load.status === "Loaded");

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
  });
});

describe("Home in a browser", () => {
  // spec/app/home/index.md, "Story: Open an app"
  it("Open one of Alpha's apps from Home (spec/app/home/index.md, \"Story: Open an app\")", async () => {
    const world = scene();
    const { alpha } = await open(world);
    const homes = home.runtime(alpha);
    await until(alpha, homes, Home.Machine, (h) => h.tiles.load.status === "Loaded");

    // spec/app/home/index.md, "Off the phone Home reads no apps, opens nothing of the drawer, edits nothing and asks Android nothing"
    await pulled();
    expect([Boolean(button("Apps")), (await homes.runPromise(Home.Machine.use((m) => m.get()))).handoff.attempt.id]).toEqual([false, 0]);
    held("Notes");
    expect((await homes.runPromise(Home.Machine.use((m) => m.get()))).editing).toBe(false);

    // spec/app/home/index.md, "A tap on one of Alpha's own tiles on bare Home asks the shell to open that app, never while Home is being edited"
    await press("Notes");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Notes");
  });
});
