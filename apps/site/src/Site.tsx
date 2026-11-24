// spec/site/index.md, "Story: Watch Alpha at work"
import { Button, Mark, cn } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Pause, Play } from "lucide-react";
import type { Machine } from "../gen/site.effect.vibe";
import { useMachine } from "../gen/site.react.ts";
import { type Demo, type Part, type Scene, initial, running, shown } from "../gen/site.ts";
import calendar from "./alpha-calendar.webp";
import chat from "./alpha-chat.webp";
import home from "./alpha-home.webp";
import { untimed } from "./demo.vibe";

export interface SiteProps {
  runtime: ManagedRuntime.ManagedRuntime<Machine, unknown>;
}

const scenes: readonly { scene: Scene; capture: string }[] = [
  { scene: "Home", capture: home },
  { scene: "Chat", capture: chat },
  { scene: "Calendar", capture: calendar },
];

const events = [
  { at: "13:00", time: "1:00 PM", title: "Lunch · Priya", part: "FirstEvent" },
  { at: "15:00", time: "3:00 PM", title: "Design review", part: "SecondEvent" },
] as const;

function Conversation({ demo }: { demo: Demo }) {
  const enter = !demo.whole && "motion-safe:animate-enter";
  const at = (part: Part) => shown(demo, part);
  return (
    <>
      <div className="absolute inset-x-0 top-[82%] bottom-[11%] bg-card" />
      <div className="absolute inset-x-[5%] top-[49%] leading-snug text-card-foreground" style={{ fontSize: "4.3cqw" }}>
        {at("Asked") && (
          <p className={cn("ml-auto w-fit max-w-[88%] rounded-xl rounded-br-sm bg-primary px-[0.8em] py-[0.65em] font-medium text-primary-foreground", enter)}>
            What’s on my calendar today?
          </p>
        )}
        {at("Typing") && (
          <div className={cn("absolute mt-[1em] flex items-center gap-[0.28em] rounded-xl bg-muted p-[0.72em]", enter)}>
            {[0, 1, 2].map((dot) => <i key={dot} className="size-[0.31em] rounded-full bg-muted-foreground motion-safe:animate-typing" style={{ animationDelay: `${dot * 110}ms` }} />)}
          </div>
        )}
        {at("Answered") && <p className={cn("mt-[1em] mb-[0.6em] font-medium", enter)}>Two things this afternoon.</p>}
        {events.filter((event) => at(event.part)).map((event) => (
          <div key={event.at} className={cn("mt-[0.37em] flex min-h-[2.3em] items-center gap-[0.75em] rounded-sm border border-l-[0.19em] border-border border-l-primary bg-background px-[0.7em]", enter)}>
            <time dateTime={event.at} className="w-[3.7em] shrink-0 whitespace-nowrap text-muted-foreground tabular-nums">{event.time}</time>
            <strong className="font-semibold">{event.title}</strong>
          </div>
        ))}
      </div>
    </>
  );
}

