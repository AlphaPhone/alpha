// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { Machine as Library } from "../gen/app__photos.effect.vibe";
import { Machine as Viewer } from "../gen/app__photos__viewer.effect.vibe";
import { Machine as Messages } from "../gen/app__messages.effect.vibe";
import { Machine as Inbox } from "../gen/app__inbox.effect.vibe";
import { Machine as Adding } from "../gen/app__inbox__adding.effect.vibe";
import inbox from "../src/inbox/index.tsx";
import { Incoming } from "../src/inbox/adding.vibe";
import { Machine as MessageComposer } from "../gen/app__messages__composer.effect.vibe";
import { Drafts as MessageDrafts } from "../src/messages/composer.vibe";
import { photosArea } from "../src/photos/index.tsx";
import { button, closeAll, drawn, fill, hardware, only, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import type { FixturePicture } from "./fakes/photos.ts";

underAct();
afterEach(closeAll);

const photoAction = async (label: string) => {
  await drawn(() => {
    const menu = button("Photo actions");
    if (!menu) throw new Error("No Photo actions menu");
    menu.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  });
  await drawn(() => {
    const item = [...document.querySelectorAll<HTMLElement>("[role=menuitem]")].find((option) => option.textContent === label);
    if (!item) throw new Error(`No ${label} photo action`);
    item.click();
  });
};

it("Allow Photos and browse the library (spec/app/photos/index.md, \"Story: Give Photos access\"; spec/app/photos/index.md, \"Story: Browse the library\"; spec/app/photos/viewer.md, \"Story: Look at a photo or video\"; spec/app/photos/viewer.md, \"Story: Edit a photo or trim a video\")", async () => {
  const world = { ...scene(), phone: true, now: 1795400000000 + 86_400_000 + 240_000 };
  const { alpha } = await open(world, only("home", "view:Photos", "notice"));
  await press("Photos");
  const runtime = photosArea.runtime(alpha);
  await until(alpha, runtime, Library, (state) => state.library.status === "Loaded" && state.rows.length === 1);
  expect([Boolean(button("Camera.jpg")), Boolean(button("Park.jpg"))]).toEqual([true, false]);

  await press("Allow access");
  await until(alpha, runtime, Library, (state) => state.library.status === "Loaded" && state.access.grant === "Granted");
  await press("Show more");
  await until(alpha, runtime, Library, (state) => state.library.status === "Loaded" && state.rows.length === 3);
  // spec/app/photos/index.md, "Story: Browse the library": the Library is headed by day as v121 headed it, counted back from Alpha's time
  expect([...document.querySelectorAll("[data-alpha-app-scroll=photos] section h2")].map((heading) => heading.textContent)).toEqual(["Yesterday"]);

  await press("Park.jpg");
  await until(alpha, runtime, Viewer, (state) => state.read.status === "Loaded");
  await press("Next photo");
  await until(alpha, runtime, Viewer, (state) => state.read.status === "Loaded" && state.read.ticket === 2);
  expect(world.photos.readCount).toBe(2);

  await press("Edit");
  await until(alpha, runtime, Viewer, (state) => state.editing && state.preview.showing);
  await press("Noir");
  await until(alpha, runtime, Viewer, (state) => state.edit.look === "Noir" && state.preview.showing);
  await press("Save copy");
  await until(alpha, runtime, Viewer, (state) => state.save.outcome === "Confirmed");
  expect([world.photos.saves, world.photos.rows.some((item) => item.name === "Camera.jpg")]).toEqual([["noir"], true]);

  await drawn(() => {
    world.photos.access = { scope: "denied", images: "denied", videos: "denied" };
    world.photos.changed();
  });
  await until(alpha, runtime, Library, (state) => state.access.grant === "Denied" && state.library.status === "Loaded" && state.rows.length === 2);
  await until(alpha, runtime, Viewer, (state) => state.open === 0);
  expect([Boolean(button("Camera.jpg")), Boolean(button("Park.jpg")), world.photos.promptCount]).toEqual([true, false, 1]);
  await hardware("back");
  await until(alpha, runtime, Library, (state) => !state.visible);
});

it('Use a photo in Messages from its still-open viewer (spec/app/photos/viewer.md, "Use in Messages offers the exact readable original of a permitted photo"; spec/app/messages/index.md, "A picture from Files is offered in a new recipient picker and can join only its chosen empty draft")', async () => {
  const world = { ...scene(), phone: true, image: true };
  world.photos.access = { scope: "full", images: "full", videos: "denied" };
  const source = world.photos.rows[0];
  if (!source) throw new Error("No fixture picture");
  const dataBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=";
  const binary = atob(dataBase64);
  source.name = "Original fixture.png";
  source.size = binary.length;
  source.mutationRevision = source.revision;
  const received: FixturePicture = { name: source.name, mimeType: "image/png", size: binary.length, dataBase64 };
  const started = Promise.withResolvers<void>();
  const late = Promise.withResolvers<FixturePicture>();
  world.photos.selectedPicture = () => { started.resolve(); return late.promise; };
  const { alpha } = await open(world, only("home", "view:Photos", "view:Messages", "notice"));
  const runtime = photosArea.runtime(alpha);
  await press("Photos");
  await until(alpha, runtime, Library, (state) => state.library.status === "Loaded");
  const openPicture = async () => {
    await press(source.name);
    await until(alpha, runtime, Viewer, (state) => state.read.status === "Loaded");
  };
  await openPicture();
  await photoAction("Use in Messages");
  await started.promise;
  await press("Back to photos");
  await until(alpha, runtime, Viewer, (state) => state.open === 0);
  await openPicture();
  await drawn(async () => { late.resolve(received); await late.promise; });
  expect(alpha.runtime.runSync(Messages.use((messages) => messages.get())).offeredPicture).toBe(0);

  world.photos.selectedPicture = () => Promise.resolve(received);
  await photoAction("Use in Messages");
  await until(alpha, alpha.runtime, Messages, (state) => state.pane === "Picker" && state.offeredPicture > 0);
  expect(document.querySelector("[aria-label='Picture for this message']")?.textContent).toContain(source.name);
  await fill("To", "+15550123456");
  await press("Text +15550123456");
  await until(alpha, alpha.runtime, MessageComposer, (state) => state.pictures === 1);
  expect(alpha.runtime.runSync(MessageDrafts.use((drafts) => drafts.pictures()))).toEqual([
    { name: source.name, wireName: "picture-1.png", contentType: "image/png", bytes: Uint8Array.from(binary, (byte) => byte.charCodeAt(0)) },
  ]);
  expect(world.telephony.sent).toEqual([]);
});

it('Offer the original photo for Inbox to review (spec/app/photos/viewer.md, "Story: Share what I am looking at"; spec/app/inbox/adding.md, "A file handed over from Files or Photos is shown to the owner before it joins the draft open, or starts a new message from the account given, and only where it fits")', async () => {
  const world = { ...scene(), phone: true };
  world.photos.access = { scope: "full", images: "full", videos: "denied" };
  const source = world.photos.rows[0];
  if (!source) throw new Error("No fixture photo");
  const dataBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=";
  source.name = "Owner original.png";
  source.size = atob(dataBase64).length;
  source.mutationRevision = source.revision;
  world.photos.selectedPicture = () => Promise.resolve({ name: source.name, mimeType: "image/png", size: source.size, dataBase64 });
  const { alpha } = await open(world, only("home", "view:Photos", "view:Inbox", "notice"));
  await press("Inbox");
  const letters = inbox.runtime(alpha);
  await until(alpha, letters, Inbox, (state) => state.list.status === "Loaded" && state.selected.account !== 0);
  await hardware("back");
  await press("Photos");
  const runtime = photosArea.runtime(alpha);
  await until(alpha, runtime, Library, (state) => state.library.status === "Loaded");
  await press(source.name);
  await until(alpha, runtime, Viewer, (state) => state.read.status === "Loaded");
  await photoAction("Email");
  await until(alpha, letters, Adding, (state) => state.thing !== 0);
  expect(letters.runSync(Incoming.use((incoming) => incoming.file()))).toEqual({
    source: "Photos", attached: { name: source.name, mimeType: "image/png", size: source.size, data: dataBase64 },
  });
  expect([world.inbox.changes, world.inbox.attached, world.inbox.drafts.size]).toEqual([[], [], 0]);
});

it("Resume an already-sent photo edit from an older viewer record (spec/app/photos/viewer.md, \"A restart forgets the viewer but keeps the save; a save still on its way is no longer trusted, and is looked up\")", async () => {
  const kept = "alpha/app/photos/viewer@1";
  const operationId = "alpha-test-photo-edit";
  localStorage.setItem(kept, JSON.stringify({
    visible: true, secure: false, scope: [], open: 1, openedBy: "Owner", listed: true,
    read: { status: "Loaded", ticket: 1 }, kind: "Still", duration: 0, revision: 1, favourite: false, gone: false,
    zoom: 1, playing: false, position: 0, info: false, editing: true,
    edit: { turns: 1, cropped: false, look: "Original", start: 0, end: 0 },
    preview: { showing: false, revision: 2, shown: 2 }, unavailable: false, refusal: "NoRefusal", replace: false,
    save: { id: 4, outcome: "Sent" }, attempts: 4, lookup: { status: "Idle", ticket: 0 }, found: false, restored: false,
  }));
  localStorage.setItem(kept + ".epoch", "earlier-viewer");
  localStorage.setItem("alpha/photos/edit/4", operationId);

  const world = { ...scene(), phone: true };
  const { alpha } = await open(world, only("home", "view:Photos", "notice"));
  await press("Photos");
  await until(alpha, photosArea.runtime(alpha), Viewer, (state) => state.lookup.status === "Loaded" && state.found &&
    state.attempts === 4 && state.open === 0 && state.origin === "LibraryItem");
  expect(world.photos.editLookups).toEqual([operationId]);
  expect(world.photos.saves).toEqual([]);
  expect(localStorage.getItem(kept + ".epoch")).toBe("earlier-viewer");
  expect(localStorage.getItem("alpha/photos/edit/4")).toBe(operationId);
  expect(localStorage.getItem(kept + ".unreadable")).toBeNull();
});
