// spec/telephony/actions.md, "A name is looked up on the phone and the owner picks the exact number, even for one match"; spec/telephony/actions.md, "The owner's Not now, leaving the app or a changed context ends a run that has not dispatched"
import { useMachine } from "../../../gen/telephony__actions.react.ts";
import { initial, runIdOf } from "../../../gen/telephony__actions.ts";
import type { ReviewDetails } from "../../telephony/actions.vibe";
import { TelephonyActions } from "../../telephony/actions.vibe";
import { ReviewRowsView } from "./ReviewRowsView.tsx";
import { now } from "../shell/services.ts";
import { runtime } from "./runtime.ts";

export interface ReviewRowsProps {
  /** The review details the card read when the run started choosing. */
  details?: ReviewDetails;
}

/**
 * The review rows the assistant's approval card embeds for a telephony action.
 * @model spec/telephony/actions.md
 */
export function ReviewRows({ details }: ReviewRowsProps) {
  const { state = initial, send } = useMachine(runtime);
  const runId = runIdOf(state.run);
  return (
    <ReviewRowsView
      actions={state}
      details={details ?? now(TelephonyActions.use((a) => a.review()), {})}
      onChoose={(candidateId) => send({ type: "candidateChosen", runId, candidateId }, "Owner")}
      onDismiss={() => send({ type: "reviewDismissed", runId }, "Owner")}
    />
  );
}
