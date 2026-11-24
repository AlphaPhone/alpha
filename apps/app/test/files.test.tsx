// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Browser } from "../gen/app__files.effect.vibe";
import { Machine as Shown } from "../gen/app__files__preview.effect.vibe";
import { Machine as Recent } from "../gen/app__files__recent.effect.vibe";
import { Machine as Bin } from "../gen/app__files__trash.effect.vibe";
import { showDownloads } from "../src/files/files.vibe";
import files from "../src/files/index.tsx";
import { button, closeAll, fill, hardware, later, open, press, pressOnTop, seen, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const listed = () => [...document.querySelectorAll("[aria-label=Listed] button:not([role=checkbox])")].map((row) => row.textContent);
const paths = (world: ReturnType<typeof scene>) => world.files.stored.map((one) => `${one.volume}:${one.path}`).sort();
const select = (name: string) => press(`Select ${name}`);
const buttonOnTop = (name: string) => [...([...document.querySelectorAll("[role=dialog]")].at(-1)?.querySelectorAll("button") ?? [])].find((one) => (one.getAttribute("aria-label") ?? one.textContent) === name);

/** Alpha on a phone with Files on screen, its storage read. */
async function onFiles(world = { ...scene(), phone: true }) {
  const running = await open(world);
  const { alpha } = running;
  const runtime = files.runtime(alpha);
  await press("Files");
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
    await press("Documents");
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
    await press("Refresh");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.items.length === 0);
    expect([document.body.textContent?.includes("Nothing here"), document.body.textContent?.includes("Only part of this place could be read")]).toEqual([false, true]);
    world.files.listMost = 5_000;

    // spec/app/files/index.md, "The place showing is read again when asked, and only its newest answer is taken; a folder that no longer exists brings the owner back to the top and says so, never that the storage is unavailable"
    await press("Files");
    await press("Internal storage");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded");
    await press("Documents");
    await press("Old");
    // spec/app/files/index.md, "The place showing is read again when asked, and only its newest answer is taken; a folder that no longer exists brings the owner back to the top and says so, never that the storage is unavailable": the phone watches the folder showing
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.trail.length === 3 && world.files.watching === "primary:Documents/Old");
    world.files.stored.splice(world.files.stored.findIndex((one) => one.path === "Documents/Old"), 1);
    world.files.changed();
    await until(alpha, runtime, Browser, (s) => s.missing && world.files.watching === undefined);
    expect(Boolean(button("Internal storage"))).toBe(true);
  });

  it("Browse my storage from the Browser's Show in Files, and go back (spec/app/files/index.md, \"Story: Browse my storage\")", async () => {
    const { alpha, runtime, world } = await onFiles();
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
    await runtime.runPromise(showDownloads);
    await until(alpha, runtime, Browser, (s) => s.open && s.handed && s.trail.length === 2 && s.listing.status === "Loaded");
    expect(listed().sort()).toEqual(["beach.jpg", "lease.pdf"]);
    await hardware("back");
    await until(alpha, runtime, Browser, (s) => !s.open);

    world.files.stored.splice(world.files.stored.findIndex((one) => one.path === "Download"), 1);
    await runtime.runPromise(showDownloads);
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

  it("Arrange and filter what I see (spec/app/files/index.md, \"Story: Arrange and filter what I see\")", async () => {
    const { alpha, runtime, world } = await onFiles();
    await until(alpha, runtime, Browser, (s) => s.storage.status === "Loaded");
    await press("Internal storage");
    await press("Download");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.items.length === 2);
    // spec/app/files/index.md, "The owner chooses a grid or a list, and a sort; choosing the same sort again reverses it"
    await press("Name");
    expect(listed()).toEqual(["beach.jpg", "lease.pdf"]);
    await press("Name");
    expect(listed()).toEqual(["lease.pdf", "beach.jpg"]);
    await press("Size");
    expect(listed()).toEqual(["beach.jpg", "lease.pdf"]);
    await press("Size");
    expect(listed()).toEqual(["lease.pdf", "beach.jpg"]);
    // spec/app/files/index.md, "The owner sets a filter of a kind and a text for the place showing, as a chip the owner sees and clears; only what matches both is shown"
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
    await press("Refresh");
    await until(alpha, runtime, Browser, (s) => s.search.query.status === "Loaded" && s.search.hits.length === 2);
    world.files.stored.pop();
    await press("Clear the filter");
    await until(alpha, runtime, Browser, (s) => !s.search.searching);

    // spec/app/files/index.md, "The place showing is read again when asked, and only its newest answer is taken; a folder that no longer exists brings the owner back to the top and says so, never that the storage is unavailable": coming back to Alpha reads the place again
    await seen(false);
    world.files.stored.push({ volume: "primary", path: "Download/new.txt", directory: false, mimeType: "text/plain", size: 1, modified: 9 });
    await seen(true);
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.items.length === 3);
  });

  it("Change my files (spec/app/files/index.md, \"Story: Change my files\")", async () => {
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
    await press("New folder");
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
    await select("dunes.jpg");
    await press("Share");
    await press("Copy");
    await until(alpha, runtime, Browser, (s) => s.change.sending.outcome === "Confirmed" && s.change.sentTo === "Copy");
    expect(await navigator.clipboard.readText()).toBe("Internal storage/Download/dunes.jpg");

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

  it("Look at a file, and find what I opened lately (spec/app/files/preview.md, \"Story: Look at a file\"; spec/app/files/recent.md, \"Story: Find what I opened lately\")", async () => {
    const { alpha, runtime, world } = await onFiles();
    await until(alpha, runtime, Browser, (s) => s.storage.status === "Loaded");
    await press("Internal storage");
    await press("Documents");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.trail.length === 2);
    // spec/app/files/index.md, "The owner opens a file that is listed or found, with the names beside it, and Recent remembers it"
    // spec/app/files/preview.md, "What was read of a file is shown only in its own viewer, while it can be read"
    await press("notes.txt");
    await until(alpha, runtime, Shown, (s) => s.content.status === "Loaded" && s.kind === "Text");
    expect(document.querySelector("pre")?.textContent).toBe("The words of notes.txt");
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
    await press("Open elsewhere");
    await until(alpha, runtime, Shown, () => world.files.opened.includes("selection:Download/lease.pdf"));
    // spec/app/files/preview.md, "Forget removes the file from Recent, with or without access, and closes the viewer"
    await press("Forget");
    await until(alpha, runtime, Recent, (s) => s.rows.length === 1 && s.shown.grant === 0);
    expect(world.files.forgotten).toEqual(["selection:Download/lease.pdf"]);

    // spec/app/files/recent.md, "Opening a row again asks the phone first: it opens, moves to the front and is the document open, or its access has ended and it must be selected again, or its provider cannot be reached and it stays"
    await press("Files");
    await press("notes.txt");
    await until(alpha, runtime, Shown, (s) => s.content.status === "Loaded" && s.kind === "Text");
    await press("Close");
    await until(alpha, runtime, Shown, (s) => s.viewer === 0);
    world.files.forgotten.push("selection:Documents/notes.txt");
    await press("notes.txt");
    await until(alpha, runtime, Recent, (s) => s.reaching.status === "Failed" && s.rows.every((row) => row.grant === 0));
    expect(button("notes.txt")).toBeUndefined();
  });

  it("Come back after a restart (spec/app/files/index.md, \"Story: Come back after a restart\"; spec/app/files/trash.md, \"Story: Come back to the Trash after a restart\"; spec/app/files/preview.md, \"Story: Come back to a preview after a restart\")", async () => {
    const world = { ...scene(), phone: true };
    const first = await onFiles(world);
    await until(first.alpha, first.runtime, Browser, (s) => s.storage.status === "Loaded");
    await press("Internal storage");
    await press("Documents");
    await until(first.alpha, first.runtime, Browser, (s) => s.listing.status === "Loaded" && s.trail.length === 2);
    await press("Name");
    await press("Grid");
    await press("notes.txt");
    await until(first.alpha, first.runtime, Shown, (s) => s.content.status === "Loaded");
    await first.close();

    // spec/app/files/index.md, "A restart closes Files, keeps the access, the place, the layout and the sort, reports a change cut off as unknown, and tells the agent its waiting requests failed"
    // spec/app/files/recent.md, "A restart ends the folder session, closes the pickers, the viewer and the opening under way, and keeps the list"
    const second = await onFiles(world);
    await until(second.alpha, second.runtime, Browser, (s) => s.open && s.listing.status === "Loaded" && s.trail.length === 2);
    await until(second.alpha, second.runtime, Browser, (s) => s.layout === "Grid" && s.order === "ByName");
    await until(second.alpha, second.runtime, Shown, (s) => s.viewer === 0);
    await until(second.alpha, second.runtime, Recent, (s) => s.rows.length === 1 && s.rows.every((row) => row.grant === 0));
  });

  it("Delete into the Trash and bring it back (spec/app/files/trash.md, \"Story: Delete into the Trash\"; spec/app/files/trash.md, \"Story: Bring something back\"; spec/app/files/trash.md, \"Story: Erase for good\")", async () => {
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

    await press("Refresh");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.items.length === 2);
    await select("beach.jpg");
    await press("Delete");
    await pressOnTop("Delete");
    await until(alpha, runtime, Bin, (s) => s.binned.length === 1);
    await later(alpha, 5_000);
    expect(button("Undo")).toBeUndefined();

    // spec/app/files/trash.md, "A job ends as its answer says for each item: only what the phone confirmed is done, and the rest was refused or is unknown": a file changed since it was shown is not put in the Trash
    await press("Refresh");
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
    await hardware("home");
  });
});

describe("Files in a browser", () => {
  it("Browse my storage (spec/app/files/index.md, \"Story: Browse my storage\")", async () => {
    const world = scene();
    const { alpha } = await open(world);
    const runtime = files.runtime(alpha);
    await press("Files");
    // spec/app/files/index.md, "Files is closed, unsupported, not yet allowed, denied, at the top, reading, unavailable or showing a place"
    await until(alpha, runtime, Browser, (s) => s.open && !s.supported);
    expect(document.querySelector("section[aria-label=Files]")).toBeNull();
  });
});
