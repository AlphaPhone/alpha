// spec/app/account/index.md, "Story: Have the agent running"; spec/app/account/records.md, "Story: Restart after a failure that kept records"
import { Banner, Button, Card, CardTitle, ConfirmDialog, StatusDot } from "@repo/ui";
import { ownerIsAsked, seen } from "../../gen/app__account.ts";
import { useMachine as useResident } from "../../gen/app__account.react.ts";
import { phoneMustRestart } from "../../gen/app__account__records.ts";
import { useMachine as useRecords } from "../../gen/app__account__records.react.ts";
import { type AccountRuntime, useAccountShelf } from "./useAccount.ts";

const seenLabels = {
  SeenReady: { dot: "ok" as const, text: "Ready" },
  SeenStarting: { dot: "busy" as const, text: "Starting" },
  SeenRecovering: { dot: "warn" as const, text: "Recovering" },
  SeenStopped: { dot: "off" as const, text: "Stopped" },
  SeenOffline: { dot: "off" as const, text: "Offline" },
};

/** Resident agent status card and kept-records archive review dialog for Account. */
export function RecordsView({ runtime }: { readonly runtime: AccountRuntime }) {
  const resident = useResident(runtime);
  const records = useRecords(runtime);
  const shelf = useAccountShelf(runtime);
  const resState = resident.state;
  const recState = records.state;
  if (!resState || !recState) return null;

  const status = seenLabels[seen(shelf.online, resState)];
  const held = resState.forSignIn || resState.forKey || resState.forUpdate || resState.erasing;
  const reviewing = resState.phase === "Review";
  const canStart = resident.can({ type: "start", found: false, origin: "ByOwner" }, "SignInChange");
  const canRetryStop = resident.can({ type: "retryStop" }, "SignInChange");
  const canArchive = records.can({ type: "archive", review: recState.review.ticket, reviewing, held });

  return (
    <div className="space-y-3">
      <Card className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Resident agent</CardTitle>
          <StatusDot status={status.dot} label={status.text} showLabel />
        </div>
        {ownerIsAsked(resState) ? (
          <Button
            size="sm"
            disabled={!canStart}
            onClick={() => { void resident.send({ type: "start", found: false, origin: "ByOwner" }, "SignInChange"); }}
          >
            Start agent
          </Button>
        ) : null}
        {resState.phase === "Unstopped" ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={!canRetryStop}
            onClick={() => { void resident.send({ type: "retryStop" }, "SignInChange"); }}
          >
            Retry stop
          </Button>
        ) : null}
        {reviewing && !recState.showing && !phoneMustRestart(recState) ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={!records.can({ type: "opened" })}
            onClick={() => { void records.send({ type: "opened" }); }}
          >
            Review kept records
          </Button>
        ) : null}
        {phoneMustRestart(recState) ? (
          <Banner variant="destructive">
            Alpha couldn’t confirm archiving the kept records. Restart your phone before starting again.
          </Banner>
        ) : null}
      </Card>

      <ConfirmDialog
        open={recState.showing && reviewing}
        title="Archive kept records?"
        confirmLabel="Archive and restart"
        cancelLabel="Close review"
        loading={recState.attempt.outcome === "Sent"}
        onConfirm={() => {
          if (canArchive) void records.send({ type: "archive", review: recState.review.ticket, reviewing, held });
        }}
        onCancel={() => {
          if (records.can({ type: "closeReview" })) void records.send({ type: "closeReview" });
        }}
      >
        {recState.review.status === "Loaded"
          ? `The previous failure kept ${recState.kept} ${recState.kept === 1 ? "record" : "records"}. Archiving them clears recovery and restarts the agent.`
          : "Reading kept records from the device…"}
      </ConfirmDialog>
    </div>
  );
}
