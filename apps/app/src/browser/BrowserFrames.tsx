// spec/app/browser/address.md, "A browser frame can be shown for the latest request, with no secure mark"; spec/app/browser/index.md, "Story: Open, pick and close tabs"
import { ExternalLink } from "lucide-react";
import { useSyncExternalStore } from "react";
import { TabHost } from "../platform/browser.vibe";
import { emptyFrames } from "../platform/browserWeb.vibe";
import type { Alpha } from "../runtime/area.tsx";

const noFrames = () => emptyFrames;
const noChanges = () => () => {};

/** Web frames stay mounted under the Shell as its views and overlays change. */
export function BrowserFrames({ alpha }: { alpha: Alpha }) {
  const web = alpha.runtime.runSync(TabHost).web;
  const { frames, placement } = useSyncExternalStore(web?.subscribe ?? noChanges, web?.snapshot ?? noFrames, noFrames);
  return frames.map(({ id, load, url, privateTab }) => {
    const position = placement?.id === id ? placement : undefined;
    return (
      <section key={id} hidden={position === undefined} inert={position === undefined}
        data-alpha-browser-frame="" className="fixed flex flex-col overflow-hidden bg-background"
        style={position ? { left: position.x, top: position.y, width: position.width, height: position.height } : undefined}>
        {!privateTab && <a href={url} rel="noopener noreferrer" target="_blank" className="flex min-h-7.75 items-center justify-end gap-1.5 px-3 py-2 text-label underline">
          Open in browser <ExternalLink aria-hidden className="size-3.5" />
        </a>}
        <iframe key={load} title="Website" src={url} referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
          onLoad={() => web?.loaded(id, load)} className="min-h-0 w-full flex-1 border-0" />
      </section>
    );
  });
}
