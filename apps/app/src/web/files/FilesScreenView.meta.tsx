import type { ComponentMeta } from "vibestack/stories";
import type { FilesScreenViewProps } from "./FilesScreenView.tsx";
import {
  browse, browserBuild, denied, empty, filtered, folder, inTrash, launcherBuild, longFolder, moving, noFilter, noPages, noPanel, noPreview, noTrash,
  partial, pdfPage, previewPdf, selecting, trash,
} from "./fixtures.ts";

const none = () => undefined;
const pending = () => new Promise<never>(() => undefined);
const closed = { open: false, top: false, show: none, hide: none };

export const meta: ComponentMeta<FilesScreenViewProps> = {
  args: {
    onClose: none, browser: browse, trash: noTrash, filter: noFilter, preview: noPreview, pages: noPages, panel: noPanel,
    info: launcherBuild, targets: { messages: false, ask: true }, now: 1_763_000_000_000, can: () => true, send: none, sendTrash: none, sendFilter: none,
    destLayer: closed, nameLayer: closed, detailsLayer: closed, perform: pending, start: () => none,
  },
  examples: {
    AccessDenied: { browser: denied },
    Folder: { browser: folder },
    EmptyFolder: { browser: empty },
    LongFolder: { browser: longFolder },
    Selecting: { browser: selecting },
    Moving: { browser: moving, can: () => false },
    PartialCategory: { browser: partial },
    Trash: { browser: inTrash, trash },
    AgentFilter: { filter: filtered },
    PdfPreview: { browser: folder, preview: previewPdf, pages: pdfPage },
    BrowserBuild: { info: browserBuild },
  },
};
