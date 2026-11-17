/**
 * The sentence the "Share note" review shows above its note picker. The shared Notes query
 * (`plugin-notes` `queryLocalNotes`) decides which notes are candidates and why (its `basis`);
 * Alpha words that reason for the owner from the basis, the candidate count and the query.
 */
import type { NativeNotesQueryOperation } from "@elizaos/contracts/native-notes-query";

/** Why the shared Notes query offered these candidates. */
export type NotesQueryBasis =
  | "no-match"
  | "title-match"
  | "latest-created"
  | "latest-updated"
  | "only-note"
  | "owner-choice-uncertain";

export function notesQueryExplanation(
  basis: NotesQueryBasis,
  candidates: number,
  query: NativeNotesQueryOperation["query"],
): string {
  switch (basis) {
    case "no-match":
      return query.kind === "title"
        ? "No saved note matches this title."
        : "No saved notes were found.";
    case "title-match":
      return candidates > 1
        ? "Several notes match. Choose the one to share."
        : "Review the matching note before sharing it.";
    case "only-note":
      return "This is the only saved note. Review it before sharing.";
    case "latest-created":
      return "Review the latest created note before sharing.";
    case "latest-updated":
      return "Review the latest updated note before sharing.";
    case "owner-choice-uncertain":
      return "The latest note cannot be verified: some notes have unknown dates or share the latest time. Choose the note to share.";
  }
}
