// spec/settings/updates.md, "Story: Let Android finish an update without losing what I typed"
import type { Updates } from "../../../gen/settings__updates.ts";
import { Button, Spinner } from "../components/ui/index.ts";

/** Android's activation of a staged update, and Continue where Android paused it. */
export interface UpdateActivationProps {
  readonly updates: Updates;
  readonly onContinue: () => void;
}

/** Holds the screen while Android installs a staged update, with Continue where Android paused it. */
export function UpdateActivation({ updates, onContinue }: UpdateActivationProps) {
  if (updates.activation !== "Preparing" && updates.activation !== "Paused" && updates.activation !== "Continuing") return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Alpha update" className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-scrim">
      <div className="flex flex-col items-center gap-3 rounded-xl bg-card p-6">
        <span role="status" className="inline-flex items-center gap-2"><Spinner size="sm" aria-hidden />Updating Alpha</span>
        {updates.canContinue && <Button onClick={onContinue}>Continue</Button>}
      </div>
    </div>
  );
}
