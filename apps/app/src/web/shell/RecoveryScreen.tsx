// spec/shell/recovery.md, "Story: Get my phone back when something breaks"
import { Button } from "../components/ui/index.ts";

/** The recovery screen: its diagnostics and the reload and Switch Home actions. */
export interface RecoveryScreenProps {
  /** Only the failure's kind, class, version, platform and time; never a message. */
  diagnostics: string;
  /** Android reports a launcher build, so the Home app picker is offered. */
  homeEscape?: boolean;
  onReload: () => void;
  onSwitchHome: () => void;
}

/** The recovery screen: Reload, Switch Home where Alpha may be the only home screen, and the failure's class. */
export function RecoveryScreen({ diagnostics, homeEscape = false, onReload, onSwitchHome }: RecoveryScreenProps) {
  return (
    <div role="alertdialog" aria-labelledby="alpha-recovery-title" className="fixed inset-0 z-[100] flex overflow-auto bg-background p-6 text-foreground">
      <div className="m-auto flex w-full max-w-sm flex-col gap-4">
        <h1 id="alpha-recovery-title" className="font-display text-3xl">Something went wrong</h1>
        <Button size="lg" autoFocus onClick={onReload}>Reload</Button>
        {homeEscape && <Button size="lg" variant="secondary" onClick={onSwitchHome}>Switch Home</Button>}
        <details>
          <summary className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Diagnostics</summary>
          <pre className="mt-2 rounded-lg bg-secondary p-3 font-mono text-xs whitespace-pre-wrap">{diagnostics}</pre>
        </details>
      </div>
    </div>
  );
}

/** The diagnostics a recovery screen shows: the failure's kind and class, the version, the platform and the time. */
export function diagnosticsOf(kind: "render" | "startup", errorClass: string, version: string, platform: string, at: Date): string {
  return [`failure: ${kind}`, `error: ${errorClass || "unknown"}`, `version: ${version}`, `platform: ${platform}`, `time: ${at.toISOString()}`].join("\n");
}
