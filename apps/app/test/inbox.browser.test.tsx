import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { closeAll, only, open } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import "../src/main.css";

afterEach(closeAll);

it("Review an attachment and save the copy in Files (spec/app/inbox/message.md, \"An attachment is reviewed before it is opened or saved, and one use is in flight at a time\"; spec/app/inbox/message.md, \"An attachment use ends as its own answer says, or unknown\")", async () => {
  await page.viewport(390, 844);
  const world = scene();
  const message = world.inbox.mail.find(({ card }) => card.id === "g1");
  if (!message) throw new Error("Missing mail fixture");
  const name = `Inbox receipt ${crypto.randomUUID().slice(0, 8)}.png`;
  const raw = atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC0cAAAAASUVORK5CYII=");
  const bytes = Uint8Array.from(raw, (character) => character.charCodeAt(0));
  message.files = [{ partId: "1", name, mimeType: "image/png", size: bytes.length, supported: true }];
  message.attachmentData = { "1": bytes };

  await open(world, only("home", "view:Inbox", "view:Files", "assistant"));
  await page.getByRole("button", { name: "Inbox", exact: true }).click();
  await page.getByRole("button", { name: /Revised term sheet/ }).click();
  const reader = page.getByRole("button", { name: /^Open Inbox receipt / });
  await reader.click();
  const opening = page.getByRole("dialog", { name: "Open this file?" });
  expect(world.inbox.attachmentReads).toEqual([]);
  await opening.getByRole("button", { name: "Open", exact: true }).click();
  const preview = page.getByRole("dialog", { name });
  const image = preview.getByRole("img", { name });
  await expect.element(image).toBeVisible();
  const rendered = image.element();
  if (!(rendered instanceof HTMLImageElement)) throw new Error("Missing rendered attachment");
  await rendered.decode();
  const previewUrl = rendered.src;
  expect([rendered.naturalWidth, world.inbox.attachmentReads]).toEqual([1, ["g1/1"]]);
  await preview.getByRole("button", { name: "Close", exact: true }).click();
  await expect.poll(async () => fetch(previewUrl).then(() => false, () => true)).toBe(true);

  await page.getByRole("button", { name: `Save ${name}`, exact: true }).click();
  const saving = page.getByRole("dialog", { name: "Save this file?" });
  await saving.getByRole("button", { name: "Save", exact: true }).click();
  await expect.element(saving.getByRole("status")).toHaveTextContent("Saved to Files");
  await saving.getByRole("button", { name: "Close", exact: true }).click();

  await page.getByRole("button", { name: "Back to the list", exact: true }).click();
  await page.getByRole("button", { name: "Back to apps", exact: true }).click();
  await page.getByRole("button", { name: "Files", exact: true }).click();
  await page.getByRole("button", { name: "Internal storage", exact: true }).click();
  await expect.element(page.getByText(name, { exact: true })).toBeVisible();
  expect(world.inbox.attachmentReads).toEqual(["g1/1", "g1/1"]);
});
