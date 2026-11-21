/**
 * The sentence the "Share note" review shows above its note picker. The shared Notes query
 * (`plugin-notes` `queryLocalNotes`) decides which notes are candidates and why (its `basis`);
 * Alpha words that reason for the owner from the basis, the candidate count and the query.
 * One basis, "owner-choice-uncertain", covers two different reasons (some notes have no usable
 * date, or several notes share the latest time); the query's own explanation tells them apart,
 * so its two reviewed sentences are keyed here to Alpha's.
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

/** The shared query's reviewed explanations for "owner-choice-uncertain", keyed to Alpha's. */
const UNCERTAIN: Readonly<Record<string, string>> = {
  "Some saved notes have unknown dates, so the latest note cannot be verified. Choose the note to share.":
    "Some notes have unknown dates, so the latest note cannot be verified. Choose the note to share.",
  "These notes share the latest recorded time. Choose the note to share.":
    "These notes share the latest recorded time. Choose the note to share.",
};

export function notesQueryExplanation(
  basis: NotesQueryBasis,
  candidates: number,
  query: NativeNotesQueryOperation["query"],
  sharedExplanation?: string,
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
      if (
        typeof sharedExplanation === "string" &&
        Object.hasOwn(UNCERTAIN, sharedExplanation)
      )
        return UNCERTAIN[sharedExplanation];
      return "The latest note cannot be verified: some notes have unknown dates or share the latest time. Choose the note to share.";
  }
}
