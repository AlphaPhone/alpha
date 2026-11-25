import { Effect, ManagedRuntime, Option } from "effect";
import { expect, it } from "vitest";
import twoPages from "../../../legacy/android/app/src/androidTest/assets/inbox-fixtures/two-page.pdf?url";
import { Documents } from "../src/platform/documents.vibe";
import { Files } from "../src/platform/files.vibe";
import { browserLibrary } from "../src/platform/library.vibe";

async function pick(file: File, runtime: ManagedRuntime.ManagedRuntime<Documents | Files, never>) {
  const pending = runtime.runPromise(Effect.flatMap(Documents, (documents) => documents.pick()));
  await expect.poll(() => document.querySelector("input[type=file]")).toBeInstanceOf(HTMLInputElement);
  const chooser = document.querySelector<HTMLInputElement>("input[type=file]");
  if (!chooser) throw new Error("no browser file chooser");
  const items = new DataTransfer();
  items.items.add(file);
  chooser.files = items.files;
  chooser.dispatchEvent(new Event("change"));
  return Option.getOrThrow(await pending);
}

// spec/app/files/recent.md, "Story: Pick a file with the system picker"; spec/app/files/preview.md, "Story: Look at a file"
it("imports a chosen file, opens its text, and finds it again in a new browser library runtime", async () => {
  const name = `alpha-library-${crypto.randomUUID()}.txt`;
  const path = `Download/${name}`;
  const words = "A local Files fixture.";
  const first = ManagedRuntime.make(browserLibrary);
  const reopened = ManagedRuntime.make(browserLibrary);
  try {
    const chosen = await pick(new File([words], name, { type: "text/plain" }), first);
    const original = Option.getOrThrow(first.runSync(Effect.map(Documents, (documents) => documents.client)));
    expect(await original.read(chosen)).toMatchObject({ status: "read", text: words });
    await first.dispose();

    const storage = Option.getOrThrow(reopened.runSync(Effect.map(Files, (files) => files.plugin)));
    const listed = await storage.storageList({ path: "Download" });
    expect(listed.status).toBe("ready");
    expect(listed.entries?.map((entry) => entry.name)).toContain(name);
    const selection = await storage.storageSelect({ path });
    if (selection.status !== "selected" || !("selectionId" in selection)) throw new Error("the imported file could not be selected");
    const documents = Option.getOrThrow(reopened.runSync(Effect.map(Documents, (port) => port.client)));
    const id = selection.selectionId as typeof chosen;
    expect(await documents.read(id)).toMatchObject({ status: "read", text: words });

    const reviewed = await storage.storageReviewedIdentities({ paths: [path] });
    expect(reviewed.reviewed).toHaveLength(1);
    const trashed = await storage.storageTrash({ paths: [path], reviewed: reviewed.reviewed });
    expect(trashed.outcomes).toEqual([expect.objectContaining({ path, status: "trashed" })]);
    const trash = await storage.storageTrashList();
    const item = trash.items?.find((one) => one.origin === "Download" && one.name === name);
    if (!item) throw new Error("the imported file did not reach Recently deleted");
    await expect(storage.storageEmptyTrash({ ids: [item.id], confirmed: true })).resolves.toMatchObject({ status: "ready", count: 1 });
    expect(await documents.read(id)).toMatchObject({ status: "unavailable" });
  } finally {
    await first.dispose();
    await reopened.dispose();
  }
});


// spec/app/files/preview.md, "A page is shown only when the worker drew it in isolation and handed it over unwritable"
it("draws the selected PDF one page at a time", async () => {
  const response = await fetch(twoPages);
  const file = new File([await response.blob()], `alpha-pdf-${crypto.randomUUID()}.pdf`, { type: "application/pdf" });
  const runtime = ManagedRuntime.make(browserLibrary);
  try {
    const id = await pick(file, runtime);
    const documents = Option.getOrThrow(runtime.runSync(Effect.map(Documents, (port) => port.client)));
    const first = await documents.pdf(id, 1);
    const second = await documents.pdf(id, 2);
    expect(first).toMatchObject({ status: "rendered", page: 1, pageCount: 2 });
    expect(second).toMatchObject({ status: "rendered", page: 2, pageCount: 2 });
    if (!first.imageUri || !second.imageUri) throw new Error("PDF pages did not produce browser images");
    expect(first.imageUri).not.toBe(second.imageUri);
    expect((await (await fetch(second.imageUri)).blob()).type).toBe("image/png");
    expect(await documents.pdf(id, 3)).toMatchObject({ status: "failed" });
    await documents.forget(id);
    await expect(fetch(second.imageUri)).rejects.toThrow();
  } finally {
    await runtime.dispose();
  }
});