/** @model spec/site/index.md */
export function Site({ runtime }: SiteProps) {
  const { state, can, send } = useMachine(runtime);
  const demo = state ?? initial;
  const toggle = { type: "toggle", now: untimed } as const;
  const still = !running(demo) && "[&_*]:[animation-play-state:paused]";
  return (
    <div className="mx-auto max-w-[94rem] px-[clamp(1.5rem,5vw,4.5rem)]">
      <header className="flex min-h-19 items-center justify-between md:min-h-22">
        <span className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          <Mark aria-hidden className="text-alpha" />
          Alpha
        </span>
        <Button asChild variant="outline" size="sm">
          <a href="https://github.com/eliza-research/alpha">GitHub</a>
        </Button>
      </header>
      <main className="grid min-h-[calc(100svh-5.5rem)] items-center gap-7 py-6 md:grid-cols-[0.83fr_1.17fr] md:gap-[clamp(1.75rem,4.3vw,4.5rem)] md:pt-2 md:pb-11">
        <div className="text-center md:ps-[clamp(0rem,1.25vw,1rem)] md:text-left">
          <h1 className="text-5xl font-semibold xl:text-6xl">
            Your phone.
            <br />
            <em className="font-display font-light text-primary not-italic">Your agent.</em>
          </h1>
          <a className="mt-4 inline-flex gap-1 text-base text-muted-foreground hover:text-primary md:mt-[clamp(1.25rem,4vw,2.625rem)]" href="https://alphacompute.ai/">
            Built by <strong className="font-semibold text-foreground underline decoration-border underline-offset-4">Alpha Compute</strong>
          </a>
        </div>
        <section
          aria-label="Alpha phone demo"
          className="relative isolate grid min-h-[clamp(29rem,142vw,41rem)] place-items-center overflow-hidden rounded-sheet border border-border bg-secondary bg-radial-[at_38%_18%] from-background to-secondary to-52% perspective-distant md:min-h-[clamp(34rem,calc(100svh-8.75rem),50rem)]"
        >
          <div aria-hidden className="absolute right-[13%] bottom-[13%] left-[19%] h-[13%] -rotate-10 bg-radial from-foreground/25 to-transparent to-68% blur-md" />
          <div
            role="img"
            aria-label="Alpha Home, a chat asking about today’s calendar, and the Calendar app on a phone."
            className={cn("relative mb-16 aspect-[370/813] w-[clamp(10rem,55vw,16rem)] -rotate-z-9 rotate-x-9 -rotate-y-17 transform-3d motion-safe:animate-float md:mb-13 md:w-[clamp(13rem,min(23vw,calc((100svh-15rem)*0.45)),20rem)]", still)}
          >
            <div className="absolute inset-0 -translate-z-[15px] rounded-sheet bg-foreground shadow-lg" />
            <div className="absolute inset-0 -translate-z-[7px] rounded-sheet bg-linear-[154deg] from-muted-foreground via-foreground to-muted-foreground ring-1 ring-background/45 ring-inset" />
            {["top-1/4", "top-[37%]"].map((at) => <div key={at} className={cn("absolute -left-1 h-[9%] w-[5px] -translate-z-[8px] rounded-full bg-muted-foreground", at)} />)}
            <div className="absolute inset-0 translate-z-px rounded-sheet bg-foreground ring-2 ring-muted-foreground ring-inset">
              <div className="absolute inset-[5px] @container overflow-hidden rounded-tile bg-background">
                {scenes.map(({ scene, capture }) => (
                  <div key={scene} className={cn("absolute inset-0 transition-opacity duration-slow ease-standard motion-reduce:transition-none", demo.scene === scene ? "z-10 opacity-100" : "opacity-0")}>
                    <img className="block size-full" src={capture} width={370} height={813} alt="" fetchPriority={scene === "Home" ? "high" : undefined} />
                    {scene === "Chat" && <Conversation demo={demo} />}
                  </div>
                ))}
              </div>
              <span className="pointer-events-none absolute top-[2.5%] left-1/2 z-20 aspect-square w-[2.7%] -translate-x-1/2 rounded-full bg-foreground ring-1 ring-muted-foreground" />
            </div>
          </div>
          {demo.started && (
            <div role="group" aria-label="Phone demo controls" className="absolute bottom-[clamp(0.75rem,3vw,1.35rem)] z-20 flex items-center rounded-full border border-border bg-background/80 px-1 shadow-sm">
              {scenes.map(({ scene }) => {
                const pick = { type: "pick", scene, now: untimed } as const;
                const current = demo.scene === scene;
                return (
                  <Button
                    key={scene}
                    variant="ghost"
                    size="icon"
                    aria-label={`Show ${scene}`}
                    aria-pressed={current}
                    aria-disabled={!can(pick)}
                    className="aria-disabled:opacity-100"
                    onClick={() => can(pick) && void send(pick)}
                  >
                    <span className={cn("h-1.5 rounded-full transition-all duration-base motion-reduce:transition-none", current ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground")} />
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
