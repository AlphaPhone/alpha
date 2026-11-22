// spec/files/index.md; spec/files/picker.md, "Story: Choose a file from my phone for another app on Alpha"; spec/files/browserDownloads.md, "Story: Save a download only as I reviewed it"
import { Effect, Stream } from "effect";
import { FolderOpen } from "lucide-react";
import { useMachine as usePicker } from "../../../gen/files__picker.react.ts";
import { initial as pickerInitial } from "../../../gen/files__picker.ts";
import { Build } from "../../platform/build.vibe";
import { FilePicker } from "../../files/picker.vibe";
import { FilesDownloads } from "../../files/downloads.vibe";
import type { AppId, AppScreen, AppSurface } from "../app-screen.ts";
import { FilePickerSheet } from "./FilePickerSheet.tsx";
import { FilesScreen } from "./FilesScreen.tsx";
import { filesRuntime, run, start } from "./runtime.ts";

const browserBuild = filesRuntime.runSync(Build.use((b) => Effect.succeed(b.info.variant === "browser")));

/** The picker other areas open through `FilePicker.choose`, kept mounted above every screen. */
function FilePickerSurface() {
  const { state: picker = pickerInitial } = usePicker(filesRuntime);
  return (
    <FilePickerSheet picker={picker} deviceLabel={browserBuild ? "From computer" : "Browse"}
      onBrowse={(path) => void run(FilePicker.use((p) => p.browse(path)))}
      onReview={(key) => void run(FilePicker.use((p) => p.review(key)))}
      onUnchoose={(key) => void run(FilePicker.use((p) => p.unchoose(key)))}
      onDevice={() => void run(FilePicker.use((p) => p.fromDevice()))}
      onAttach={() => void run(FilePicker.use((p) => p.attach()))}
      onDismiss={() => void run(FilePicker.use((p) => p.dismiss()))} />
  );
}

/** Opens Files at Downloads each time the Browser's Downloads list asks to show its files. */
function DownloadsRouteSurface({ open }: { readonly open: (app: AppId, route?: string) => void }) {
  const follow = (node: HTMLElement | null) => {
    if (!node) return;
    return start(FilesDownloads.use((d) => Stream.runForEach(d.routes, (route) => Effect.sync(() => open("files", route)))));
  };
  return <span ref={follow} hidden />;
}

/** The Files app on Home and in the library. */
export const screens: AppScreen[] = [
  { id: "files", title: "Files", icon: FolderOpen, availability: "everywhere", Screen: FilesScreen },
];

/** The file picker over every screen, and the Browser's route into Downloads. */
export const surfaces: AppSurface[] = [
  { id: "files-picker", slot: "overlay", availability: "everywhere", Surface: FilePickerSurface },
  { id: "files-downloads-route", slot: "notices", availability: "everywhere", Surface: DownloadsRouteSurface },
];
