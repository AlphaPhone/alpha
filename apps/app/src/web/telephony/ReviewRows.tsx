// spec/telephony/actions.md, "A name is looked up on the phone and the owner picks the exact number, even for one match"; spec/telephony/actions.md, "The owner's Not now, leaving the app or a changed context ends a run that has not dispatched"
import { useMachine } from "../../../gen/telephony__actions.react.ts";
import { initial, runIdOf } from "../../../gen/telephony__actions.ts";
import type { ReviewDetails } from "../../telephony/actions.vibe";
import { TelephonyActions } from "../../telephony/actions.vibe";
import { ReviewRowsView } from "./ReviewRowsView.tsx";
import { runtime, type TelephonyRuntime } from "./runtime.ts";

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
