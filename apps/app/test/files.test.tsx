// @vitest-environment happy-dom
import { Effect } from "effect";
import type { DeviceOperation } from "@elizaos/agent/operations";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Tabs } from "../gen/app__browser.effect.vibe";
import { Machine as Browser } from "../gen/app__files.effect.vibe";
import { Machine as Shown } from "../gen/app__files__preview.effect.vibe";
import { Machine as Recent } from "../gen/app__files__recent.effect.vibe";
import { everything } from "../gen/app__files__search.effect.vibe";
import { Machine as Bin } from "../gen/app__files__trash.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Inbox } from "../gen/app__inbox.effect.vibe";
import { Machine as Drafts } from "../gen/app__inbox__drafts.effect.vibe";
import { Letters } from "../src/inbox/composer.vibe";
import { agentFilter, agentOpen, agentRead, approved, fileAction, offer, reviewFileAction, shownAt } from "../src/files/agent.vibe";
import type { Place } from "../src/areas.ts";
import browser from "../src/browser/index.tsx";
import files from "../src/files/index.tsx";
import { called } from "../src/platform/files.vibe";
import { button, closeAll, drawn, fill, hardware, later, only, open, press, pressOnTop, seen, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const listed = () => [...document.querySelectorAll("[aria-label=Listed] button:not([role=checkbox])")].map((row) => row.getAttribute("aria-label"));
const openRow = (name: string) => drawn(() => {
  const found = [...document.querySelectorAll("[aria-label=Listed] button:not([role=checkbox])")].find((row) => row.getAttribute("aria-label") === name);
  if (!(found instanceof HTMLElement)) throw new Error(`no listed row ${name}`);
  found.click();
});
const openMenu = (label: string) => drawn(() => {
  const trigger = button(label);
  if (!trigger) throw new Error(`no menu ${label}`);
  trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
});
const menuItem = (name: string) => [...document.querySelectorAll<HTMLElement>("[role=menuitem]")].find((item) => item.textContent === name);
const choose = async (name: string, menu = "Files options") => {
  await openMenu(menu);
  await drawn(() => {
    const item = menuItem(name);
    if (!item) throw new Error(`no menu item ${name}`);
    item.click();
  });
};
const paths = (world: ReturnType<typeof scene>) => world.files.stored.map((one) => `${one.volume}:${one.path}`).sort();
/** Choose `name`: its checkbox before anything is chosen, the row itself once choosing. */
const select = (name: string) => (button(`Select ${name}`) ? press(`Select ${name}`) : openRow(name));
const buttonOnTop = (name: string) => [...([...document.querySelectorAll("[role=dialog]")].at(-1)?.querySelectorAll("button") ?? [])].find((one) => (one.getAttribute("aria-label") ?? one.textContent) === name);

/** The Home tile of `view`, by its place rather than its words, which carry its badge. */
const homeTile = (view: string) => document.querySelector<HTMLButtonElement>(`[data-home-tile='view:${view}']`);
const openFromHome = (view: string) => drawn(() => {
  const found = homeTile(view);
  if (!found) throw new Error(`no Home tile ${view}`);
  found.click();
});

/** Alpha on a phone with Files on screen, its storage read. */
async function onFiles(world = { ...scene(), phone: true }, ...otherPlaces: Place[]) {
  const running = await open(world, only("home", "view:Files", "notice", ...otherPlaces));
  const { alpha } = running;
  const runtime = files.runtime(alpha);
  if (homeTile("Files")) await openFromHome("Files");
  return { ...running, world, runtime };
}

describe("Files on a phone", () => {
  it("Browse my storage (spec/app/files/index.md, \"Story: Browse my storage\")", async () => {
    const { alpha, runtime, world } = await onFiles();
    // spec/app/files/index.md, "The top shows each volume with a storage bar that is never fuller than the volume, or says the storage is unavailable"
    await until(alpha, runtime, Browser, (s) => s.storage.status === "Loaded" && s.access === "Granted");
    expect([Boolean(button("Internal storage")), Boolean(button("SD card")), Boolean(button("Trash"))]).toEqual([true, true, true]);
    // spec/app/files/index.md, "The top shows how many files each category holds and the room they take, and how many items the Trash holds, as the storage was last read"
    expect(runtime.runSync(Browser.use((m) => m.get())).tally).toEqual({
      counts: [{ kind: "Download", items: 2, bytes: 5_000 }, { kind: "Image", items: 1, bytes: 3_000 }, { kind: "Video", items: 0, bytes: 0 }, { kind: "Audio", items: 0, bytes: 0 }, { kind: "Document", items: 2, bytes: 2_010 }],
      trashed: 0,
    });

    // spec/app/files/index.md, "The owner opens a volume, a category, a listed folder, a step of the path, or goes back to the top; a category lists exactly the files of its kind"
    await press("Internal storage");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded");
    expect(listed().sort()).toEqual(["Documents", "Download"]);
    // spec/app/files/index.md, "Opening Files reads the storage and the place it left, and leaving Files drops every read, the selection, the confirmation and the sheets": a place is read once, however often the screen draws it
    const reads = world.files.calls.filter((call) => call === "storageList").length;
    await choose("Grid");
    await choose("List");
    await choose("Name");
    expect([world.files.calls.filter((call) => call === "storageList").length, runtime.runSync(Browser.use((m) => m.get())).trail.length]).toEqual([reads, 1]);
    await openRow("Documents");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.trail.length === 2);
    expect(listed().sort()).toEqual(["Old", "notes.txt"]);
    await press("Internal storage");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.trail.length === 1);
    await press("Files");
    await press("Images");
    await until(alpha, runtime, Browser, (s) => s.inCategory && s.listing.status === "Loaded");
    expect(listed()).toEqual(["beach.jpg"]);

    // spec/app/files/index.md, "A place is called empty only after the phone read all of it; a reading cut short keeps what it read"
    world.files.listMost = 1;
    await press("Files");
    await press("Internal storage");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.trail.length === 1);
    expect([listed().length, document.body.textContent?.includes("Only part of this place could be read")]).toEqual([1, true]);
    world.files.listMost = 0;
    await choose("Refresh");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.items.length === 0);
    expect([document.body.textContent?.includes("Nothing here"), document.body.textContent?.includes("Only part of this place could be read")]).toEqual([false, true]);
    world.files.listMost = 5_000;

    // spec/app/files/index.md, "The place showing is read again when asked, and only its newest answer is taken; a folder that no longer exists brings the owner back to the top and says so, never that the storage is unavailable"
    await press("Files");
    await press("Internal storage");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded");
    await openRow("Documents");
    await press("Old");
    // spec/app/files/index.md, "The place showing is read again when asked, and only its newest answer is taken; a folder that no longer exists brings the owner back to the top and says so, never that the storage is unavailable": the phone watches the folder showing
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.trail.length === 3 && world.files.watching === "primary:Documents/Old");
    world.files.stored.splice(world.files.stored.findIndex((one) => one.path === "Documents/Old"), 1);
    world.files.changed();
    await until(alpha, runtime, Browser, (s) => s.missing);
    await drawn(() => {});
    expect([world.files.watching, Boolean(button("Internal storage"))]).toEqual([undefined, true]);
  });

  it("Browse my storage from the Browser's Show in Files, and go back (spec/app/files/index.md, \"Story: Browse my storage\"; spec/app/browser/downloads.md, \"Story: Download a file\")", async () => {
    const { alpha, runtime, world } = await onFiles({ ...scene(), phone: true, image: true }, "view:Browser");
    await until(alpha, runtime, Browser, (s) => s.storage.status === "Loaded");
    await press("Internal storage");
    await press("Download");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.trail.length === 2);

    // spec/app/files/index.md, "Back closes one layer inside Files: the Move to sheet, the share sheet, the name clash, the delete confirmation, the details, the Trash, the selection and the filter, then goes up the path a step; at the top, or back where another area's walk began, it leaves Files"
    // spec/app/files/index.md, "The owner sees a listed item's details: what it is, how big it is, when it last changed and where it is; they close when the owner closes them or moves, or when the item is no longer listed"
    await select("beach.jpg");
    await press("Details");
    await until(alpha, runtime, Browser, (s) => s.details !== 0);
    expect(document.querySelector("dl[aria-label=Details]")).not.toBeNull();
    await hardware("back");
    await until(alpha, runtime, Browser, (s) => s.details === 0 && s.picked.length === 1);
    await hardware("back");
    await until(alpha, runtime, Browser, (s) => s.picked.length === 0);
    await choose("Filter files");
    await fill("Filter", "beach");
    await press("Filter");
    await until(alpha, runtime, Browser, (s) => s.search.query.status === "Loaded");
    await hardware("back");
    await until(alpha, runtime, Browser, (s) => !s.search.searching);
    await hardware("back");
    await until(alpha, runtime, Browser, (s) => s.trail.length === 1 && s.listing.status === "Loaded");
    await hardware("back");
    await until(alpha, runtime, Browser, (s) => s.trail.length === 0);

    // spec/app/files/index.md, "Another area opens Files at Downloads: the Download folder of the main volume where the phone has one, else the Downloads category; the owner's own move to the top, a volume or a category ends that walk"
    await hardware("home");
    await openFromHome("Browser");
    await until(alpha, browser.runtime(alpha), Tabs, (s) => s.hydrated);
    const showInFiles = async () => {
      await press("Menu");
      await press("Downloads");
      await drawn(() => {
        const choose = world.browser.showInFiles;
        if (choose === undefined) throw new Error("the phone did not open Browser Downloads");
        choose();
      });
    };
    await showInFiles();
    await until(alpha, runtime, Browser, (s) => s.open && s.handed && s.trail.length === 2 && s.listing.status === "Loaded");
    expect(listed().sort()).toEqual(["beach.jpg", "lease.pdf"]);
    await hardware("back");
    await until(alpha, runtime, Browser, (s) => !s.open);
    expect(alpha.runtime.runSync(Shell.use((m) => m.get())).trail.at(-1)).toBe("Browser");

    world.files.stored.splice(world.files.stored.findIndex((one) => one.path === "Download"), 1);
    await showInFiles();
    await until(alpha, runtime, Browser, (s) => s.open && s.handed && s.inCategory && s.category === "Download" && s.listing.status === "Loaded");
  });

  it("Browse my storage without access (spec/app/files/index.md, \"Story: Browse my storage\")", async () => {
    const world = { ...scene(), phone: true };
    world.files.access = "denied";
    const { alpha, runtime } = await onFiles(world);
    // spec/app/files/index.md, "Allow goes to the permission flow while Android was never asked, and to Android's Settings after"
    await until(alpha, runtime, Browser, (s) => s.open && s.access === "Unasked");
    expect([Boolean(button("Allow")), world.files.calls.includes("storageList")]).toEqual([true, false]);
    await press("Allow");
    await until(alpha, runtime, Browser, (s) => s.access === "Denied");
    await press("Open Settings");
    world.files.access = "granted";
    // spec/app/files/index.md, "When the phone says Alpha may read the storage the place is read, and when it takes access away, or says the storage cannot be reached at all, everything read is dropped"
    await press("Open Settings");
    await until(alpha, runtime, Browser, (s) => s.access === "Granted" && s.storage.status === "Loaded");
    expect(world.files.calls.filter((call) => call.startsWith("storageRequestAccess"))).toEqual(["storageRequestAccess", "storageRequestAccess settings", "storageRequestAccess settings"]);
  });

  it("Arrange and filter what I see (spec/app/files/index.md, \"Story: Arrange and filter what I see\"; spec/app/files/search.md, \"Story: Filter what I see\")", async () => {
    const { alpha, runtime, world } = await onFiles();
    await until(alpha, runtime, Browser, (s) => s.storage.status === "Loaded");
    await press("Internal storage");
    await press("Download");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.items.length === 2);
    // spec/app/files/index.md, "The owner chooses a grid or a list, and a sort; choosing the same sort again reverses it"
    await choose("Name");
    expect(listed()).toEqual(["beach.jpg", "lease.pdf"]);
    await choose("Name");
    expect(listed()).toEqual(["lease.pdf", "beach.jpg"]);
    await choose("Size");
    expect(listed()).toEqual(["beach.jpg", "lease.pdf"]);
    await choose("Size");
    expect(listed()).toEqual(["lease.pdf", "beach.jpg"]);
    // spec/app/files/index.md, "The owner sets a filter of a kind and a text for the place showing, as a chip the owner sees and clears; only what matches both is shown"
    await choose("Filter files");
    await fill("Filter", "LEASE");
    await press("Filter");
    await until(alpha, runtime, Browser, (s) => s.search.query.status === "Loaded");
    expect(runtime.runSync(Browser.use((m) => m.get())).search.hits.map((hit) => hit.name)).toEqual(["lease.pdf"]);
    await fill("Filter", "");
    await press("Images");
    await press("Filter");
    await until(alpha, runtime, Browser, (s) => s.search.query.status === "Loaded" && !s.search.filter.anyKind);
    expect(runtime.runSync(Browser.use((m) => m.get())).search.hits.map((hit) => hit.name)).toEqual(["beach.jpg"]);
    // spec/app/files/index.md, "A refresh asks the filter on again for the place showing, so what it found is never older than what the place lists"
    world.files.stored.push({ volume: "primary", path: "Download/dunes.png", directory: false, mimeType: "image/png", size: 1, modified: 8 });
    await choose("Refresh");
    await until(alpha, runtime, Browser, (s) => s.search.query.status === "Loaded" && s.search.hits.length === 2);
    world.files.stored.pop();
    await press("Clear the filter");
    await until(alpha, runtime, Browser, (s) => !s.search.searching);

    // spec/app/files/index.md, "The place showing is read again when asked, and only its newest answer is taken; a folder that no longer exists brings the owner back to the top and says so, never that the storage is unavailable": coming back to Alpha reads the place again
    await seen(false);
    world.files.stored.push({ volume: "primary", path: "Download/new.txt", directory: false, mimeType: "text/plain", size: 1, modified: 9 });
    await seen(true);
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.items.length === 3);

    world.files.stored.push({ volume: "primary", path: "song.txt", directory: false, mimeType: "text/plain", size: 3, modified: 10 });
    await press("Files");
    await press("SD card");
    await choose("Filter files");
    await fill("Filter", "song");
    await press("Any kind");
    await press("Filter");
    await until(alpha, runtime, Browser, (s) => s.search.query.status === "Loaded" && s.search.hits.length === 1);
    expect(runtime.runSync(Browser.use((m) => m.get())).search.hits.map((hit) => hit.name)).toEqual(["song.mp3"]);
  });

  it("Change my files (spec/app/files/index.md, \"Story: Change my files\"; spec/app/files/change.md, \"Story: Change my files\"; spec/app/files/destination.md, \"Story: Choose a destination\"; spec/app/files/change.md, \"Story: Share what I selected\")", async () => {
    const { alpha, runtime, world } = await onFiles();
    await until(alpha, runtime, Browser, (s) => s.storage.status === "Loaded");
    await press("Internal storage");
    await press("Download");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.items.length === 2);

    // spec/app/files/index.md, "A change starts from the selection, of the folder showing, into a destination only as the Move to sheet last read it, as Changes allows it"
    await select("lease.pdf");
    await press("Move or copy");
    // spec/app/files/index.md, "The owner opens the Move to sheet for the selection, at the folder showing, and goes through the volumes and folders in it"
    await pressOnTop("Storage");
    await until(alpha, runtime, Browser, (s) => s.sheet.trail.length === 0);
    expect([Boolean(buttonOnTop("Internal storage")), Boolean(buttonOnTop("SD card"))]).toEqual([true, false]);
    await pressOnTop("Internal storage");
    await until(alpha, runtime, Browser, (s) => s.sheet.reading.status === "Loaded");
    await pressOnTop("Documents");
    await until(alpha, runtime, Browser, (s) => s.sheet.reading.status === "Loaded" && s.sheet.trail.length === 2);
    await pressOnTop("Move here");
    // spec/app/files/index.md, "A change ends as its answer says, what a move took away is told, and the place is read again"
    await until(alpha, runtime, Browser, (s) => s.change.attempt.outcome === "Confirmed" && s.listing.status === "Loaded");
    expect([listed(), paths(world).includes("primary:Documents/lease.pdf")]).toEqual([["beach.jpg"], true]);

    // spec/app/files/change.md, "A change starts when none is under way and nothing of it is still unknown; when names clash in the destination the owner is asked first, and an approved request keeps both"
    await select("beach.jpg");
    await press("Move or copy");
    await pressOnTop("Internal storage");
    await until(alpha, runtime, Browser, (s) => s.sheet.reading.status === "Loaded");
    await pressOnTop("Download");
    await until(alpha, runtime, Browser, (s) => s.sheet.reading.status === "Loaded" && s.sheet.trail.length === 2);
    await pressOnTop("Copy here");
    await until(alpha, runtime, Browser, (s) => s.change.clash.showing);
    await press("Keep both");
    await until(alpha, runtime, Browser, (s) => s.change.attempt.outcome === "Confirmed" && s.listing.status === "Loaded");
    expect(listed().sort()).toEqual(["beach.jpg", "beach.jpg (2)"]);

    // spec/app/files/change.md, "A file of the same name is replaced only when the owner chose to replace it, never for the agent"
    for (let round = 0; round < 2; round += 1) {
      await select("beach.jpg");
      await press("Move or copy");
      await pressOnTop("Internal storage");
      await until(alpha, runtime, Browser, (s) => s.sheet.reading.status === "Loaded");
      await pressOnTop("Documents");
      await until(alpha, runtime, Browser, (s) => s.sheet.reading.status === "Loaded" && s.sheet.trail.length === 2);
      await pressOnTop("Copy here");
      if (runtime.runSync(Effect.flatMap(Browser, (m) => m.get())).change.clash.showing) await press("Replace");
      await until(alpha, runtime, Browser, (s) => s.change.work === "CopyTo" && s.change.attempt.outcome === "Confirmed" && s.listing.status === "Loaded");
    }
    expect([paths(world).filter((path) => path.startsWith("primary:Documents/beach")), world.files.trash.map((one) => one.was.path)]).toEqual([["primary:Documents/beach.jpg"], ["Documents/beach.jpg"]]);
    world.files.trash.splice(0);

    // spec/app/files/index.md, "One request leaves for each change, for items listed as they are now or the file shown, and only when the owner starts, chooses or renames it, or approved it"
    await choose("New folder");
    await fill("Name", "Taxes");
    await press("Make");
    await until(alpha, runtime, Browser, (s) => s.change.work === "NewFolder" && s.change.attempt.outcome === "Confirmed" && s.listing.status === "Loaded");
    await select("beach.jpg (2)");
    await press("Rename");
    await fill("Name", "Taxes");
    expect(buttonOnTop("Rename")?.hasAttribute("disabled")).toBe(true);
    await fill("Name", "dunes.jpg");
    await pressOnTop("Rename");
    await until(alpha, runtime, Browser, (s) => s.change.work === "Rename" && s.change.attempt.outcome === "Confirmed" && s.listing.status === "Loaded");
    expect(listed().sort()).toEqual(["Taxes", "beach.jpg", "dunes.jpg"]);

    // spec/app/files/index.md, "The owner opens the share sheet for a selection of one to a hundred files and no folder while none is open, shares from it, and Android says whether it could open it"
    await select("dunes.jpg");
    await press("Share");
    await press("Share to an app");
    await until(alpha, runtime, Browser, (s) => s.change.sending.outcome === "Confirmed");
    expect(world.files.shared).toEqual([["Download/dunes.jpg"]]);
    // spec/app/files/change.md, "Each sheet sends once, by email when an account can take it, through the phone's chooser, as copied text or saved through the system picker, and then goes away; sharing by text message is not offered"
    await press("Share");
    await press("Copy");
    await until(alpha, runtime, Browser, (s) => s.change.sending.outcome === "Confirmed" && s.change.sentTo === "Copy");
    expect(await navigator.clipboard.readText()).toBe("Internal storage/Download/dunes.jpg");
    // spec/app/files/change.md, "The sheet goes away when the owner closes it or Files is hidden, and when the selection changes the owner is told it sent nothing; a sheet never opens again"
    await press("Share");
    await until(alpha, runtime, Browser, (s) => s.change.panel !== 0);
    await select("beach.jpg");
    await until(alpha, runtime, Browser, (s) => s.change.panel === 0 && s.change.stale);
    expect(document.body.textContent?.includes("The selection changed, so nothing was shared")).toBe(true);
    await press("Cancel");

    // spec/app/files/index.md, "An approved request runs only in Files on screen, in the folder the owner approved, on a screen that is not protected, and on the item as it was shown; otherwise the agent is told it did not run"
    await select("dunes.jpg");
    const dunes = world.files.stored.find((one) => one.path === "Download/dunes.jpg");
    if (dunes) dunes.modified = 99;
    await press("Move or copy");
    await pressOnTop("Taxes");
    await until(alpha, runtime, Browser, (s) => s.sheet.reading.status === "Loaded" && s.sheet.trail.length === 3);
    await pressOnTop("Move here");
    await until(alpha, runtime, Browser, (s) => s.change.work === "MoveTo" && s.change.attempt.outcome === "Refused" && s.listing.status === "Loaded");
    expect(paths(world).includes("primary:Download/dunes.jpg")).toBe(true);
  });

  it("Look at a file, and find what I opened lately (spec/app/files/preview.md, \"Story: Look at a file\"; spec/app/files/recent.md, \"Story: Find what I opened lately\"; spec/app/files/recent.md, \"Story: Pick a file with the system picker\"; spec/app/files/preview.md, \"Story: Act on the file I am looking at\")", async () => {
    const { alpha, runtime, world } = await onFiles(undefined, "assistant");
    await until(alpha, runtime, Browser, (s) => s.storage.status === "Loaded");
    await press("Internal storage");
    await openRow("Documents");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.trail.length === 2);
    // spec/app/files/index.md, "The owner opens a file that is listed or found, with the names beside it, and Recent remembers it"
    // spec/app/files/preview.md, "What was read of a file is shown only in its own viewer, while it can be read"
    await press("notes.txt");
    await until(alpha, runtime, Shown, (s) => s.content.status === "Loaded" && s.kind === "Text");
    expect(document.querySelector("pre")?.textContent).toBe("The words of notes.txt");
    const updated = world.files.stored.find((file) => file.path === "Documents/notes.txt");
    if (updated) updated.modified = 11;
    world.files.texts["Documents/notes.txt"] = "These are the revised notes";
    world.files.changed();
    await until(alpha, runtime, Shown, (s) => s.revision === 11 && s.content.status === "Loaded");
    expect(document.querySelector("pre")?.textContent).toBe("These are the revised notes");

    await choose("Ask Alpha", "File actions");
    await until(alpha, alpha.runtime, Shell, (s) => s.assistant === "Sheet");
    await press("Remove notes.txt");
    await hardware("back");
    await until(alpha, alpha.runtime, Shell, (s) => s.assistant === "Bar");
    // spec/app/files/preview.md, "The owner closes the viewer, and so does leaving the screen or the phone locking"
    await press("Close");
    await until(alpha, runtime, Shown, (s) => s.viewer === 0);
    await until(alpha, runtime, Recent, (s) => s.rows.length === 1 && s.shown.grant === 0);

    // spec/app/files/preview.md, "The owner turns the pages of a PDF, and only the newest page asked for is drawn"
    await press("Files");
    await press("Internal storage");
    await press("Download");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.trail.length === 2);
    await press("lease.pdf");
    await until(alpha, runtime, Shown, (s) => s.drawing.status === "Loaded" && s.pages === 3 && s.page === 1);
    await press("Next page");
    await until(alpha, runtime, Shown, (s) => s.drawing.status === "Loaded" && s.page === 2);
    // spec/app/files/preview.md, "Open elsewhere hands the file over to read only"
    await choose("Open elsewhere", "File actions");
    await until(alpha, runtime, Shown, () => world.files.opened.includes("selection:Download/lease.pdf"));
    // spec/app/files/preview.md, "Forget removes the file from Recent, with or without access, and closes the viewer"
    await choose("Forget", "File actions");
    await until(alpha, runtime, Recent, (s) => s.rows.length === 1 && s.shown.grant === 0);
    expect(world.files.forgotten).toEqual(["selection:Download/lease.pdf"]);

    // spec/app/files/preview.md, "A file that holds a verification code or another secret is never handed to Ask Alpha"
    world.files.stored.push({ volume: "primary", path: "Download/code.txt", directory: false, mimeType: "text/plain", size: 30, modified: 4 });
    world.files.texts["Download/code.txt"] = "Your verification code is 482913";
    await choose("Refresh");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.items.length === 3);
    await press("code.txt");
    await until(alpha, runtime, Shown, (s) => s.content.status === "Loaded" && s.secret);
    await openMenu("File actions");
    expect(menuItem("Ask Alpha")).toBeUndefined();
    await drawn(() => menuItem("Open elsewhere")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    await press("Close");

    // spec/app/files/recent.md, "Opening a row again asks the phone first: it opens, moves to the front and is the document open, or its access has ended and it must be selected again, or its provider cannot be reached and it stays"
    await press("Files");
    await press("notes.txt");
    await until(alpha, runtime, Shown, (s) => s.content.status === "Loaded" && s.kind === "Text");
    await press("Close");
    await until(alpha, runtime, Shown, (s) => s.viewer === 0);
    world.files.forgotten.push("selection:Documents/notes.txt");
    await press("notes.txt");
    await until(alpha, runtime, Recent, (s) => s.reaching.status === "Failed" && s.rows.filter((row) => row.grant === 0).length === 1);
    expect(button("notes.txt")).toBeUndefined();

    world.files.stored.push({ volume: "primary", path: "Download/restored.txt", directory: false, mimeType: "text/plain", size: 12, modified: 10 });
    world.files.selectedByPicker = "Download/restored.txt";
    await press("Select again: notes.txt");
    await until(alpha, runtime, Shown, (s) => s.content.status === "Loaded" && s.kind === "Text");
    expect(document.querySelector("pre")?.textContent).toBe("The words of restored.txt");
    await hardware("back");
    await until(alpha, runtime, Shown, (s) => s.viewer === 0);
    // spec/app/files/recent.md, "A file selected again takes the place of its lapsed row": restored.txt stands where notes.txt was, ahead of code.txt, which still holds its access
    expect(runtime.runSync(Recent.use((m) => m.get())).rows.map((row) => [row.origin, row.grant > 0])).toEqual([["Picked", true], ["InFolder", true]]);

  });

  it("Offer the file I am looking at to Inbox (spec/app/files/preview.md, \"Story: Act on the file I am looking at\"; spec/app/inbox/adding.md, \"Story: Add files and people to my draft\")", async () => {
    const { alpha, runtime, world } = await onFiles(undefined, "view:Inbox");
    const content = "A reviewed attachment";
    world.files.stored.push({ volume: "primary", path: "Download/attach.txt", directory: false, mimeType: "text/plain", size: content.length, modified: 12 });
    world.files.texts["Download/attach.txt"] = content;
    await hardware("home");
    await openFromHome("Inbox");
    await until(alpha, alpha.runtime, Inbox, (state) => state.signedIn && state.selected.account !== 0 && state.accounts.status === "Loaded");
    await hardware("home");
    await openFromHome("Files");
    await until(alpha, runtime, Browser, (state) => state.open && state.storage.status === "Loaded");
    await press("Internal storage");
    await press("Download");
    await until(alpha, runtime, Browser, (state) => state.listing.status === "Loaded" && state.items.some((item) => item.name === "attach.txt"));
    await press("attach.txt");
    await until(alpha, runtime, Shown, (state) => state.content.status === "Loaded");

    await choose("Use in email", "File actions");
    await until(alpha, alpha.runtime, Shell, (state) => state.trail.at(-1) === "Inbox");
    await until(alpha, runtime, Shown, (state) => state.attempt.outcome === "Confirmed");
    expect(alpha.runtime.runSync(Drafts.use((model) => model.get())).open).toBe(false);
    await pressOnTop("New email");

    await until(alpha, alpha.runtime, Drafts, (state) => state.open && state.letter.attachments === 1);
    const draft = alpha.runtime.runSync(Drafts.use((model) => model.get())).letter.id;
    const words = alpha.runtime.runSync(Letters.use((letters) => Effect.sync(() => letters.words(draft))));
    expect(words.files).toEqual([{ name: "attach.txt", mimeType: "text/plain", size: content.length, data: btoa(content) }]);
    expect(world.inbox.changes.some((change) => change.startsWith("send "))).toBe(false);
  });

  it("Let the agent read my files (spec/app/files/index.md, \"Story: Let the agent read my files\")", async () => {
    const { alpha, runtime, world } = await onFiles();
    await until(alpha, runtime, Browser, (s) => s.storage.status === "Loaded");
    await press("Internal storage");
    await press("Download");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.items.length === 2);
    const now = () => runtime.runSync(Browser.use((m) => m.get()));
    // spec/app/files/index.md, "The phone offers Files to an agent that takes Files' operations, and naming files by their place among the results shown only beside them; a request the phone cannot take is never shown for approval"
    expect(await runtime.runPromise(offer)).toEqual({ operations: true, positions: true });

    // spec/app/files/index.md, "The agent reads a folder for itself, and only its newest reading is told to it; it is told it failed without access or on a protected screen"
    // spec/app/files/index.md, "The agent's reading and opening change nothing the owner is working on"
    const read = await runtime.runPromise(agentRead(1, { volume: "primary", path: "Documents" }, { ...everything, text: "NOTES" }, false));
    expect([read.ok, read.items.map((item) => item.name), now().trail.length, now().items.length]).toEqual([true, ["notes.txt"], 2, 2]);
    expect((await runtime.runPromise(agentRead(2, { volume: "primary", path: "Documents" }, everything, true))).ok).toBe(false);

    const dated = Date.parse("2026-03-04T12:00:00Z");
    world.files.stored.push(
      { volume: "primary", path: "Download/during.pdf", directory: false, mimeType: "application/pdf", size: 10, modified: dated },
      { volume: "primary", path: "Download/earlier.pdf", directory: false, mimeType: "application/pdf", size: 10, modified: dated - 86_400_000 },
      { volume: "primary", path: "Download/plain.pdf", directory: false, mimeType: "text/plain", size: 10, modified: dated },
    );
    const filter = { type: "files_filter", kind: "pdf", from: "2026-03-04T00:00:00Z", to: "2026-03-04T23:59:59Z" } as const;
    const filteredByDate = await runtime.runPromise(fileAction(filter, { attemptId: 1, proposalId: "dated-pdfs", operationId: "dated-pdfs" }));
    expect([filteredByDate?.kind, now().search.hits.map((item) => item.name)]).toEqual(["applied", ["during.pdf"]]);

    // spec/app/files/index.md, "The agent sets the owner's filter on Files on screen, and is told how many it found; otherwise it is told it failed"
    const filtered = await runtime.runPromise(agentFilter(3, { ...everything, kind: "Image", anyKind: false }, false));
    expect([filtered.ok, filtered.items.map((item) => item.name), now().search.filter.kind]).toEqual([true, ["beach.jpg"], "Image"]);
    // spec/app/files/index.md, "A position names a result on screen, counting from one; a request naming a position that is not shown names nothing and leaves no card, and a card keeps the files it showed"
    const [first] = await runtime.runPromise(shownAt([1]));
    expect([first?.name, (await runtime.runPromise(shownAt([2]))).length]).toEqual(["beach.jpg", 0]);

    // spec/app/files/index.md, "The agent opens a file the owner is shown, as listed or found now, when no file is open over Files; otherwise it is told it failed"
    const beach = now().items.find((item) => item.name === "beach.jpg");
    if (!beach) throw new Error("beach.jpg is not listed");
    expect((await runtime.runPromise(agentOpen(4, beach, false))).ok).toBe(true);
    await until(alpha, runtime, Shown, (s) => s.viewer !== 0 && s.item === beach.id);
    expect((await runtime.runPromise(agentOpen(5, beach, false))).ok).toBe(false);
    await press("Close");
    await until(alpha, runtime, Shown, (s) => s.viewer === 0);
    await press("Clear the filter");
    await until(alpha, runtime, Browser, (s) => !s.search.searching);

    // spec/app/files/index.md, "An approved request runs only in Files on screen, in the folder the owner approved, on a screen that is not protected, and on the item as it was shown; otherwise the agent is told it did not run"
    // spec/app/files/index.md, "An approved request acts on its own item alone, in the folder showing, and never while Files is away"
    const lease = now().items.find((item) => item.name === "lease.pdf");
    if (!lease) throw new Error("lease.pdf is not listed");
    const folder = now().trail.at(-1) ?? 0;
    const nowhere = { folder: 0, path: [], names: [] };
    expect(await runtime.runPromise(approved({ ticket: 7, act: "Naming", file: lease, folder, name: "lease 2026.pdf", dest: nowhere }, true))).toEqual({ ran: false, outcome: "Refused" });
    expect(await runtime.runPromise(approved({ ticket: 8, act: "Naming", file: lease, folder, name: "lease 2026.pdf", dest: nowhere }, false))).toEqual({ ran: true, outcome: "Confirmed" });
    expect(paths(world).includes("primary:Download/lease 2026.pdf")).toBe(true);
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.items.some((item) => item.name === "lease 2026.pdf"));
    const path = "Download/lease 2026.pdf";
    const reviewed = () => runtime.runPromise(called("storageReviewedIdentities", (plugin) => plugin.storageReviewedIdentities({ volume: "primary", paths: [path] })));
    const before = await reviewed();
    if (!before.reviewed) throw new Error("the renamed lease cannot be reviewed");
    const renamed = world.files.stored.find((one) => one.path === path);
    if (!renamed) throw new Error("the renamed lease is not listed");
    renamed.modified = 77;
    world.files.changed();
    await until(alpha, runtime, Browser, (s) => s.items.some((item) => item.name === "lease 2026.pdf" && item.revision === 77));
    const call = { attemptId: 1, proposalId: "delete-lease", operationId: "delete-lease" };
    expect(await runtime.runPromise(fileAction({ type: "files_trash", paths: [path], reviewed: before.reviewed }, call))).toEqual({ kind: "refused", code: "FILES_UNCHANGED" });
    expect(paths(world).includes(`primary:${path}`)).toBe(true);
    const after = await reviewed();
    if (!after.reviewed) throw new Error("the changed lease cannot be reviewed");
    expect(await runtime.runPromise(fileAction({ type: "files_trash", paths: [path], reviewed: after.reviewed }, { ...call, proposalId: "delete-reviewed-lease", operationId: "delete-reviewed-lease" }))).toEqual({ kind: "applied" });
    expect(world.files.trash.map((one) => one.was.path)).toEqual([path]);

    const ask = async (operation: DeviceOperation, proposalId: string) => {
      const review = await runtime.runPromise(reviewFileAction(operation));
      if (review === undefined) throw new Error(`Files could not review ${operation.type}`);
      return { review, call: { attemptId: 1, operationId: proposalId, proposalId } };
    };

    // spec/app/files/index.md, "A reviewed exact path opens its file or folder; a shown position is bound to the same path at review"
    const elsewhere = { type: "files_open", path: "Documents/notes.txt" } as const;
    const openedFile = await ask(elsewhere, "open-another-folder-file");
    expect(await runtime.runPromise(fileAction(elsewhere, openedFile.call, openedFile.review))).toEqual({ kind: "applied" });
    await until(alpha, runtime, Shown, (state) => state.content.status === "Loaded" && state.kind === "Text");
    expect([document.querySelector("pre")?.textContent, now().trail.at(-1)]).toEqual(["The words of notes.txt", folder]);
    await press("Close");
    await until(alpha, runtime, Shown, (state) => state.viewer === 0);

    const documentFolder = { type: "files_open", path: "Documents" } as const;
    const openedFolder = await ask(documentFolder, "open-documents-folder");
    expect(await runtime.runPromise(fileAction(documentFolder, openedFolder.call, openedFolder.review))).toEqual({ kind: "applied" });
    await until(alpha, runtime, Browser, (state) => state.listing.status === "Loaded" && state.items.some((item) => item.name === "notes.txt"));
    const folders = await runtime.runPromise(agentFilter(12, { ...everything, kind: "Folder", anyKind: false }, false));
    expect(folders.items.map((row) => row.name)).toEqual(["Old"]);
    const position = { type: "files_open", shown: 1 } as const;
    const openedPosition = await ask(position, "open-shown-folder");
    expect(await runtime.runPromise(fileAction(position, openedPosition.call, openedPosition.review))).toEqual({ kind: "applied" });
    await until(alpha, runtime, Browser, (state) => state.trail.length === 3 && state.listing.status === "Loaded");
    expect(document.querySelector("nav[aria-label='Folder path']")?.textContent).toContain("Old");
    await press("Clear the filter");
    await press("Files");
    await press("Internal storage");
    await press("Download");
    await until(alpha, runtime, Browser, (state) => state.trail.at(-1) === folder && state.listing.status === "Loaded");

    // spec/app/files/index.md, "A reviewed batch runs once for the paths shown in the review, as one move, Trash job or Android share"
    const pdfs = { ...everything, kind: "Pdf", anyKind: false } as const;
    await runtime.runPromise(agentFilter(15, pdfs, false));
    const sharing = { type: "files_share", shown: [1, 2] } as const;
    const share = await ask(sharing, "share-two");
    await runtime.runPromise(agentFilter(16, { ...pdfs, text: "earlier" }, false));
    expect(await runtime.runPromise(fileAction(sharing, share.call, share.review))).toEqual({ kind: "applied" });
    expect(world.files.shared).toEqual([["Download/during.pdf", "Download/earlier.pdf"]]);

    const moving = { type: "files_move", paths: ["Download/during.pdf", "Documents/notes.txt"], dest: "Documents/Old" } as const;
    const move = await ask(moving, "move-two");
    const changed = world.files.stored.find((item) => item.path === "Download/during.pdf");
    if (changed === undefined) throw new Error("the reviewed file is missing from the phone");
    changed.modified += 1;
    expect(await runtime.runPromise(fileAction(moving, move.call, move.review))).toEqual({ kind: "applied" });
    expect([paths(world).includes("primary:Download/during.pdf"), paths(world).includes("primary:Documents/Old/notes.txt"), world.files.calls.filter((method) => method === "move").length]).toEqual([true, true, 1]);

    const deleting = { type: "files_trash", paths: ["Download/during.pdf", "Download/earlier.pdf"] } as const;
    const deletion = await ask(deleting, "trash-two");
    expect(await runtime.runPromise(fileAction(deleting, deletion.call, deletion.review))).toEqual({ kind: "applied" });
    expect(world.files.trash.map((one) => one.was.path).sort()).toEqual([path, "Download/during.pdf", "Download/earlier.pdf"].sort());

    await hardware("home");
    expect(await runtime.runPromise(approved({ ticket: 10, act: "Deleting", file: beach, folder, name: "", dest: nowhere }, false))).toEqual({ ran: false, outcome: "Refused" });
  });

  it("Come back after a restart (spec/app/files/index.md, \"Story: Come back after a restart\"; spec/app/files/change.md, \"Story: Come back to my changes after a restart\"; spec/app/files/trash.md, \"Story: Come back to the Trash after a restart\"; spec/app/files/preview.md, \"Story: Come back to a preview after a restart\")", async () => {
    const world = { ...scene(), phone: true };
    // spec/app/files/recent.md, "The earlier Alpha's Recent is carried over once, while this one is still empty: each document it held access to becomes a row of its own, the newest first; one it held without access, and the document it had open, are not carried"
    localStorage.setItem("alpha.files.recent.v1", JSON.stringify([
      { key: "selected:a", kind: "selected", name: "lease.pdf", mimeType: "application/pdf", openedAt: 2, status: "ready", selectionId: "selection:Download/lease.pdf" },
      { key: "selected:b", kind: "selected", name: "gone.txt", mimeType: "text/plain", openedAt: 3, status: "revoked", selectionId: "b" },
    ]));
    const first = await onFiles(world);
    await until(first.alpha, first.runtime, Recent, (s) => s.rows.length === 1 && s.rows[0]?.origin === "Picked");
    expect(localStorage.getItem("alpha.files.recent.v1")).toBeNull();
    await until(first.alpha, first.runtime, Browser, (s) => s.open && s.storage.status === "Loaded");
    await press("lease.pdf");
    await until(first.alpha, first.runtime, Shown, (s) => s.drawing.status === "Loaded" && s.kind === "Pdf");
    await press("Close");
    await until(first.alpha, first.runtime, Browser, (s) => s.storage.status === "Loaded");
    await press("Internal storage");
    await openRow("Documents");
    await until(first.alpha, first.runtime, Browser, (s) => s.listing.status === "Loaded" && s.trail.length === 2);
    await choose("Name");
    await choose("Grid");
    await press("notes.txt");
    await until(first.alpha, first.runtime, Shown, (s) => s.content.status === "Loaded");
    await first.close();

    // spec/app/files/index.md, "A restart closes Files, keeps the access, the place, the layout and the sort, reports a change cut off as unknown, and tells the agent its waiting requests failed"
    // spec/app/files/recent.md, "A restart ends the folder session, closes the pickers, the viewer and the opening under way, and keeps the list"
    const second = await onFiles(world);
    await until(second.alpha, second.runtime, Browser, (s) => s.open && s.listing.status === "Loaded" && s.trail.length === 2);
    await until(second.alpha, second.runtime, Browser, (s) => s.layout === "Grid" && s.order === "ByName");
    await until(second.alpha, second.runtime, Shown, (s) => s.viewer === 0);
    await until(second.alpha, second.runtime, Recent, (s) => s.rows.length === 2 && s.rows.filter((row) => row.grant === 0).length === 1);

    // spec/app/files/change.md, "A restart reports a change or a share cut off as unknown, the change's items unknown too, and closes the choice and the sheet"
    await select("notes.txt");
    await press("Share");
    await until(second.alpha, second.runtime, Browser, (s) => s.change.panel !== 0);
    await second.close();
    const third = await onFiles(world);
    await until(third.alpha, third.runtime, Browser, (s) => s.open && s.listing.status === "Loaded" && s.change.panel === 0 && s.picked.length === 0);
  });

  it("Delete into the Trash and bring it back (spec/app/files/trash.md, \"Story: Delete into the Trash\"; spec/app/files/trash.md, \"Story: See what is in the Trash\"; spec/app/files/trash.md, \"Story: Bring something back\"; spec/app/files/trash.md, \"Story: Erase for good\")", async () => {
    const { alpha, runtime, world } = await onFiles();
    await until(alpha, runtime, Browser, (s) => s.storage.status === "Loaded");
    await press("Internal storage");
    await press("Download");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.items.length === 2);

    // spec/app/files/index.md, "Deleting shows what goes to the Trash, and only a confirmation of the selection as shown hands it over"
    await select("lease.pdf");
    await press("Delete");
    await pressOnTop("Delete");
    // spec/app/files/trash.md, "Undo, for a moment, brings back exactly what was just deleted and nothing else"
    await until(alpha, runtime, Bin, (s) => s.attempt.outcome === "Confirmed" && s.binned.length === 1);
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.items.length === 1);
    expect(world.files.trash.map((one) => one.was.path)).toEqual(["Download/lease.pdf"]);
    await press("Undo");
    await until(alpha, runtime, Bin, (s) => s.attempt.outcome === "Confirmed" && s.job.kind === "Binning" && s.binned.length === 0);
    expect([world.files.trash.length, paths(world).includes("primary:Download/lease.pdf")]).toEqual([0, true]);

    await choose("Refresh");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.items.length === 2);
    await select("beach.jpg");
    await press("Delete");
    await pressOnTop("Delete");
    await until(alpha, runtime, Bin, (s) => s.binned.length === 1);
    await later(alpha, 5_000);
    expect(button("Undo")).toBeUndefined();

    // spec/app/files/trash.md, "A job ends as its answer says for each item: only what the phone confirmed is done, and the rest was refused or is unknown": a file changed since it was shown is not put in the Trash
    await choose("Refresh");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.items.length === 1);
    await select("lease.pdf");
    const lease = world.files.stored.find((one) => one.path === "Download/lease.pdf");
    if (lease) lease.modified = 77;
    await press("Delete");
    await pressOnTop("Delete");
    await until(alpha, runtime, Bin, (s) => s.attempt.outcome === "Refused" && s.binned.length === 0);
    expect(paths(world).includes("primary:Download/lease.pdf")).toBe(true);

    // spec/app/files/trash.md, "Looking at the Trash reads its list when it is free and Alpha may read the storage; leaving it, or losing access, drops the list but what a job or the moment to undo still holds"
    await press("Files");
    await press("Trash");
    await until(alpha, runtime, Bin, (s) => s.open && s.listing.status === "Loaded");
    // spec/app/files/trash.md, "The owner restores a listed item before its time, from a list read since the last job"
    await press("Restore beach.jpg");
    await until(alpha, runtime, Bin, (s) => s.attempt.outcome === "Confirmed" && s.entries.length === 0 && s.listing.status === "Loaded");
    expect(paths(world).includes("primary:Download/beach.jpg")).toBe(true);

    // spec/app/files/trash.md, "Confirming erases exactly the entries shown"
    world.files.trash.push({ id: "9", was: { volume: "primary", path: "Download/old.txt", directory: false, mimeType: "text/plain", size: 1, modified: 1 }, deletedAt: world.files.now });
    await press("Refresh");
    await until(alpha, runtime, Bin, (s) => s.listing.status === "Loaded" && s.entries.length === 1);
    await press("Erase old.txt");
    await pressOnTop("Erase");
    await until(alpha, runtime, Bin, (s) => s.attempt.outcome === "Confirmed" && s.entries.length === 0);
    expect(world.files.trash).toEqual([]);

    // spec/app/files/trash.md, "A job ends as its answer says for each item: only what the phone confirmed is done, and the rest was refused or is unknown"
    world.files.trash.push({ id: "12", was: { volume: "primary", path: "Download/c.txt", directory: false, mimeType: "text/plain", size: 1, modified: 1 }, deletedAt: world.files.now });
    world.files.refusing.push("storageRestore");
    await press("Refresh");
    await until(alpha, runtime, Bin, (s) => s.listing.status === "Loaded" && s.entries.length === 1);
    await press("Restore c.txt");
    await until(alpha, runtime, Bin, (s) => s.attempt.outcome === "Refused" && s.listing.status === "Loaded");
    world.files.refusing.splice(0);

    // spec/app/files/trash.md, "The owner marks listed entries, one by one or every one, and a mark lasts while its entry is listed and no job has started"
    // spec/app/files/trash.md, "The owner brings back the marked entries that are still kept, together, from a list read since the last job"
    world.files.trash.push({ id: "13", was: { volume: "primary", path: "Download/d.txt", directory: false, mimeType: "text/plain", size: 1, modified: 1 }, deletedAt: world.files.now });
    await press("Refresh");
    await until(alpha, runtime, Bin, (s) => s.listing.status === "Loaded" && s.entries.length === 2);
    await press("Mark c.txt");
    await press("Mark d.txt");
    await press("Restore marked");
    await until(alpha, runtime, Bin, (s) => s.attempt.outcome === "Confirmed" && s.entries.length === 0 && s.listing.status === "Loaded");
    expect(paths(world).filter((path) => path.endsWith("c.txt") || path.endsWith("d.txt"))).toEqual(["primary:Download/c.txt", "primary:Download/d.txt"]);

    // spec/app/files/trash.md, "The owner restores everything listed that is still kept, together, from a list read since the last job"
    world.files.trash.push(
      { id: "10", was: { volume: "primary", path: "Download/a.txt", directory: false, mimeType: "text/plain", size: 1, modified: 1 }, deletedAt: world.files.now },
      { id: "11", was: { volume: "card", path: "b.txt", directory: false, mimeType: "text/plain", size: 1, modified: 1 }, deletedAt: world.files.now },
    );
    await press("Refresh");
    await until(alpha, runtime, Bin, (s) => s.listing.status === "Loaded" && s.entries.length === 2);
    await press("Restore all");
    await until(alpha, runtime, Bin, (s) => s.attempt.outcome === "Confirmed" && s.entries.length === 0 && s.listing.status === "Loaded");
    expect([world.files.trash, paths(world).filter((path) => path.endsWith("a.txt") || path.endsWith("b.txt"))]).toEqual([[], ["card:b.txt", "primary:Download/a.txt"]]);

    // spec/app/files/trash.md, "The owner is shown what will be erased, one item, the marked items or everything listed, and a change to the list voids the confirmation"
    world.files.trash.push(
      { id: "14", was: { volume: "primary", path: "Download/e.txt", directory: false, mimeType: "text/plain", size: 1, modified: 1 }, deletedAt: world.files.now },
      { id: "15", was: { volume: "card", path: "f.txt", directory: false, mimeType: "text/plain", size: 1, modified: 1 }, deletedAt: world.files.now },
    );
    await press("Refresh");
    await until(alpha, runtime, Bin, (s) => s.listing.status === "Loaded" && s.entries.length === 2);
    await press("Empty the Trash");
    await until(alpha, runtime, Bin, (s) => s.erasing.showing && s.doomed.length === 2);
    await pressOnTop("Erase");
    await until(alpha, runtime, Bin, (s) => s.attempt.outcome === "Confirmed" && s.entries.length === 0 && s.listing.status === "Loaded");
    expect(world.files.trash).toEqual([]);
    // spec/app/files/trash.md, "The Trash is closed, without access, reading, unreadable, empty or listing"
    expect(document.body.textContent?.includes("The Trash is empty")).toBe(true);
    await hardware("home");
  });
});

describe("Files in a browser", () => {
  it("Browse my storage (spec/app/files/index.md, \"Story: Browse my storage\")", async () => {
    const world = scene();
    const { alpha } = await open(world, only("home", "view:Files", "notice"));
    const runtime = files.runtime(alpha);
    await press("Files");
    // spec/app/files/index.md, "Files is closed, unsupported, not yet allowed, denied, at the top, reading, unavailable or showing a place"
    await until(alpha, runtime, Browser, (s) => s.open && !s.supported);
    expect(document.querySelector("section[aria-label=Files]")).toBeNull();
  });
});
