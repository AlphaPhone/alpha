export type AssistantDeviceReceiptProps = {
  /** How the phone step the owner approved ended, in a sentence. */
  text: string;
};

/**
 * The result of a phone step the owner approved, as Sunday's v119 drew it under the review (Alpha 45f6bed30:
 * `prototype/agent-adapter.ts:2840`, `prototype/phone.css:953`): a quiet grey chip with an Alpha blue bar at its start.
 * It is not a reply of the agent's: it opens nothing and asks nothing.
 */
export function AssistantDeviceReceipt({ text }: AssistantDeviceReceiptProps) {
  return (
    <p role="status" data-alpha-device-receipt="" className="max-w-full self-start rounded-l-sm rounded-r-tile border-l-3 border-alpha bg-secondary px-3.5 py-2.5 text-sm leading-details wrap-anywhere text-secondary-foreground">
      {text}
    </p>
  );
}
