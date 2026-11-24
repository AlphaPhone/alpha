import { TriangleAlert } from "lucide-react";
import { Alert } from "../Alert.tsx";
import { Button } from "../Button.tsx";
import type { StartupFailure } from "./vocabulary.ts";

export type StartupFailureScreenProps = {
  /** The kind of failure this screen is about: Diagnostics shows it, never a message or a stack. */
  kind: StartupFailure;
  /** Alpha's version, for Diagnostics. */
  version: string;
  /** The platform, for Diagnostics. */
  platform: "android" | "web";
  /** The phone has no Android WebView, so the page can never be built and Reload is not offered. */
  withoutWebView?: boolean;
  /** Reload has asked the areas to put their drafts on the phone and waits for them. */
  saving?: boolean;
  /** The drafts could not be written, or did not answer in five seconds: rebuilding would lose unsaved edits. */
  unsaved?: boolean;
  /** Alpha is Android's Home, so Switch Home is offered. */
  asHome?: boolean;
  /** Android's choice of Home, default apps and Settings are being tried. */
  switching?: boolean;
  /** None of Android's screens could be opened. */
  switchFailed?: boolean;
  /** Reloads once the drafts are on the phone; given exactly when the machine allows it. */
  onReload?: () => void;
  /** Reloads over drafts that could not be written; only the owner's tap, and only once `unsaved`. */
  onReloadAnyway?: () => void;
  /** Opens Android's choice of Home; given exactly when the machine allows it. */
  onSwitchHome?: () => void;
};

const kinds: Record<StartupFailure, string> = {
  FailedToStart: "Failed to start",
  FailedToDraw: "Failed to draw",
  Uncaught: "Uncaught error",
  KeptFailing: "Kept failing",
};

/**
 * "Something went wrong" over a page that failed to start or to draw, or could not be built at all. Reload has focus;
 * Reload anyway appears only when edits could not be saved, and Switch Home where Alpha is Android's Home.
 * @model spec/app/startup/recovery.md
 */
export function StartupFailureScreen({ kind, version, platform, withoutWebView = false, saving = false, unsaved = false, asHome = false, switching = false, switchFailed = false, onReload, onReloadAnyway, onSwitchHome }: StartupFailureScreenProps) {
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="startup-failure-title" className="fixed inset-0 z-dialog flex overflow-auto bg-background p-6 text-foreground">
      <div className="m-auto flex w-full max-w-sm flex-col gap-4">
        <TriangleAlert aria-hidden className="size-10 text-warn" />
        <h1 id="startup-failure-title" className="font-display text-3xl font-light">Something went wrong</h1>
        {withoutWebView ? <Alert variant="warn">This phone has no WebView</Alert> : null}
        {unsaved ? <Alert variant="warn">Unsaved edits would be lost</Alert> : null}
        {switchFailed ? <Alert variant="warn">Couldn't open Android's Home settings</Alert> : null}
        <div className="flex flex-col gap-2">
          {withoutWebView ? null : <Button autoFocus loading={saving} disabled={!onReload && !saving} onClick={onReload}>Reload</Button>}
          {unsaved && onReloadAnyway ? <Button variant="destructive" onClick={onReloadAnyway}>Reload anyway</Button> : null}
          {asHome ? <Button variant="secondary" loading={switching} disabled={!onSwitchHome && !switching} onClick={onSwitchHome}>Switch Home</Button> : null}
        </div>
        <details className="text-sm text-muted-foreground">
          <summary className="flex min-h-11 cursor-pointer items-center">Diagnostics</summary>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-secondary p-3 font-mono text-xs text-secondary-foreground">
            <dt>failure</dt>
            <dd>{kinds[kind]}</dd>
            <dt>version</dt>
            <dd>{version}</dd>
            <dt>platform</dt>
            <dd>{platform}</dd>
          </dl>
        </details>
      </div>
    </div>
  );
}
