import type { ComponentMeta } from "vibestack/stories";
import type { NotesScreenViewProps } from "./NotesScreenView.tsx";
import {
  draft, editorClosed, editorOpen, folders, keptDraft, manyRows, now, opening, readFailed, ready, recorderClosed, recording,
  recordingDisplay, rows, saveUnconfirmed, saving, sourceClosed, trashClosed, trashConfirm, trashOpen, trashRows,
} from "./fixtures.ts";

const none = () => undefined;
const pending = () => new Promise<never>(() => undefined);
const allowed = { openTrash: true, askRow: true, restoreRow: true, askErase: true, eraseRows: true, retryDraft: false, beginRecording: true };
const recorderCan = { pause: true, resume: false, stop: true, finish: true, discard: false, askDiscard: true, retry: false };
const closed = { open: false, top: false, show: none, hide: none };

export const meta: ComponentMeta<NotesScreenViewProps> = {
  args: {
    onClose: none, collection: ready, editor: editorClosed, trash: trashClosed, recorder: recorderClosed, sourceDialog: sourceClosed, rows,
    draft: undefined, kept: undefined, deleted: [], display: recordingDisplay, folders, agentFilter: undefined, requestedFilter: undefined,
    receipt: undefined, earlierNotesAvailable: false, now, can: allowed, recorderCan, foldersLayer: closed, call: pending,
  },
  examples: {
    Opening: { collection: opening, rows: [] },
    Empty: { rows: [] },
    ManyNotes: { rows: manyRows },
    CouldNotOpen: { collection: readFailed, rows: [], can: { ...allowed, retryDraft: true } },
    Saving: { collection: saving, can: { ...allowed, openTrash: false, beginRecording: false } },
    Editing: { editor: editorOpen, draft },
    SaveUnconfirmed: { collection: saveUnconfirmed, editor: { ...editorOpen, review: true }, draft, can: { ...allowed, retryDraft: true } },
    KeptDraft: { kept: keptDraft },
    RecentlyDeleted: { trash: trashOpen, deleted: trashRows },
    ConfirmErase: { trash: trashConfirm, deleted: trashRows },
    Recording: { recorder: recording },
  },
};
