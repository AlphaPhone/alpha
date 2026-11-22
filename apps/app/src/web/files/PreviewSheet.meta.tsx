import type { ComponentMeta } from "vibestack/stories";
import type { PreviewSheetProps } from "./PreviewSheet.tsx";
import { pdfPage, previewPdf, previewText } from "./fixtures.ts";
import { initial as pagesInitial } from "../../../gen/files__pdf.ts";

const none = () => undefined;
const all = { share: true, email: true, message: false, ask: true, move: true, rename: true, trash: true, elsewhere: true, reselect: false };

export const meta: ComponentMeta<PreviewSheetProps> = {
  args: { preview: previewText, pages: pagesInitial, actions: all, elsewhereLabel: "Open in Android", location: "Internal storage › Download",
    onClose: none, onPage: none, onShare: none, onEmail: none, onMessage: none, onAsk: none, onMove: none, onRename: none, onDetails: none,
    onTrash: none, onElsewhere: none, onReselect: none, onForget: none, onViewer: none },
  examples: { Pdf: { preview: previewPdf, pages: pdfPage }, Reselect: { preview: { ...previewText, content: "ContentNeedsReselect" }, actions: { ...all, reselect: true } } },
};
