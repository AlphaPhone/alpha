import { Button } from "../Button.tsx";
import { StatusDot } from "../StatusDot.tsx";

export type SettingsActionRowProps = {
  /** What the agent did or proposed on the phone, as the approvals area recorded it. */
  title: string;
  /** When, or where it stands, in a few words. */
  detail?: string;
  /** The proposal can still be declined. */
  declinable?: boolean;
  /** The agent could not see whether it happened: the owner says. */
  unsettled?: boolean;
  /** Declines the proposal; the button is shown only with it, while the proposal can be declined. */
  onDecline?: () => void;
  /** Says whether the action happened or did not; the buttons are shown only with it, while the outcome is unsettled. */
  onReconcile?: (happened: boolean) => void;
};

/**
 * One action the agent took or proposed on the phone. The owner's word goes to the approvals area, and what changes
 * here is what it recorded.
 * @model spec/app/settings/activity.md
 */
export function SettingsActionRow({ title, detail, declinable = false, unsettled = false, onDecline, onReconcile }: SettingsActionRowProps) {
  return (
    <div className="flex flex-col gap-2 border-t border-border px-4 py-3 first:border-t-0">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 text-base font-medium break-words">{title}</span>
        {declinable ? <StatusDot status="warn" label="Proposed" /> : unsettled ? <StatusDot status="error" label="Outcome unknown" /> : null}
      </div>
      {detail ? <span className="text-sm text-muted-foreground">{detail}</span> : null}
      {declinable && onDecline ? (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onDecline}>Decline</Button>
        </div>
      ) : null}
      {unsettled && onReconcile ? (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onReconcile(true)}>Happened</Button>
          <Button variant="outline" size="sm" onClick={() => onReconcile(false)}>Didn’t</Button>
        </div>
      ) : null}
    </div>
  );
}
