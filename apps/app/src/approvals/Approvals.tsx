// spec/app/approvals/index.md, "Story: One action at a time"; spec/app/approvals/proposal.md, "Story: Be asked before Alpha acts"; spec/app/approvals/proposal.md, "Story: Decide"; spec/app/shell/layers.md, "Story: Keep a sheet or a dialog above the phone"
import { Banner, Button, Sheet, SheetContent } from "@repo/ui";
import { Effect } from "effect";
import { ShieldAlert, X } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import { useMachine as useApprovals } from "../../gen/app__approvals.react.ts";
import { entry } from "../../gen/app__approvals.ts";
import { useMachine as useLayers } from "../../gen/app__shell__layers.react.ts";
import { listed, top } from "../../gen/app__shell__layers.ts";
import { type Resident, type Shown, useTimed } from "../runtime/ui.tsx";
import { untimed } from "../runtime/index.vibe";
import { ApprovalDesk, approvalLayer } from "./approvals.vibe";
import { describeProposal } from "./operation.ts";

/** Overlay approval sheet that keeps the page behind it inert while a proposal card is open. */
export function ApprovalsOverlay({ runtime }: Shown<Resident>) {
  const { state, can, send } = useTimed(runtime, useApprovals);
  const layers = useLayers(runtime);
  const desk = useMemo(() => runtime.runSync(Effect.flatMap(ApprovalDesk, (found) => Effect.succeed(found))), [runtime]);
  const snap = useSyncExternalStore((listener) => desk.subscribe(listener), () => desk.snapshot(), () => desk.snapshot());
  if (!state || !layers.state || !listed(layers.state, approvalLayer)) return null;
  const openIds = state.ids.filter((id) => entry(state, id).review.showing);
  const forbiddenId = snap.forbiddenIds[0];
  const activeId = openIds[0];
  if (activeId === undefined && forbiddenId === undefined) return null;

  const isTop = top(layers.state).id === approvalLayer;
  const closeLayer = { type: "closeLayer", id: approvalLayer } as const;
  const dismiss = () => {
    if (forbiddenId !== undefined) desk.dismissForbidden(forbiddenId);
    if (layers.can(closeLayer)) void layers.send(closeLayer);
  };

  if (forbiddenId !== undefined && activeId === undefined) {
    const detail = snap.details.get(forbiddenId);
    return (
      <Sheet open={isTop} onOpenChange={(open) => { if (!open) dismiss(); }}>
        <SheetContent
          title={detail?.title ?? "Emergency call"}
          className="max-h-dvh max-w-105 gap-3 bg-background px-6 pt-8 pb-7 text-foreground"
          actions={<Button variant="secondary" onClick={dismiss}>Close</Button>}
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
            <p className="text-sm text-foreground">
              {detail?.detail || "Alpha cannot place emergency calls. Dial emergency services yourself."}
            </p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const proposal = entry(state, activeId);
  const detail = snap.details.get(activeId) ?? { id: activeId, proposalId: `proposal-${activeId}`, title: "Review action", detail: "", operation: proposal.operation, available: true };
  const summary = describeProposal(detail);
  const { signedIn, protectedScreen } = snap.context;
  const approveEv = { type: "approve", id: activeId, seen: proposal.review.shown, now: untimed, available: detail.available, signedIn, protectedScreen } as const;
  const declineEv = { type: "decline", id: activeId, signedIn } as const;

  return (
    <Sheet open={isTop} onOpenChange={(open) => {
      if (!open) {
        if (can(declineEv, "Owner")) void send(declineEv, "Owner");
        else if (layers.can(closeLayer)) void layers.send(closeLayer);
      }
    }}>
      <SheetContent
        title={summary.title}
        className="max-h-dvh max-w-105 gap-3 bg-background px-6 pt-8 pb-7 text-foreground"
        actions={(
          <div className="flex w-full gap-2">
            {can(declineEv, "Owner") ? (
              <Button variant="secondary" className="flex-1" onClick={() => void send(declineEv, "Owner")}>Decline</Button>
            ) : null}
            {can(approveEv, "Owner") ? (
              <Button variant={summary.danger ? "destructive" : "primary"} className="flex-1" onClick={() => void send(approveEv, "Owner")}>
                {summary.actionLabel}
              </Button>
            ) : null}
          </div>
        )}
      >
        <Button variant="ghost" size="icon" aria-label="Close approval" className="absolute top-6 right-5 size-10" onClick={() => {
          if (can(declineEv, "Owner")) void send(declineEv, "Owner");
          else if (layers.can(closeLayer)) void layers.send(closeLayer);
        }}>
          <X />
        </Button>
        {summary.summary ? <p className="text-sm text-muted-foreground">{summary.summary}</p> : null}
        {!detail.available ? (
          <Banner variant="info">Unavailable on this phone. This action cannot be run on this device.</Banner>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
