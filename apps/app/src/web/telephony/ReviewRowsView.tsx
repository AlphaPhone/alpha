// spec/telephony/actions.md, "A name is looked up on the phone and the owner picks the exact number, even for one match"; spec/telephony/actions.md, "The owner's Not now, leaving the app or a changed context ends a run that has not dispatched"
import { MessageSquare, Phone as PhoneIcon, Plus, Save, Trash2, X } from "lucide-react";
import { candidatesOf, type Actions } from "../../../gen/telephony__actions.ts";
import { changeLines, type ChangeLine, type ReviewDetails } from "../../telephony/actions.vibe";
import { Avatar, Button } from "../components/ui/index.ts";
import { displayNumber } from "./present.ts";

export interface ReviewRowsViewProps {
  /** The approved action's run, choosing among candidates. */
  actions: Actions;
  /** A text's body, a contact's fields before and after. */
  details: ReviewDetails;
  /** The owner's choice of one candidate. */
  onChoose: (candidateId: string) => void;
  /** Not now: nothing is called, sent or changed. */
  onDismiss: () => void;
}

/**
 * The choices an approved call, text or contact change shows inside its chat card: the exact name and number, or the fields before and after. One tap chooses.
 * @model spec/telephony/actions.md
 * @design design.md
 */
export function ReviewRowsView({ actions, details, onChoose, onDismiss }: ReviewRowsViewProps) {
  if (actions.ongoing.tag !== "Choosing") return null;
  const kind = actions.ongoing.kind;
  const Icon = kind === "PlaceCall" || kind === "DialNumber" ? PhoneIcon : kind === "ComposeText" ? MessageSquare : kind === "ContactRemove" ? Trash2 : kind === "ContactAdd" ? Plus : Save;
  return (
    <div role="group" aria-label="Choose one" className="flex flex-col gap-1">
      {details.body && <p className="rounded-md bg-secondary px-3 py-2 whitespace-pre-wrap">{details.body}</p>}
      {details.more !== undefined && <p role="note" className="text-sm text-muted-foreground">{`More than ${details.more} contacts match. Only the first ${details.more} are listed.`}</p>}
      {candidatesOf(actions.ongoing).map((c) => {
        const change = details.changes?.[c.candidateId];
        // A contact change lists every line on its own, saying what it does to it, so a removed number never reads as kept (#1453).
        const changed = change?.after === undefined ? undefined : changeLines(change.before, change.after);
        const lines = changed !== undefined
          ? changed.map(said)
          : change
            ? [...change.before.phoneNumbers.map((p) => displayNumber(p.number))].slice(0, 2)
            : kind === "ContactAdd" ? [`${c.title} is already in Contacts`] : [displayNumber(c.number)];
        const verb = kind === "PlaceCall" || kind === "DialNumber" ? "Call" : kind === "ComposeText" ? "Message" : kind === "ContactRemove" ? "Delete"
          : kind === "ContactAdd" ? "Add anyway" : c.candidateId.endsWith(":add") ? "Add (keep existing)" : c.candidateId.endsWith(":replace") ? "Replace" : "Save changes to";
        // A change offered both ways shows its way, so the Add and Replace rows never look alike (#1453).
        const way = c.candidateId.endsWith(":add") || c.candidateId.endsWith(":replace") ? verb : undefined;
        return (
          <button key={c.candidateId} type="button" onClick={() => onChoose(c.candidateId)} aria-label={`${verb} ${c.title} ${lines.join(" ")}`}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-left active:bg-accent">
            <Avatar name={c.title} size="sm" />
            <span className="min-w-0 flex-1">
              {way !== undefined && <span className="block text-sm font-semibold">{way}</span>}
              <span className="block truncate">{kind === "ContactAdd" ? "Add anyway" : c.title}</span>
              {changed !== undefined
                ? changed.map((line, at) => (
                  <span key={at} className={`block break-words text-sm ${line.word === "Add" ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {`${line.word} `}<span className={struck(line) ? "line-through" : undefined}>{shown(line)}</span>
                  </span>
                ))
                : <span className="block truncate text-sm text-muted-foreground">{lines.join(" · ")}</span>}
            </span>
            <Icon aria-hidden className={kind === "ContactRemove" ? "text-destructive" : "text-primary"} />
          </button>
        );
      })}
      <Button variant="ghost" onClick={onDismiss}><X aria-hidden />Not now</Button>
    </div>
  );
}

/** A change line's value as the review shows it: a number formatted, an address or name as stored. */
const shown = (line: ChangeLine) => line.number ? displayNumber(line.value) : line.value;
/** Removed values and the old name are struck through. */
const struck = (line: ChangeLine) => line.word === "Remove" || line.word === "Rename from";
/** A change line in words, for the row's accessible name. */
const said = (line: ChangeLine) => `${line.word} ${shown(line)}`;
