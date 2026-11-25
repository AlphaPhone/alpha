import type { ComponentMeta } from "vibestack/stories";
import type { BrowserLibraryProps } from "./BrowserLibrary.tsx";

export const meta: ComponentMeta<BrowserLibraryProps> = {
  args: {
    bookmarks: [{ url: "https://enclave.example/keys-in-hardware", title: "Keys in the chip" }],
    history: [{ url: "https://news.example/on-device-agents", title: "The case for on-device agents" }],
    loading: false,
    failed: false,
    onBack: () => {},
    onOpen: () => {},
  },
};
