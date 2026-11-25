import { Hash, Send } from "lucide-react";
import { AssistantCardFrame, type AssistantCardFrameProps } from "../assistant/AssistantCardFrame.tsx";
import { Banner } from "../Banner.tsx";
import { Button } from "../Button.tsx";
import { StatusDot } from "../StatusDot.tsx";
import { Textarea } from "../Textarea.tsx";

/** Honest delivery outcome of a staged Ask Alpha message draft. */
export type MessageDraftStatus = "draft" | "sending" | "sent" | "failed" | "unknown";

export type AssistantMessageDraftCardProps = Pick<AssistantCardFrameProps, "settled" | "className"> & {
  /** Messaging platform the draft targets. */
  platform: "Telegram" | "Slack";
  /** Destination label, such as `"Acme · #design"` or `"Ana Lima"`. */
  target: string;
  /** Optional reply or thread context shown beneath the target. */
  replyContext?: string;
  /** Full staged message text. */
  body: string;
  /** Updates the draft text inline before sending; read-only when omitted. */
  onBodyChange?: (body: string) => void;
  /** Honest delivery state of this draft revision. */
  status?: MessageDraftStatus;
  /** Failure or uncertainty detail shown when `status` is `"failed"` or `"unknown"`. */
  error?: string;
  /** Sends this exact draft; offered only while sending is permitted. */
  onSend?: () => void;
  /** Opens the destination conversation in Telegram or Slack. */
  onOpenInApp?: () => void;
  /** Declines and dismisses the staged draft. */
  onDecline?: () => void;
};

/**
 * Staged Ask Alpha message draft card for Telegram and Slack: displays platform, target and optional thread or reply
 * context, inline editable message body, honest delivery status and explicit `Send`, `Open in app` and `Decline` controls.
 */
export function AssistantMessageDraftCard({
  platform,
  target,
  replyContext,
  body,
  onBodyChange,
  status = "draft",
  error,
  onSend,
  onOpenInApp,
  onDecline,
  settled = false,
  className,
}: AssistantMessageDraftCardProps) {
  const sending = status === "sending";
  const editable = !settled && (status === "draft" || status === "failed") && Boolean(onBodyChange);
  const canSend = !settled && (status === "draft" || status === "sending" || status === "failed") && Boolean(onSend);
  const canDecline = !settled && status !== "sent" && Boolean(onDecline);
  const hasActions = canSend || Boolean(onOpenInApp) || canDecline;
  return (
    <AssistantCardFrame
      icon={platform === "Slack" ? <Hash /> : <Send />}
      title={`${platform} · ${target}`}
      detail={replyContext}
      settled={settled}
      className={className}
      actions={
        hasActions ? (
          <>
            {canSend ? (
              <Button variant="primary" size="sm" loading={sending} disabled={body.trim() === ""} onClick={onSend}>
                Send
              </Button>
            ) : null}
            {onOpenInApp ? (
              <Button variant="secondary" size="sm" disabled={sending} onClick={onOpenInApp}>
                Open in app
              </Button>
            ) : null}
            {canDecline ? (
              <Button variant="ghost" size="sm" disabled={sending} onClick={onDecline}>
                Decline
              </Button>
            ) : null}
          </>
        ) : undefined
      }
    >
      {status === "sent" ? <StatusDot status="ok" label="Sent" showLabel /> : null}
      {status === "failed" ? <Banner variant="destructive">{error ?? "Message not sent"}</Banner> : null}
      {status === "unknown" ? (
        <Banner variant="warn">{error ?? `Delivery unconfirmed — check ${platform} before sending again`}</Banner>
      ) : null}
      {editable ? (
        <Textarea
          aria-label={`Message to ${target}`}
          rows={2}
          value={body}
          disabled={sending}
          onChange={(event) => onBodyChange?.(event.target.value)}
        />
      ) : (
        <p className="text-base break-words whitespace-pre-line">{body}</p>
      )}
    </AssistantCardFrame>
  );
}
