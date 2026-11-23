import type { ComponentMeta } from "vibestack/stories";
import type { PhotosViewProps } from "./PhotosScreen.tsx";
import { grid, library, rows, selectedAccess, selecting, today, viewing } from "./fixtures.ts";

export const meta: ComponentMeta<PhotosViewProps> = {
  args: { catalog: library, browse: grid, rows, said: "", now: today, messages: false, browser: false, onClose: () => undefined },
  examples: {
    Selecting: { browse: selecting },
    Viewer: { browse: viewing },
    ViewerWithMessages: { browse: viewing, messages: true },
    ChosenItemsOnly: { catalog: selectedAccess },
    Notice: { said: "Moved to Recently deleted" },
  },
};
