import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { closeAll, coverLifted, only, open } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import "../src/main.css";

afterEach(closeAll);

// spec/app/shell/keyboard.md, "Story: Read everything at the text size I chose"; spec/app/inbox/message.md, "Story: Read a message"
it("Keep a message and its list on a wide phone canvas", async () => {
  await page.viewport(1280, 800);
  const world = { ...scene(), phone: true };
  const { alpha } = await open(world, only("home", "view:Inbox", "assistant"));
  await coverLifted(alpha);
  await page.getByRole("button", { name: /^Inbox(?![A-Za-z])/ }).click();
  const subviewElement = async (name: string) => {
    const selector = `[data-alpha-subview="${name}"]`;
    await expect.poll(() => document.querySelector(selector), { timeout: 10_000 }).toBeInstanceOf(HTMLElement);
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Inbox did not draw ${name}`);
    return element;
  };
  const listEl = await subviewElement("inbox-list");
  const row = page.elementLocator(listEl).getByRole("button", { name: /Standup notes/ });
  await row.click();
  const readerEl = await subviewElement("inbox-detail");
  const reader = page.elementLocator(readerEl);
  await expect.element(reader.getByText(/Quick notes from standup/)).toBeVisible();
  const listAfter = page.elementLocator(listEl);
  const rowAfter = listAfter.getByRole("button", { name: /Standup notes/ });
  await expect.element(rowAfter).toHaveAttribute("aria-current", "true");
  await expect.poll(() => {
    const columns = [listEl, readerEl].map((pane) => pane.getBoundingClientRect());
    const [left, right] = columns;
    return Boolean(left && right && left.width >= 300 && left.right <= right.left && right.width > 400);
  }).toBe(true);

  await page.viewport(412, 915);
  await expect.poll(() => listEl.hasAttribute("inert")).toBe(true);
  await expect.element(reader.getByText(/Quick notes from standup/)).toBeVisible();
  await expect.poll(() => readerEl.contains(document.activeElement)).toBe(true);
  await reader.getByRole("button", { name: "Back to the list", exact: true }).click();
  await expect.element(rowAfter).toHaveFocus();
  expect(world.inbox.changes).toEqual([]);
});

function twoPagePdf(): Uint8Array<ArrayBuffer> {
  const pages = [120, 160].map((width) => `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} 200] >>`);
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>", ...pages];
  let document = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = document.length;
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  return new TextEncoder().encode(`${document}xref\n0 5\n0000000000 65535 f \n${xref}trailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n${document.length}\n%%EOF\n`);
}

// spec/app/inbox/message.md, "An attachment is reviewed before it is opened or saved, and one use is in flight at a time"; spec/app/inbox/message.md, "A review opened for opening also saves the same attachment, once, under the same rules"; spec/app/inbox/message.md, "An attachment use ends as its own answer says, or unknown"; spec/app/inbox/message.md, "A reviewed PDF turns one page at a time under a new draw ticket, and shows only the page drawn for that review"
it("Review an attachment and save the copy in Files", async () => {
  await page.viewport(390, 844);
  const world = scene();
  const message = world.inbox.mail.find(({ card }) => card.id === "g1");
  if (!message) throw new Error("Missing mail fixture");
  const name = `Inbox receipt ${crypto.randomUUID().slice(0, 8)}.png`;
  const raw = atob("iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAAH0lEQVR4nGMwTz1AFcQwatCoQaMGjRo0atCoQQNvEADDgg8uFeV++AAAAABJRU5ErkJggg==");
  const bytes = Uint8Array.from(raw, (character) => character.charCodeAt(0));
  const pdf = twoPagePdf();
  message.files = [
    { partId: "1", name, mimeType: "image/png", size: bytes.length, supported: true },
    { partId: "2", name: "Meeting notes.pdf", mimeType: "application/pdf", size: pdf.length, supported: true },
  ];
  message.attachmentData = { "1": bytes, "2": pdf };

  const { alpha } = await open(world, only("home", "view:Inbox", "view:Files", "assistant"));
  await coverLifted(alpha);
  // spec/app/home/tiles.md, "Only Phone, Messages, Inbox, Telegram and Slack carry a badge, only when something waits there, and no tile does while Home is being edited": the tile's name is its app's, with what waits there said after it
  await page.getByRole("button", { name: /^Inbox(?![A-Za-z])/ }).click();
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
  expect([rendered.naturalWidth, world.inbox.attachmentReads]).toEqual([24, ["g1/1"]]);
  await preview.getByRole("button", { name: "Save", exact: true }).click();
  await expect.element(preview.getByRole("status")).toHaveTextContent("Saved to Files");
  await expect.element(image).toBeVisible();
  await preview.getByRole("button", { name: "Close", exact: true }).click();
  await expect.poll(async () => fetch(previewUrl).then(() => false, () => true)).toBe(true);

  await page.getByRole("button", { name: /^Open Meeting notes\.pdf/ }).click();
  await opening.getByRole("button", { name: "Open", exact: true }).click();
  const pdfReview = page.getByRole("dialog", { name: "Meeting notes.pdf" });
  await expect.element(pdfReview.getByRole("img", { name: "Page 1 of 2" })).toHaveAttribute("src", expect.stringMatching(/^blob:/u));
  await pdfReview.getByRole("button", { name: "Next page" }).click();
  const second = pdfReview.getByRole("img", { name: "Page 2 of 2" });
  await expect.element(second).toHaveAttribute("src", expect.stringMatching(/^blob:/u));
  const secondUrl = second.element().getAttribute("src");
  expect(secondUrl).toBeTruthy();
  await expect.element(pdfReview.getByRole("button", { name: "Next page" })).toBeDisabled();
  await pdfReview.getByRole("button", { name: "Previous page" }).click();
  await expect.element(pdfReview.getByRole("img", { name: "Page 1 of 2" })).toHaveAttribute("src", expect.stringMatching(/^blob:/u));
  await pdfReview.getByRole("button", { name: "Close", exact: true }).click();
  expect(secondUrl && await fetch(secondUrl).then(() => false, () => true)).toBe(true);

  await page.getByRole("button", { name: "Back to the list", exact: true }).click();
  await page.getByRole("button", { name: "Back to apps", exact: true }).click();
  await page.getByRole("button", { name: "Files", exact: true }).click();
  await page.getByRole("button", { name: "Internal storage", exact: true }).click();
  await expect.element(page.getByText(name, { exact: true })).toBeVisible();
  expect(world.inbox.attachmentReads).toEqual(["g1/1", "g1/1", "g1/2"]);
});
