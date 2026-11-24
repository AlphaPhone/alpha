// spec/site/index.md, "Story: Watch Alpha at work"
import mark from "@repo/design-system/mark.svg";
import { Button, Mark, cn } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Pause, Play } from "lucide-react";
import type { Machine } from "../gen/site.effect.vibe";
import { useMachine } from "../gen/site.react.ts";
import { type Demo, type Part, type Scene, initial, shown } from "../gen/site.ts";
import { untimed } from "./demo.vibe";

export interface SiteProps {
  /** Provides the demo, `demo` of demo.vibe over the visitor's page. */
  runtime: ManagedRuntime.ManagedRuntime<Machine, unknown>;
}

const scenes: readonly { scene: Scene; capture: string }[] = [
  { scene: "Home", capture: "/alpha-home.webp" },
  { scene: "Chat", capture: "/alpha-chat.webp" },
  { scene: "Calendar", capture: "/alpha-calendar.webp" },
];

const events = [
  { at: "13:00", time: "1:00 PM", title: "Lunch · Priya", part: "FirstEvent" },
  { at: "15:00", time: "3:00 PM", title: "Design review", part: "SecondEvent" },
] as const;

/** The staged conversation over the chat's capture: each part from its beat, fading in unless the scene is shown whole. */
function Conversation({ demo }: { demo: Demo }) {
  const part = (which: Part) => cn(!shown(demo, which) && "invisible", !demo.whole && "motion-safe:animate-fade");
  return (
    <>
      <div className="absolute inset-x-0 top-[82%] bottom-[11%] bg-card" />
      <div className="absolute inset-x-[5%] top-[49%] text-xs text-card-foreground">
        <p className={cn("ml-auto w-fit max-w-[88%] rounded-xl rounded-br-sm bg-primary px-2.5 py-2 font-medium text-primary-foreground", part("Asked"))}>
          What’s on my calendar today?
        </p>
        <div className={cn("absolute mt-3 flex gap-1 rounded-xl bg-muted p-2.5", part("Typing"))}>
          {[0, 1, 2].map((dot) => <i key={dot} className="size-1 rounded-full bg-muted-foreground" />)}
        </div>
        <p className={cn("mt-3 mb-2 font-medium", part("Answered"))}>Two things this afternoon.</p>
        {events.map((event) => (
          <div key={event.at} className={cn("mt-1 flex min-h-8 items-center gap-2.5 rounded-sm border border-l-2 border-border border-l-primary bg-background px-2.5", part(event.part))}>
            <time dateTime={event.at} className="w-14 shrink-0 whitespace-nowrap text-muted-foreground tabular-nums">{event.time}</time>
            <strong className="font-semibold">{event.title}</strong>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Alpha's public page: its name, the links to its source and to Alpha Compute, and a phone that plays Home, the chat
 * and the Calendar, with a control for each scene and one to pause, each offered exactly when the rules allow it.
 * @model spec/site/index.md
 */
export function Site({ runtime }: SiteProps) {
  const { state, can, send } = useMachine(runtime);
  const demo = state ?? initial;
  const toggle = { type: "toggle", now: untimed } as const;
  return (
    <div className="mx-auto max-w-[94rem] px-6 md:px-12">
      <link rel="icon" href={mark} type="image/svg+xml" />
      <header className="flex min-h-22 items-center justify-between">
        <span className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          <Mark aria-hidden className="text-alpha" />
          Alpha
        </span>
        <Button asChild variant="outline" size="sm">
          <a href="https://github.com/eliza-research/alpha">GitHub</a>
        </Button>
      </header>
      <main className="grid min-h-[calc(100svh-5.5rem)] items-center gap-8 pb-10 lg:grid-cols-[0.83fr_1.17fr]">
        <div className="text-center lg:text-left">
          <h1 className="text-5xl font-semibold lg:text-6xl">
            Your phone.
            <br />
            <em className="font-display font-light text-primary not-italic">Your agent.</em>
          </h1>
          <a className="mt-6 inline-flex gap-1 text-base text-muted-foreground hover:text-primary" href="https://alphacompute.ai/">
            Built by <strong className="font-semibold text-foreground underline decoration-border underline-offset-4">Alpha Compute</strong>
          </a>
        </div>
        <section aria-label="Alpha phone demo" className="flex flex-col items-center gap-8 overflow-hidden rounded-sheet border border-border bg-secondary py-12 perspective-distant">
          <div
            role="img"
            aria-label="Alpha Home, a chat asking about today’s calendar, and the Calendar app on a phone."
            className="relative aspect-[370/813] w-64 -rotate-z-6 rotate-x-6 -rotate-y-12 rounded-sheet bg-foreground p-1.5 shadow-lg transform-3d"
          >
            <div className="relative size-full overflow-hidden rounded-tile bg-background">
              {scenes.map(({ scene, capture }) => (
                <div key={scene} className={cn("absolute inset-0 transition-opacity duration-slow ease-standard", demo.scene === scene ? "opacity-100" : "invisible opacity-0")}>
                  <img className="block size-full" src={capture} width={370} height={813} alt="" fetchPriority={scene === "Home" ? "high" : undefined} />
                  {scene === "Chat" && <Conversation demo={demo} />}
                </div>
              ))}
            </div>
          </div>
          {demo.started && (
            <div role="group" aria-label="Phone demo controls" className="flex items-center rounded-full border border-border bg-background px-1 shadow-sm">
              {scenes.map(({ scene }) => {
                const pick = { type: "pick", scene, now: untimed } as const;
                const current = demo.scene === scene;
                return (
                  <Button key={scene} variant="ghost" size="icon" aria-label={`Show ${scene}`} aria-pressed={current} disabled={!can(pick)} className="disabled:opacity-100" onClick={() => void send(pick)}>
                    <span className={cn("h-1.5 rounded-full transition-all duration-base", current ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground")} />
                  </Button>
                );
              })}
              <Button variant="ghost" size="icon" aria-label="Pause automatic playback" aria-pressed={!demo.playing} disabled={!can(toggle)} onClick={() => void send(toggle)}>
                {demo.playing ? <Pause /> : <Play />}
              </Button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
