// spec/clock/notices.md, "Story: Be told my data was kept"; spec/clock/notices.md, "Story: Recover unreadable data while developing"
import type { RecoveryPhase } from "../../../gen/clock__notices.ts";
import { Button, Dialog, DialogContent, DialogTitle } from "../components/ui/index.ts";

export type RetainedDataNoticeProps = {
  /** What could not be read, such as "Reminders". */
  heading: string;
  /** A test-mocks build: the developer may download the kept bytes or reset the store. */
  devTools: boolean;
  /** Where the developer's reset stands. */
  recovery: RecoveryPhase;
  onClose: () => void;
  onDownload: () => void;
  onAskReset: () => void;
  onCancelReset: () => void;
  onConfirmReset: () => void;
};

const RESULT: Readonly<Partial<Record<RecoveryPhase, string>>> = { ResetDone: "Reset. Reopen Alpha to start this store again.", ResetFailed: "Couldn’t reset" };

/** Tells the owner that Alpha kept data it could not read; only a test-mocks build offers download or reset. */
export function RetainedDataNotice({ heading, devTools, recovery, onClose, onDownload, onAskReset, onCancelReset, onConfirmReset }: RetainedDataNoticeProps) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open && recovery !== "Resetting") onClose(); }}>
      <DialogContent>
        <DialogTitle>{heading}</DialogTitle>
        <p>Data kept</p>
        {devTools && recovery === "ConfirmingReset" && <p role="alert">Reset clears this store’s saved data. Download it first.</p>}
        {RESULT[recovery] && <p role="status">{RESULT[recovery]}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          {devTools && recovery === "ConfirmingReset" ? (
            <>
              <Button variant="ghost" onClick={onCancelReset}>Cancel</Button>
              <Button variant="destructive" onClick={onConfirmReset}>Reset</Button>
            </>
          ) : (
            <>
              {devTools && <Button variant="outline" onClick={onDownload}>Download</Button>}
              {devTools && recovery === "NoRecovery" && <Button variant="outline" onClick={onAskReset}>Reset…</Button>}
              <Button loading={recovery === "Resetting"} onClick={onClose}>Close</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
