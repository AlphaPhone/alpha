// spec/files/browser.md, "Story: Open Files and see my storage"
import { Effect } from "effect";
import { expect, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { FilesBrowser } from "../../files/browser.vibe";
import { FilesStorage } from "../../files/storage.vibe";
import { perform, watch } from "../shell/services.ts";
import type { FilesScreenProps } from "./FilesScreen.tsx";

const noop = () => undefined;
const browser = () => perform(FilesBrowser.use((b) => b.get()));

/**
 * Files stays in the one visit it entered while it re-renders: once settled, it never leaves (and enters again)
 * over a stretch of renders. A refresh inside that stretch is allowed; only leaving fails it.
 */
const staysEntered = async () => {
  await waitFor(async () => expect(await browser()).toMatchObject({ active: true, loading: false }));
  let left = 0;
  const stop = watch(FilesBrowser.use((b) => Effect.succeed(b.changes)), (s) => { if (!s.active) left += 1; });
  await new Promise((resolve) => setTimeout(resolve, 300));
  stop();
  await expect(left).toBe(0);
  await expect(await browser()).toMatchObject({ active: true });
};

const opensFiles = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  await within(canvasElement).findByRole("main", { name: "Files" });
  await staysEntered();
};

/**
 * Files opened at its `downloads` route, as the browser's Downloads opens it, stays at Downloads once its read
 * answers: in the Download folder, or in the Downloads category where the storage has no Download folder yet.
 */
const opensDownloads = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  const screen = within(canvasElement);
  await screen.findByRole("main", { name: "Files" });
  const folder = await perform(FilesStorage.use((s) => s.list("Download", ""))).catch(() => undefined);
  const missing = folder?.status === "missing";
  const landed = missing ? { tag: "InCategory", category: "Downloads" } : { tag: "InFolder", path: "Download" };
  await waitFor(async () => expect(await browser()).toMatchObject({ place: landed, loading: false }));
  await staysEntered();
  await expect((await browser()).place).toMatchObject(landed);
  await screen.findByRole("heading", { name: missing ? "Downloads" : "Download" });
};

export const meta: ComponentMeta<FilesScreenProps> = {
  args: { onClose: noop },
  examples: {
    Downloads: { route: "downloads" },
  },
  play: { Default: opensFiles, Downloads: opensDownloads },
};
