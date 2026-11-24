// spec/browser/presentation.md, "A page is wanted only on the uncovered Browser view of a live tab, and is otherwise withdrawn"; spec/browser/session.md, "A restored tab loads its saved address in the background the first time it is shown"; spec/browser/page.md, "A page that failed in a normal native tab offers another browser for the address the host named, and nothing else does"
import { ExternalLink, Globe } from "lucide-react";
import { offersElsewhere } from "../../../gen/browser__page.ts";
import { type Session, curTab } from "../../../gen/browser__session.ts";
import { pageErrorText, PROFILE_UNSUPPORTED } from "../../browser/messages.ts";
import { Button, EmptyState, Spinner } from "../components/ui/index.ts";
import { HOST_CHROME } from "./measure.ts";

/** The session whose selected tab the viewport stands in for, and how the screen measures it. */
export interface PageViewportProps {
  session: Session;
  /** Receives the viewport element as it mounts, to measure it; returns how to stop. */
  measure?: (viewport: HTMLElement) => () => void;
  /** The owner's Open in browser on a page that failed in a native tab. */
  onOpenElsewhere?: () => void;
}

/**
 * Where the selected tab's page is drawn. A native page sits below Alpha's WebView, so this area stays transparent over it; a new tab, a failed page and a missing WebView feature are shown here instead.
 * @model spec/browser/session.md
 */
export function PageViewport({ session, measure, onOpenElsewhere }: PageViewportProps) {
  const tab = curTab(session);
  const priv = tab.profile === "Private";
  const blank = tab.stage === "Unborn" && tab.restoreUrl === "" && tab.nav.url === "";
  const label = tab.page.failed ? pageErrorText(tab.page.problem) : tab.page.externalOnly ? "Open externally" : tab.page.loading ? "Loading website" : "Browser page";
  return (
    <div ref={(element) => (element && measure ? measure(element) : undefined)} data-browser-surfaces="" aria-label={label} className="relative min-h-0 flex-1 bg-transparent">
      {session.profileUnsupported === tab.id && <EmptyState title={PROFILE_UNSUPPORTED} icon={<Globe className="size-10" />} className="absolute inset-0 bg-background" />}
      {session.profileUnsupported !== tab.id && blank && (
        <EmptyState title={priv ? (session.host === "NativeHost" ? "Private · cleared on close" : "This tab is not saved in Alpha history. Website cookies and sign-ins are managed by your browser.") : "New tab"} icon={<Globe className="size-10" />} className="absolute inset-0 justify-center bg-background" />
      )}
      {tab.page.failed && (
        <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background p-8 text-center">
          <p>{pageErrorText(tab.page.problem)}</p>
          {session.host === "WebHost" && tab.page.url && <a href={tab.page.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary">Open in browser<ExternalLink aria-hidden className="size-4" /></a>}
          {onOpenElsewhere && offersElsewhere(tab.page, priv, session.host === "NativeHost") && (
            <Button {...{ [HOST_CHROME]: "" }} variant="outline" onClick={onOpenElsewhere}>Open in browser<ExternalLink aria-hidden className="size-4" /></Button>
          )}
        </div>
      )}
      {tab.page.loading && !tab.page.committed && <Spinner label="Loading website" className="absolute left-1/2 top-4 -translate-x-1/2" />}
    </div>
  );
}
