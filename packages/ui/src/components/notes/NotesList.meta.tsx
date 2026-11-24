import type { ComponentMeta } from "vibestack/stories";
import { NoteRow } from "./NoteRow.tsx";
import type { NotesListProps } from "./NotesList.tsx";

export const meta: ComponentMeta<NotesListProps> = {
  args: {
    state: "listed",
    pinned: [<NoteRow key="enclave" title="Enclave launch" date="9:41 AM" preview="Confirm attestation flow" />],
    others: [<NoteRow key="radiator" title="Radiator" date="Sep 22" preview="Call the landlord Friday." />],
  },
  states: { unavailable: { state: "unavailable", pinned: [], others: [] }, empty: { state: "listed", pinned: [], others: [] } },
};
