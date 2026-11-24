import type { ComponentMeta } from "vibestack/stories";
import type { FilesScreenProps } from "./FilesScreen.tsx";

const noop = () => undefined;

export const meta: ComponentMeta<FilesScreenProps> = {
  args: { onClose: noop },
  examples: {
    Downloads: { route: "downloads" },
  },
};
