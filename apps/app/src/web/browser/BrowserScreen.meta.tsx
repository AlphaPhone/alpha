import type { ComponentMeta } from "vibestack/stories";
import type { BrowserScreenProps } from "./BrowserScreen.tsx";

const noop = () => undefined;

export const meta: ComponentMeta<BrowserScreenProps> = {
  args: { onClose: noop },
  examples: {
    Link: { route: "https://example.test/news" },
    LongLink: { route: "https://docs.example.test/guides/getting-started/with-a-very-long-path/that-keeps-going/past-the-address-bar?section=overview&lang=en#first-steps" },
    RefusedLink: { route: "file:///sdcard/Download/notes.txt" },
  },
};
