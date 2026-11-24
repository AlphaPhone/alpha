// spec/files/browser.md, "Story: Open Files and see my storage"
import { expect, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { FilesBrowser } from "../../files/browser.vibe";
import { perform } from "../shell/services.ts";
import type { FilesScreenProps } from "./FilesScreen.tsx";

const noop = () => undefined;
const browser = () => perform(FilesBrowser.use((b) => b.get()));

/** Files stays in the one visit it entered while it re-renders: it does not leave and enter again on each render. */
const staysEntered = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  await within(canvasElement).findByRole("main", { name: "Files" });
  await waitFor(async () => expect(await browser()).toMatchObject({ active: true, loading: false }));
  const entered = (await browser()).generation;
  await new Promise((resolve) => setTimeout(resolve, 300));
  await expect(await browser()).toMatchObject({ active: true, generation: entered });
};

export const meta: ComponentMeta<FilesScreenProps> = {
  args: { onClose: noop },
  examples: {
    Downloads: { route: "downloads" },
  },
  play: { Default: staysEntered, Downloads: staysEntered },
};
