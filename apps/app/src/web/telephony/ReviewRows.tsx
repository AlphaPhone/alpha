// spec/telephony/actions.md, "A name is looked up on the phone and the owner picks the exact number, even for one match"; spec/telephony/actions.md, "The owner's Not now, leaving the app or a changed context ends a run that has not dispatched"
import { MessageSquare, Phone as PhoneIcon, Plus, Save, Trash2, X } from "lucide-react";
import { useMachine } from "../../../gen/telephony__actions.react.ts";
import { candidatesOf, initial, runIdOf, type Actions } from "../../../gen/telephony__actions.ts";
import type { ReviewDetails } from "../../telephony/actions.vibe";
import { TelephonyActions } from "../../telephony/actions.vibe";
import { Avatar, Button } from "../components/ui/index.ts";
import { displayNumber } from "./present.ts";
import { runtime, type TelephonyRuntime } from "./runtime.ts";

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
  if (actions.run.tag !== "Choosing") return null;
  const kind = actions.run.kind;
  const Icon = kind === "PlaceCall" || kind === "DialNumber" ? PhoneIcon : kind === "ComposeText" ? MessageSquare : kind === "ContactRemove" ? Trash2 : kind === "ContactAdd" ? Plus : Save;
  return (
    <div role="group" aria-label="Choose one" className="flex flex-col gap-1">
      {details.body && <p className="rounded-md bg-secondary px-3 py-2 whitespace-pre-wrap">{details.body}</p>}
      {candidatesOf(actions.run).map((c) => {
        const change = details.changes?.[c.candidateId];
        const lines = change
          ? change.after
            ? [...change.after.phoneNumbers.map((p) => displayNumber(p.number)), ...change.after.emailAddresses.map((e) => e.address)]
            : [...change.before.phoneNumbers.map((p) => displayNumber(p.number))].slice(0, 2)
          : kind === "ContactAdd" ? [`${c.title} is already in Contacts`] : [displayNumber(c.number)];
        const verb = kind === "PlaceCall" || kind === "DialNumber" ? "Call" : kind === "ComposeText" ? "Message" : kind === "ContactRemove" ? "Delete"
          : kind === "ContactAdd" ? "Add anyway" : c.candidateId.endsWith(":add") ? "Add (keep existing)" : c.candidateId.endsWith(":replace") ? "Replace" : "Save changes to";
        return (
          <button key={c.candidateId} type="button" onClick={() => onChoose(c.candidateId)} aria-label={`${verb} ${c.title} ${lines.join(" ")}`}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-left active:bg-accent">
            <Avatar name={c.title} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{kind === "ContactAdd" ? "Add anyway" : c.title}</span>
              <span className="block truncate text-sm text-muted-foreground">{lines.join(" · ")}</span>
            </span>
            <Icon aria-hidden className={kind === "ContactRemove" ? "text-destructive" : "text-primary"} />
          </button>
        );
      })}
      <Button variant="ghost" onClick={onDismiss}><X aria-hidden />Not now</Button>
    </div>
  );
}

export interface ReviewRowsProps {
  /** The runtime the review runs on. */
  runtime?: TelephonyRuntime;
  /** The review details the card read when the run started choosing. */
  details?: ReviewDetails;
}

/**
 * The review rows the assistant's approval card embeds for a telephony action.
 * @model spec/telephony/actions.md
 */
export function ReviewRows({ runtime: on = runtime, details }: ReviewRowsProps) {
  const { state = initial, send } = useMachine(on);
  const runId = runIdOf(state.run);
  return (
    <ReviewRowsView
      actions={state}
      details={details ?? on.runSync(TelephonyActions.use((a) => a.review()))}
      onChoose={(candidateId) => send({ type: "candidateChosen", runId, candidateId }, "Owner")}
      onDismiss={() => send({ type: "reviewDismissed", runId }, "Owner")}
    />
  );
}
