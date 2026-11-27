import { Mark } from "../Mark.tsx";

export type AssistantDeviceReceiptProps = {
  /** How the phone step the owner approved ended, in a sentence. */
  text: string;
};

/**
 * The result of a phone step the owner approved, as Sunday's v119 drew it under the review (Alpha 45f6bed30:
 * `prototype/agent-adapter.ts:2840`, `prototype/template.html:4534`, `prototype/phone.css:442-444` and `:953`): one of
 * Alpha's lines, its 18 px mark and then a quiet grey chip with an Alpha blue bar at its start that fills the rest of the
 * row, so it starts in the column of Alpha's reply text. It is not a reply of the agent's: it opens nothing and asks nothing.
 */
export function AssistantDeviceReceipt({ text }: AssistantDeviceReceiptProps) {
  return (
    <div data-alpha-agent-line="" className="flex w-full max-w-full items-start gap-2.5">
      <span aria-hidden data-alpha-agent-mark="" className="mt-0.75 flex size-4.5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-alpha text-alpha-foreground"><Mark aria-hidden className="size-full shrink-0 scale-[1.18]" /></span>
      <p role="status" data-alpha-device-receipt="" className="min-w-0 flex-1 rounded-l-sm rounded-r-tile border-l-3 border-alpha bg-secondary px-3.5 py-2.5 text-sm leading-details wrap-anywhere text-secondary-foreground">
        {text}
      </p>
    </div>
  );
}
