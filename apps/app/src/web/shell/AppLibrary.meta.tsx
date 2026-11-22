import type { ComponentMeta } from "vibestack/stories";
import type { AppLibraryProps } from "./AppLibrary.tsx";
import { idleControls, libraryEntries } from "./fixtures.ts";

const noop = () => {};

export const meta: ComponentMeta<AppLibraryProps> = {
  args: {
    entries: libraryEntries, query: "", status: "ready", menu: "", onHome: [], dial: "Phone", appInfo: true, controls: idleControls,
    onSearch: noop, onClose: noop, onDial: noop, onAddToHome: noop, onAppInfo: noop, onCloseMenu: noop, onDismissInfo: noop,
  },
  examples: {
    Loading: { entries: [], status: "loading" },
    Failed: { entries: [], status: "failed" },
    EntryMenu: { menu: "org.fixture.camera" },
    AppInfoRefused: { infoNotice: "Camera: It’s no longer installed." },
  },
};
