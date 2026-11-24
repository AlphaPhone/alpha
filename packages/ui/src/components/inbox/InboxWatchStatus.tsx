import { Mail } from "lucide-react";
import { ListRow } from "../ListRow.tsx";
import { StatusDot, type StatusDotProps } from "../StatusDot.tsx";

const phases: Record<"off" | "watching" | "catchingUp" | "expired" | "stopped" | "noLongerAllowed", { status: StatusDotProps["status"]; label: string }> = {
  off: { status: "off", label: "Off" },
  watching: { status: "ok", label: "Watching" },
  catchingUp: { status: "busy", label: "Catching up" },
  expired: { status: "warn", label: "Missed earlier mail" },
  stopped: { status: "error", label: "Stopped" },
  noLongerAllowed: { status: "error", label: "No longer allowed" },
};

export type InboxWatchStatusProps = {
  /** Whether new mail is noticed, is being caught up on, missed some after Google reset its history, or stopped, and why. */
  phase: keyof typeof phases;
  /** The account watched, when one is. */
  account?: string;
  /** When mail was last checked, already worded; left out before the first check. */
  checkedAt?: string;
};

/**
 * For Settings: whether new mail is noticed on the phone, for which account, when it was last checked, and why not
 * when it is not.
 *
 * @model spec/app/inbox/notices.md
 */
export function InboxWatchStatus({ phase, account, checkedAt }: InboxWatchStatusProps) {
  const { status, label } = phases[phase];
  const detail = [account, checkedAt && `Checked ${checkedAt}`].filter(Boolean).join(" · ");
  return <ListRow title="New mail notices" detail={detail || undefined} leading={<Mail />} trailing={<StatusDot status={status} label={label} showLabel />} />;
}
