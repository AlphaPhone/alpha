import { Effect, ManagedRuntime, Option } from "effect";
import { expect, it } from "vitest";
import { Documents } from "../src/platform/documents.vibe";
import { Files } from "../src/platform/files.vibe";
import { browserLibrary } from "../src/platform/library.vibe";

// spec/app/files/recent.md, "Story: Pick a file with the system picker"; spec/app/files/preview.md, "Story: Look at a file"
it("imports a chosen file, opens its text, and finds it again in a new browser library runtime", async () => {
  const name = `alpha-library-${crypto.randomUUID()}.txt`;
  const path = `Download/${name}`;
  const words = "A local Files fixture.";
  const first = ManagedRuntime.make(browserLibrary);
  const reopened = ManagedRuntime.make(browserLibrary);
  try {
    const pick = first.runPromise(Effect.flatMap(Documents, (documents) => documents.pick()));
    await expect.poll(() => document.querySelector("input[type=file]")).toBeInstanceOf(HTMLInputElement);
    const chooser = document.querySelector<HTMLInputElement>("input[type=file]");
    if (!chooser) throw new Error("no browser file chooser");
    const items = new DataTransfer();
    items.items.add(new File([words], name, { type: "text/plain" }));
    chooser.files = items.files;
    chooser.dispatchEvent(new Event("change"));
    const chosen = Option.getOrThrow(await pick);
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
    const item = trash.items?.find((one) => one.origin === path);
    if (!item) throw new Error("the imported file did not reach Recently deleted");
    await expect(storage.storageEmptyTrash({ ids: [item.id], confirmed: true })).resolves.toMatchObject({ status: "ready", count: 1 });
    expect(await documents.read(id)).toMatchObject({ status: "unavailable" });
  } finally {
    await first.dispose();
    await reopened.dispose();
  }
});
