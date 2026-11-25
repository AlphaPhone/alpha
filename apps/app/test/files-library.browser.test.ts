import { Effect, ManagedRuntime, Option } from "effect";
import { expect, it } from "vitest";
import { Documents } from "../src/platform/documents.vibe";
import { Files } from "../src/platform/files.vibe";
import { browserLibrary } from "../src/platform/library.vibe";

function makeTwoPagePdf(): Blob {
  const encoder = new TextEncoder();
  const chunks: string[] = ["%PDF-1.4\n"];
  let size = encoder.encode(chunks[0]).length;
  const offsets: number[] = [0];
  const add = (body: string) => {
    const id = offsets.length;
    offsets.push(size);
    const part = `${id} 0 obj\n${body}\nendobj\n`;
    chunks.push(part);
    size += encoder.encode(part).length;
  };
  const p1 = "0.1 0.2 0.8 rg 20 20 160 160 re f\n";
  const p2 = "0.8 0.2 0.1 rg 40 40 120 120 re f\n";
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add("<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>");
  add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 5 0 R >>");
  add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 6 0 R >>");
  add(`<< /Length ${p1.length} >>\nstream\n${p1}endstream`);
  add(`<< /Length ${p2.length} >>\nstream\n${p2}endstream`);
  const xref = size;
  chunks.push(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for (const offset of offsets.slice(1)) chunks.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  chunks.push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: "application/pdf" });
}

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
  const file = new File([makeTwoPagePdf()], `alpha-pdf-${crypto.randomUUID()}.pdf`, { type: "application/pdf" });
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
