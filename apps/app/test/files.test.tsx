// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Browser } from "../gen/app__files.effect.vibe";
import { Machine as Bin } from "../gen/app__files__trash.effect.vibe";
import files from "../src/files/index.tsx";
import { button, closeAll, fill, hardware, later, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const listed = () => [...document.querySelectorAll("[aria-label=Listed] button, [aria-label=Listed] [role=button]")].map((row) => row.textContent);
const paths = (world: ReturnType<typeof scene>) => world.files.stored.map((one) => `${one.volume}:${one.path}`).sort();
const select = (name: string) => press(`Select ${name}`);

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

    // spec/app/files/index.md, "The owner opens a volume, a category, a listed folder, a step of the path, or goes back to the top; a category lists exactly the files of its kind"
    await press("Internal storage");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded");
    expect(listed().sort()).toEqual(["Documents", "Download"]);
    await press("Documents");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.trail.length === 2);
    expect(listed().sort()).toEqual(["Old", "notes.txt"]);
    // The path starts at the volume's root, which is a step of its own.
    await press("Internal storage");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.trail.length === 1);
    await press("Files");
    await press("Images");
    await until(alpha, runtime, Browser, (s) => s.inCategory && s.listing.status === "Loaded");
    expect(listed()).toEqual(["beach.jpg"]);

    // spec/app/files/index.md, "The place showing is read again when asked, and only its newest answer is taken; a folder that no longer exists brings the owner back to the top and says so, never that the storage is unavailable"
    await press("Files");
    await press("Internal storage");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded");
    await press("Documents");
    await press("Old");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.trail.length === 3);
    world.files.stored.splice(world.files.stored.findIndex((one) => one.path === "Documents/Old"), 1);
    world.files.changed();
    await until(alpha, runtime, Browser, (s) => s.missing);
    expect(Boolean(button("Internal storage"))).toBe(true);
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
    const { alpha, runtime } = await onFiles();
    await until(alpha, runtime, Browser, (s) => s.storage.status === "Loaded");
    await press("Internal storage");
    await press("Download");
    await until(alpha, runtime, Browser, (s) => s.listing.status === "Loaded" && s.items.length === 2);
    // spec/app/files/index.md, "The owner chooses a grid or a list, and a sort; choosing the same sort again reverses it"
    await press("Name");
    expect(listed()).toEqual(["beach.jpg", "lease.pdf"]);
    await press("Name");
    expect(listed()).toEqual(["lease.pdf", "beach.jpg"]);
    // spec/app/files/index.md, "The owner sets a filter of a kind and a text for the place showing, as a chip the owner sees and clears; only what matches both is shown"
    await fill("Filter", "LEASE");
    await press("Filter");
    await until(alpha, runtime, Browser, (s) => s.search.query.status === "Loaded");
    expect(runtime.runSync(Browser.use((m) => m.get())).search.hits.map((hit) => hit.name)).toEqual(["lease.pdf"]);
    await press("Clear the filter");
    await until(alpha, runtime, Browser, (s) => !s.search.searching);
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
    await press("Internal storage");
    await until(alpha, runtime, Browser, (s) => s.sheet.reading.status === "Loaded");
    await press("Documents");
    await until(alpha, runtime, Browser, (s) => s.sheet.reading.status === "Loaded" && s.sheet.trail.length === 2);
    await press("Move here");
    // spec/app/files/index.md, "A change ends as its answer says, what a move took away is told, and the place is read again"
    await until(alpha, runtime, Browser, (s) => s.change.attempt.outcome === "Confirmed" && s.listing.status === "Loaded");
    expect([listed(), paths(world).includes("primary:Documents/lease.pdf")]).toEqual([["beach.jpg"], true]);

    // spec/app/files/change.md, "A change starts when none is under way and nothing of it is still unknown; when names clash in the destination the owner is asked first, and an approved request keeps both"
    await select("beach.jpg");
    await press("Move or copy");
    await press("Internal storage");
    await until(alpha, runtime, Browser, (s) => s.sheet.reading.status === "Loaded");
    await press("Download");
    await until(alpha, runtime, Browser, (s) => s.sheet.reading.status === "Loaded" && s.sheet.trail.length === 2);
    await press("Copy here");
    await until(alpha, runtime, Browser, (s) => s.change.clash.showing);
    await press("Keep both");
    await until(alpha, runtime, Browser, (s) => s.change.attempt.outcome === "Confirmed" && s.listing.status === "Loaded");
    expect(listed().sort()).toEqual(["beach.jpg", "beach.jpg (2)"]);

    // spec/app/files/index.md, "One request leaves for each change, for items listed as they are now or the file shown, and only when the owner starts, chooses or renames it, or approved it"
    await press("New folder");
    await fill("Name", "Taxes");
    await press("Make");
    await until(alpha, runtime, Browser, (s) => s.change.work === "NewFolder" && s.change.attempt.outcome === "Confirmed" && s.listing.status === "Loaded");
    await select("beach.jpg (2)");
    await press("Rename");
    await fill("Name", "Taxes");
    expect(button("Rename")?.hasAttribute("disabled")).toBe(true);
    await fill("Name", "dunes.jpg");
    await press("Rename");
    await until(alpha, runtime, Browser, (s) => s.change.work === "Rename" && s.change.attempt.outcome === "Confirmed" && s.listing.status === "Loaded");
    expect(listed().sort()).toEqual(["Taxes", "beach.jpg", "dunes.jpg"]);

    // spec/app/files/index.md, "The owner opens the share sheet for a selection of one to a hundred files and no folder while none is open, shares from it, and Android says whether it could open it"
    await select("dunes.jpg");
    await press("Share");
    await press("Share to an app");
    await until(alpha, runtime, Browser, (s) => s.change.sending.outcome === "Confirmed");
    expect(world.files.shared).toEqual([["Download/dunes.jpg"]]);
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
    await press("Delete");
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
    await press("Delete");
    await until(alpha, runtime, Bin, (s) => s.binned.length === 1);
    await later(alpha, 5_000);
    expect(button("Undo")).toBeUndefined();

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
    await press("Erase");
    await until(alpha, runtime, Bin, (s) => s.attempt.outcome === "Confirmed" && s.entries.length === 0);
    expect(world.files.trash).toEqual([]);
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
