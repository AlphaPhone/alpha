// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { Machine as Home } from "../gen/app__home.effect.vibe";
import { Machine as List } from "../gen/app__inbox.effect.vibe";
import { Machine as Shown } from "../gen/app__inbox__message.effect.vibe";
import home from "../src/home/index.tsx";
import inbox from "../src/inbox/index.tsx";
import { closeAll, drawn, only, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const inDialog = (name: string) => [...document.querySelectorAll<HTMLButtonElement>("[role=dialog] button")].filter((one) => one.textContent === name);
const confirm = (name: string) => drawn(() => {
  const found = inDialog(name)[0];
  if (!found) throw new Error(`no ${name} in the review`);
  found.click();
});
const told = () => document.querySelector("[role=dialog]")?.textContent ?? "";

// spec/app/inbox/message.md, "An attachment is reviewed before it is opened or saved, and one use is in flight at a time"; spec/app/inbox/message.md, "A review opened for opening also saves the same attachment, once, under the same rules"
it("Save an attachment from inside its review, with one button per attachment", async () => {
  const world = { ...scene(), phone: true };
  const text = "Review agenda";
  const termSheet = world.inbox.mail.find(({ card }) => card.id === "g1");
  if (!termSheet) throw new Error("Missing mailbox fixture");
  termSheet.files = [{ partId: "2", name: "agenda.txt", mimeType: "text/plain", size: new TextEncoder().encode(text).byteLength, supported: true }];
  termSheet.attachmentData = { "2": new TextEncoder().encode(text) };
  const { alpha } = await open(world, only("home", "view:Inbox"));
  const runtime = inbox.runtime(alpha);
  await until(alpha, home.runtime(alpha), Home, (s) => s.tiles.load.status === "Loaded");
  await drawn(() => {
    const tile = document.querySelector<HTMLButtonElement>("[data-home-tile='view:Inbox']");
    if (!tile) throw new Error("no Inbox tile on Home");
    tile.click();
  });
  await until(alpha, runtime, List, (s) => s.list.status === "Loaded");
  await drawn(() => {
    const row = [...document.querySelectorAll<HTMLButtonElement>("ul[aria-label='Email messages'] button")].find((one) => one.querySelector("[data-inbox-subject]")?.textContent === "Revised term sheet");
    if (!row) throw new Error("no message Revised term sheet");
    row.click();
  });
  await until(alpha, runtime, Shown, (s) => s.body.status === "Loaded" && s.revision > 0);

  // spec/app/inbox/message.md, "An attachment is reviewed before it is opened or saved, and one use is in flight at a time": the attachment is one button, with no separate save beside it
  await drawn(() => expect([...document.querySelectorAll("button")].filter((one) => one.textContent?.includes("agenda.txt") || one.getAttribute("aria-label")?.includes("agenda.txt"))).toHaveLength(1));
  await press(/^Open\s*agenda\.txt/);
  await until(alpha, runtime, Shown, (s) => s.attachment === 1 && s.handling === "Opening");
  await confirm("Open");
  await until(alpha, runtime, Shown, (s) => s.file.outcome === "Confirmed");
  expect([world.inbox.savedAttachments.size, document.querySelector("[aria-label='Attachment contents']")?.textContent]).toEqual([0, text]);

  // spec/app/inbox/message.md, "An attachment use ends as its own answer says, or unknown": backing out of Android's picker writes nothing, says "Save cancelled." as v119 did, and offers Save as… again
  world.inbox.pickerCancels = 1;
  await confirm("Save as…");
  await until(alpha, runtime, Shown, (s) => s.keep.outcome === "Refused" && s.cancelled === s.keep.id);
  await drawn(() => expect([...document.querySelectorAll("[role=dialog] [role=status]")].map((one) => one.textContent)).toEqual(["Save cancelled."]));
  expect([world.inbox.savedAttachments.size, told().includes("Could not save it"), inDialog("Save as…").map((one) => one.disabled)]).toEqual([0, false, [false]]);

  await confirm("Save as…");
  await until(alpha, runtime, Shown, (s) => s.keep.outcome === "Confirmed");
  await drawn(() => expect(told()).toContain("Saved."));
  const status = [...document.querySelectorAll("[role=dialog] [role=status]")].find((one) => one.textContent === "Saved.");
  const contents = document.querySelector("[aria-label='Attachment contents']");
  expect(Boolean(status && contents && status.compareDocumentPosition(contents) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  expect([world.inbox.savedAttachments.get("agenda.txt"), document.querySelector("[aria-label='Attachment contents']")?.textContent, inDialog("Save as…").map((one) => one.disabled)])
    .toEqual([text, text, [true]]);
  await confirm("Close");
  await until(alpha, runtime, Shown, (s) => s.attachment === 0);
});
