import { Clock, Star } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { PrivateMark } from "./PrivateMark.tsx";
import { PrivateNotice } from "./PrivateNotice.tsx";

const icons = { history: Clock, bookmark: Star };

export interface BrowserAddressChoice {
  url: string;
  kind: keyof typeof icons;
  title: string;
  detail: string;
}

export interface BrowserAddressChoicesProps {
  choices: readonly BrowserAddressChoice[];
  onOpen: (url: string) => void;
  refusal?: string;
  privateTab?: boolean;
}

/** Local bookmark and history suggestions beneath the Browser's address field. */
export function BrowserAddressChoices({ choices, onOpen, refusal, privateTab }: BrowserAddressChoicesProps) {
  return (
    <section aria-label="Address suggestions" className="absolute inset-x-0 top-25 bottom-0 z-20 overflow-y-auto bg-background pt-1.5 pb-35">
      {privateTab && <PrivateNotice icon={<PrivateMark aria-hidden className="size-4.5 shrink-0 self-center" />} className="mx-5.5 mt-2.5 mb-3 flex items-baseline gap-2.5" />}
      {refusal && <p role="alert" className="mx-5.5 py-2 text-base">{refusal}</p>}
      <ul>
        {choices.map(({ url, kind, title, detail }) => {
          const Icon = icons[kind];
          return (
            <li key={url}>
              <button type="button" className={cn(focusRing, "flex min-h-15 w-full items-center gap-4 px-5.5 text-left active:bg-accent")} onClick={() => onOpen(url)}>
                <Icon aria-hidden className="size-4.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-prose">{title}</span>
                  <span className="mt-0.5 block truncate text-fine text-muted-foreground">{detail}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
