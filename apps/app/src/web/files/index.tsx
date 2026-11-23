// spec/files/index.md; spec/files/picker.md, "Story: Choose a file from my phone for another app on Alpha"; spec/files/browser.md, "Story: Walk my folders and categories"
import { Effect } from "effect";
import { FolderOpen } from "lucide-react";
import { useMachine as usePicker } from "../../../gen/files__picker.react.ts";
import { initial as pickerInitial } from "../../../gen/files__picker.ts";
import { Build } from "../../platform/build.vibe";
import { FilesBack } from "../../files/back.vibe";
import { FilePicker } from "../../files/picker.vibe";
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { FilePickerSheet } from "./FilePickerSheet.tsx";
import { FilesScreen } from "./FilesScreen.tsx";
import { ask, now, perform } from "../shell/services.ts";
import { runtime } from "./runtime.ts";

/** The picker surface takes nothing from the shell: it follows the picker machine. */
export type FilePickerSurfaceProps = Record<string, never>;

/** The picker other areas open through `FilePicker.choose`, kept mounted above every screen. */
export function FilePickerSurface(_props: FilePickerSurfaceProps) {
  const { state: picker = pickerInitial } = usePicker(runtime);
  const browserBuild = now(Build.use((b) => Effect.succeed(b.info.variant === "browser")), false);
  return (
    <FilePickerSheet picker={picker} deviceLabel={browserBuild ? "From computer" : "Browse"}
      onBrowse={(path) => void perform(FilePicker.use((p) => p.browse(path)))}
      onReview={(key) => void perform(FilePicker.use((p) => p.review(key)))}
      onUnchoose={(key) => void perform(FilePicker.use((p) => p.unchoose(key)))}
      onDevice={() => void perform(FilePicker.use((p) => p.fromDevice()))}
      onAttach={() => void perform(FilePicker.use((p) => p.attach()))}
      onDismiss={() => void perform(FilePicker.use((p) => p.dismiss()))} />
  );
}

/** Files' own Back: true when it closed the share panel, a Trash review or item, the viewer, the preview or the selection, went up a place or cleared the agent's filter. */
export function filesBack(): Promise<boolean> {
  return ask(FilesBack.use((b) => b.back()), false);
}

/** The Files app on Home and in the library. */
export const screens: AppScreen[] = [
  { id: "files", title: "Files", icon: FolderOpen, availability: "everywhere", Screen: FilesScreen, back: filesBack },
];

/** The file picker over every screen. */
export const surfaces: AppSurface[] = [
  { id: "files-picker", slot: "overlay", availability: "everywhere", Surface: FilePickerSurface },
];
