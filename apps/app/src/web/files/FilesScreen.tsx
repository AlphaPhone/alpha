// spec/files/browser.md, "Story: Open Files and see my storage"; spec/files/browser.md, "Story: Walk my folders and categories"; spec/files/browser.md, "Story: Select files and act on them together"; spec/files/mutations.md, "Story: Change many files and be told truthfully what changed"; spec/files/preview.md, "Story: Do something with the file I am looking at"; spec/files/trash.md, "Story: Restore or delete several Trash items together"; spec/files/filter.md, "Story: Let the agent show me the files I asked about"
import { Effect } from "effect";
import { useMachine as useBrowser } from "../../../gen/files__browser.react.ts";
import { useMachine as useTrash } from "../../../gen/files__trash.react.ts";
import { useMachine as useFilter } from "../../../gen/files__filter.react.ts";
import { useMachine as usePreview } from "../../../gen/files__preview.react.ts";
import { useMachine as usePages } from "../../../gen/files__pdf.react.ts";
import { useMachine as usePanel } from "../../../gen/files__share.react.ts";
import { initial as browserInitial } from "../../../gen/files__browser.ts";
import { initial as trashInitial } from "../../../gen/files__trash.ts";
import { initial as filterInitial } from "../../../gen/files__filter.ts";
import { initial as previewInitial } from "../../../gen/files__preview.ts";
import { initial as pagesInitial } from "../../../gen/files__pdf.ts";
import { initial as panelInitial } from "../../../gen/files__share.ts";
import { Build, type BuildInfo } from "../../platform/build.vibe";
import { FileShareTargets } from "../../files/share.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { useLayer } from "../shell/useLayer.ts";
import { FilesScreenView, filesDialogLayers } from "./FilesScreenView.tsx";
import { now, perform, start } from "../shell/services.ts";
import { runtime } from "./runtime.ts";

const NO_BUILD: BuildInfo = { version: "", variant: "launcher", testMocks: false };
const NO_TARGETS = { messages: false, ask: false };

/** The route Files opens at, such as `downloads`, and how it closes. */
export type FilesScreenProps = ScreenProps;

/**
 * Files: Browse, folders and categories, Trash, the agent's filter and the file preview.
 * @model spec/files/browser.md
 */
export function FilesScreen({ route, onClose }: FilesScreenProps) {
  const { state: browser = browserInitial, can, send } = useBrowser(runtime);
  const { state: trash = trashInitial, send: sendTrash } = useTrash(runtime);
  const { state: filter = filterInitial, send: sendFilter } = useFilter(runtime);
  const { state: preview = previewInitial } = usePreview(runtime);
  const { state: pages = pagesInitial } = usePages(runtime);
  const { state: panel = panelInitial } = usePanel(runtime);
  const info = now(Build.use((b) => Effect.succeed(b.info)), NO_BUILD);
  const targets = now(FileShareTargets.use((t) => Effect.succeed({ messages: t.messages, ask: t.ask })), NO_TARGETS);
  const destLayer = useLayer(filesDialogLayers[0], "DialogLayer");
  const nameLayer = useLayer(filesDialogLayers[1], "DialogLayer");
  const detailsLayer = useLayer(filesDialogLayers[2], "DialogLayer");
  return (
    <FilesScreenView route={route} onClose={onClose} browser={browser} trash={trash} filter={filter} preview={preview} pages={pages} panel={panel}
      info={info} targets={targets} now={Date.now()} can={can} send={send} sendTrash={sendTrash} sendFilter={sendFilter}
      destLayer={destLayer} nameLayer={nameLayer} detailsLayer={detailsLayer} perform={perform} start={start} />
  );
}
