// spec/telephony/messages.md, "Delete passes the exact listed row after confirmation, and an unconfirmed delete keeps the row and blocks another"; spec/telephony/voicemail.md, "A delete needs the owner's confirmation of the open voicemail, and a refused delete keeps it"; spec/telephony/contacts.md, "A removal needs the owner's confirmation of the contact read whole, at its version"
import { Effect } from "effect";
import { ContactsView } from "../../telephony/contacts.vibe";
import { MessagesView } from "../../telephony/messages.vibe";
import { DeletionUndo, type UndoView } from "../../telephony/undo.vibe";
import { VoicemailView } from "../../telephony/voicemail.vibe";
import { act, perform, useServiceStream } from "../shell/services.ts";
import { UndoNoticeView } from "./UndoNoticeView.tsx";

const empty: UndoView = { notices: [], said: "" };

/**
 * The notices surface for telephony deletions; a kept deletion reads its list again.
 */
export function UndoNotice() {
  const undo = useServiceStream("telephony.undo", DeletionUndo.use((u) => Effect.succeed(u.changes)), empty, { alongside: DeletionUndo.use((u) => u.run()) });
  return (
    <UndoNoticeView
      undo={undo}
      onUndo={async (key) => {
        const answer = await perform(DeletionUndo.use((u) => u.undo(key)));
        if (!answer.kept) return;
        if (answer.kind === "message" || answer.kind === "thread") act(MessagesView.use((v) => v.refresh(false)));
        else if (answer.kind === "voicemail") act(VoicemailView.use((v) => v.refresh()));
        else act(ContactsView.use((v) => v.read("", true)));
      }}
      onDismiss={(key) => act(DeletionUndo.use((u) => u.dismiss(key)))}
    />
  );
}
