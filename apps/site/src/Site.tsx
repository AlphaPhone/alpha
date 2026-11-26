// spec/site/index.md, "Story: Walk through what Alpha does"
import { Button, Mark, cn } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { ArrowUp, Bell, Calendar, Camera, Check, CheckCheck, ChevronDown, Clock, File, Folder, Globe, Image, Mail, MapPin, MessageCircle, Mic, Settings, Workflow } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import type { Machine } from "../gen/site.effect.vibe";
import { useMachine } from "../gen/site.react.ts";
import { type Demo, type Scene, during, initial, shows, talking } from "../gen/site.ts";

export interface SiteProps {
  runtime: ManagedRuntime.ManagedRuntime<Machine, unknown>;
}

type Talk = Exclude<Scene, "Home" | "Voice">;

const source = "https://github.com/eliza-research/alpha";
const gutter = "mx-auto w-full max-w-[80rem] px-[clamp(1.25rem,5vw,4rem)]";
const enter = "motion-safe:animate-[enter_460ms_cubic-bezier(0.19,1,0.22,1)_both]";
const grow = "motion-safe:animate-[grow_460ms_cubic-bezier(0.19,1,0.22,1)_both]";
const fade = "motion-safe:animate-[fade_320ms_ease-out_both]";
const reveal = "motion-safe:animate-[reveal_1000ms_steps(26)_both]";
const caps = "font-bold tracking-caps uppercase";
const display = "font-display font-light [font-size:1.1em] [letter-spacing:-0.05em] not-italic";

const asked: Record<Talk, string> = {
  Calendar: "What’s on my calendar today?",
  Text: "Text Priya I’m running 10 minutes late",
  Maps: "Coffee near lunch?",
  Inbox: "What needs me in my inbox?",
};

const talks: readonly Talk[] = ["Calendar", "Text", "Maps", "Inbox"];

const typedInTheBox: readonly Talk[] = ["Text", "Maps", "Inbox"];

const apps = [
  { name: "Inbox", icon: Mail, unread: true },
  { name: "Calendar", icon: Calendar },
  { name: "Browser", icon: Globe },
  { name: "Camera", icon: Camera },
  { name: "Photos", icon: Image },
  { name: "Maps", icon: MapPin },
  { name: "Notes", icon: File },
  { name: "Files", icon: Folder },
  { name: "Workflows", icon: Workflow },
  { name: "Settings", icon: Settings },
  { name: "Clock", icon: Clock },
  { name: "Reminders", icon: Bell },
];

const events = [
  { at: "13:00", time: "1:00 PM", title: "Lunch · Priya", where: "Guerrero St", from: 4, next: false },
  { at: "15:00", time: "3:00 PM", title: "Design review", where: "Video call", from: 5, next: true },
];

const places = [
  { name: "Fog & Filter", walk: "3 min", from: 5, spot: "top-[26%] left-[62%]" },
  { name: "Paper Crane Coffee", walk: "4 min", from: 6, spot: "top-[70%] left-[24%]" },
  { name: "Second Sun", walk: "5 min", from: 7, spot: "top-[60%] left-[82%]" },
];

const roads = ["inset-x-[-10%] top-[34%] h-11 -rotate-7", "inset-x-[-10%] top-[74%] h-7 -rotate-7", "inset-y-[-20%] left-[26%] w-8 -rotate-7", "inset-y-[-20%] left-[58%] w-11 -rotate-7", "inset-y-[-20%] left-[86%] w-6 rotate-24"];

const mail = [
  { initials: "NP", sender: "Northpoint", gist: "Wants a date for the partner dinner by Friday.", from: 4 },
  { initials: "DO", sender: "Dana Okafor", gist: "Contract redlines, with two questions for you.", from: 5 },
  { initials: "BO", sender: "Building office", gist: "Water is off Thursday from 9 to 11.", from: 6 },
];

const spoken = ["Take a note.", "The studio", "gate code", "is 4417."];

function GitHub(props: ComponentProps<"svg">) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function Orb({ className }: { className: string }) {
  return (
    <span className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-alpha", className)}>
      <Mark aria-hidden className="size-[116%] text-alpha-foreground opacity-50 motion-safe:animate-[turn_40s_linear_infinite]" />
    </span>
  );
}

function Touch({ light = false, className }: { light?: boolean; className?: string }) {
  return <span data-touch className={cn("pointer-events-none absolute top-1/2 left-1/2 size-46 -translate-1/2 rounded-full motion-safe:animate-[touch_800ms_ease-out_both] motion-reduce:hidden", light ? "bg-primary-foreground/50" : "bg-foreground/30", className)} />;
}

function Part({ turn = false, children }: { turn?: boolean; children: ReactNode }) {
  return (
    <div className={cn("grid shrink-0 grid-rows-[1fr]", grow)}>
      <div className={cn("flex min-h-0 flex-col overflow-hidden", turn ? "pt-16" : "pt-8")}>{children}</div>
    </div>
  );
}

function Said({ children }: { children: ReactNode }) {
  return (
    <Part turn>
      <p className="max-w-[86%] self-end bg-primary px-14 py-10 font-medium text-primary-foreground [border-radius:--spacing(20)_--spacing(20)_--spacing(6)_--spacing(20)]">{children}</p>
    </Part>
  );
}

function Answer({ thinking = false, children }: { thinking?: boolean; children: ReactNode }) {
  return (
    <Part>
      <div className="flex min-h-22 items-start gap-8 px-2 pt-2 font-medium">
        <Orb className="mt-1.5 size-18" />
        {thinking
          ? <span data-typing className="flex h-20.5 items-center gap-4">{[0, 130, 260].map((delay) => <i key={delay} className="size-5.5 rounded-full bg-primary motion-safe:animate-[typing_900ms_ease-in-out_infinite]" style={{ animationDelay: `${delay}ms` }} />)}</span>
          : <span className={fade}>{children}</span>}
      </div>
    </Part>
  );
}

function Chip({ go = false, className, children }: { go?: boolean; className?: string; children: ReactNode }) {
  return <span className={cn("relative inline-flex h-40 items-center gap-6 rounded-full px-16 font-semibold transition-transform duration-base ease-standard [font-size:--spacing(14)]", go ? "bg-primary text-primary-foreground" : "bg-secondary", className)}>{children}</span>;
}

// spec/site/index.md, "The conversation is open for the four questions and keeps what was said, a part showing from its beat on and what passes only during its beats"
function Turn({ demo, scene }: { demo: Demo; scene: Talk }) {
  const at = (from: number) => shows(demo, scene, from);
  const passing = (from: number, until: number) => during(demo, scene, from, until);
  const exchange = (answer: string) => (
    <>
      {at(1) && <Said>{asked[scene]}</Said>}
      {at(2) && <Answer thinking={passing(2, 3)}>{answer}</Answer>}
    </>
  );
  switch (scene) {
    case "Calendar":
      return (
        <>
          {exchange("Two things this afternoon.")}
          {events.filter((event) => at(event.from)).map((event) => (
            <Part key={event.at}>
              <div className={cn("flex min-h-58 items-center gap-12 px-14 py-9 [border-radius:--spacing(16)] [font-size:--spacing(14.5)]", event.next ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                <time dateTime={event.at} className={cn("w-60 shrink-0 tabular-nums [font-size:--spacing(12.5)]", event.next ? "text-primary-foreground/80" : "text-muted-foreground")}>{event.time}</time>
                <span>
                  <strong className="block font-semibold">{event.title}</strong>
                  <small className={cn("block [font-size:--spacing(12.5)]", event.next ? "text-primary-foreground/80" : "text-muted-foreground")}>{event.where}</small>
                </span>
              </div>
            </Part>
          ))}
        </>
      );
    case "Text":
      return (
        <>
          {exchange("Here’s the text. Send it?")}
          {at(3) && (
            <Part>
              <div className="border border-border bg-background p-14 [border-radius:--spacing(22)]">
                <div className={cn("flex items-center gap-7 text-muted-foreground [font-size:--spacing(11)]", caps)}>
                  <MessageCircle className="size-15" />
                  Text message
                </div>
                <p className="mt-12 font-semibold"><span className="mr-6 font-normal text-muted-foreground">To</span>Priya Shah</p>
                <p className="mt-8 bg-secondary px-13 py-11 [border-radius:--spacing(14)]">Running about 10 minutes late. See you at 1:10!</p>
                <div className="mt-12 flex h-40 items-center justify-end gap-8">
                  {at(5)
                    ? <span className={cn("flex items-center gap-6 font-semibold text-ok [font-size:--spacing(14)]", fade)}><CheckCheck className="size-18" />Sent</span>
                    : (
                      <>
                        <Chip>Cancel</Chip>
                        <Chip go className={cn(passing(4, 5) && "scale-94")}>
                          <Check className="size-16" />
                          Send
                          {passing(4, 5) && <Touch light />}
                        </Chip>
                      </>
                    )}
                </div>
              </div>
            </Part>
          )}
          {at(6) && <Answer>I’ll tell you when she replies.</Answer>}
        </>
      );
    case "Maps":
      return (
        <>
          {exchange("Three within a five-minute walk.")}
          {at(4) && (
            <Part>
              <div className="relative h-150 overflow-hidden bg-accent [border-radius:--spacing(18)]">
                {roads.map((road) => <i key={road} className={cn("absolute bg-background", road)} />)}
                <i className="absolute top-[46%] left-[2%] h-[22%] w-[19%] -rotate-7 bg-ok/20 [border-radius:--spacing(6)]" />
                <b className="absolute top-[56%] left-[46%] grid size-34 -translate-1/2 place-items-center rounded-full bg-primary/15">
                  <i className="size-14 rounded-full border-background bg-primary [border-style:solid] [border-width:--spacing(3)]" />
                </b>
                {places.map((place, index) => (
                  <b key={place.name} className={cn("absolute -mt-12 -ml-12 grid size-24 place-items-center rounded-full bg-foreground font-bold text-background shadow-sm motion-safe:animate-[drop_520ms_cubic-bezier(0.19,1,0.22,1)_both] [font-size:--spacing(12)]", place.spot)} style={{ animationDelay: `${120 + index * 140}ms` }}>{index + 1}</b>
                ))}
              </div>
            </Part>
          )}
          {places.filter((place) => at(place.from)).map((place, index) => (
            <Part key={place.name}>
              <div className="flex items-center gap-11 px-4 py-5 [font-size:--spacing(14.5)]">
                <b className="grid size-22 shrink-0 place-items-center rounded-full bg-foreground font-bold text-background [font-size:--spacing(11.5)]">{index + 1}</b>
                <strong className="flex-1 font-semibold">{place.name}</strong>
                <span className="text-muted-foreground [font-size:--spacing(13)]">{place.walk}</span>
              </div>
            </Part>
          ))}
        </>
      );
    case "Inbox":
      return (
        <>
          {exchange("Three need you. The other 41 can wait.")}
          {mail.filter((message) => at(message.from)).map((message) => (
            <Part key={message.sender}>
              <div className="flex items-center gap-11 bg-secondary px-12 py-10 [border-radius:--spacing(16)] [font-size:--spacing(14.5)]">
                <span className="grid size-36 shrink-0 place-items-center rounded-full bg-background font-bold [font-size:--spacing(11.5)]">{message.initials}</span>
                <span>
                  <strong className="block font-semibold">{message.sender}</strong>
                  <small className="block text-muted-foreground [font-size:--spacing(12.5)]">{message.gist}</small>
                </span>
              </div>
            </Part>
          ))}
          {at(7) && (
            <Part>
              <div className="flex gap-8 pt-2">
                <Chip go className={cn(passing(8, 9) && "scale-94")}>
                  Draft replies
                  {passing(8, 9) && <Touch light />}
                </Chip>
                <Chip>Show all</Chip>
              </div>
            </Part>
          )}
          {at(9) && <Answer>Three drafts are ready for you to check.</Answer>}
        </>
      );
    default: {
      const _exhaustive: never = scene;
      return _exhaustive;
    }
  }
}

function Phone({ demo }: { demo: Demo }) {
  const open = talking(demo);
  const asking = shows(demo, "Home", 1);
  const draft = typedInTheBox.find((scene) => during(demo, scene, 0, 1));
  const heard = (from: number) => shows(demo, "Voice", from);
  return (
    <div
      role="img"
      aria-label="An Alpha phone playing what Alpha does, over and over: it answers a question about today’s calendar, asks before it sends a text, finds coffee on a map, sums up an inbox and takes a spoken note."
      data-scene={demo.scene}
      className="relative aspect-[372/792] w-[min(72vw,20rem)] max-w-full bg-foreground p-[1.55%] shadow-lg [border-radius:13.5%/6.4%] md:h-[min(calc(100svh-11.5rem),46rem)] md:w-auto"
    >
      <div className="@container relative size-full overflow-hidden bg-background select-none [border-radius:12.4%/5.8%]">
        <div aria-hidden className="absolute inset-0 leading-snug [--spacing:calc(100cqw/360)] [font-size:--spacing(15)]">
          <span className="absolute top-13 left-1/2 z-10 size-11 -translate-x-1/2 rounded-full bg-foreground" />

          <div className={cn("absolute inset-0 px-16 pt-40 transition-[scale,opacity] duration-slow ease-standard motion-reduce:transition-none", open && "scale-97 opacity-60")}>
            <div className="-mr-16 flex gap-12 overflow-hidden">
              <div className="flex h-210 w-252 shrink-0 flex-col justify-between bg-alpha px-20 py-22 text-alpha-foreground [border-radius:--spacing(28)]">
                <div className="flex justify-between font-semibold [font-size:--spacing(13)]">3:00 PM<Calendar className="size-22" /></div>
                <strong className="mb-52 font-display font-light [font-size:--spacing(24)]">Design review</strong>
              </div>
              <div className="flex h-210 w-252 shrink-0 flex-col justify-between bg-secondary px-20 py-22 [border-radius:--spacing(28)]">
                <strong className="mt-72 font-semibold [font-size:--spacing(16)]">Morning brief</strong>
                <span className="text-muted-foreground [font-size:--spacing(12)]">7:02 AM</span>
              </div>
            </div>
            <ul className="mt-24 grid grid-cols-4 gap-y-18 text-center text-muted-foreground [font-size:--spacing(11.5)]">
              {apps.map(({ name, icon: Icon, unread }) => (
                <li key={name} className="grid justify-items-center gap-8">
                  <span className="relative grid size-58 place-items-center bg-secondary text-foreground [border-radius:--spacing(19)]">
                    <Icon className="size-25" />
                    {unread && <i className="absolute top-10 right-10 size-8 rounded-full bg-primary" />}
                  </span>
                  {name}
                </li>
              ))}
            </ul>
            <div className="absolute inset-x-10 bottom-20 flex h-64 items-center gap-11 rounded-full bg-background pr-18 pl-10 text-muted-foreground shadow-lg">
              <Orb className="size-42" />
              {asking
                ? <span data-question className={cn("min-w-0 flex-1 truncate text-foreground [font-size:--spacing(15.5)]", reveal)}>{asked.Calendar}</span>
                : <span className="min-w-0 flex-1 truncate [font-size:--spacing(15.5)]">Ask Alpha</span>}
              <span className="relative">
                <Mic className="size-22 text-foreground" />
                {during(demo, "Voice", 0, 1) && <Touch />}
              </span>
              {asking && <Touch className="left-[36%]" />}
            </div>
          </div>

          <div data-sheet={open ? "open" : "closed"} className={cn("absolute inset-x-0 bottom-0 flex max-h-[calc(100%_-_--spacing(56))] flex-col bg-card shadow-sheet transition-transform duration-slow ease-standard motion-reduce:transition-none [border-radius:--spacing(28)_--spacing(28)_0_0]", open ? "translate-y-0" : "translate-y-[104%]")}>
            <span className="absolute top-8 left-1/2 h-4 w-36 -translate-x-1/2 rounded-full bg-input" />
            <div className="flex h-60 shrink-0 items-center gap-10 px-16 pt-12">
              <Orb className="size-28" />
              <strong className="flex-1 font-semibold">Alpha</strong>
              <ChevronDown className="size-22" />
            </div>
            <div className="mx-14 flex min-h-0 flex-col justify-end overflow-hidden">
              {talks.map((scene) => <Turn key={scene} demo={demo} scene={scene} />)}
            </div>
            <i className="pointer-events-none absolute inset-x-0 top-60 h-14 bg-linear-to-b from-card to-transparent" />
            <div className="mx-10 mt-14 mb-18 flex h-56 shrink-0 items-center gap-10 rounded-full bg-secondary pr-8 pl-20 text-muted-foreground">
              {draft === undefined
                ? <span className="min-w-0 flex-1 truncate">Message Alpha</span>
                : <span key={draft} data-draft className={cn("min-w-0 flex-1 truncate text-foreground", reveal)}>{asked[draft]}</span>}
              <span className="grid size-40 shrink-0 place-items-center rounded-full bg-foreground text-background">
                {draft === undefined ? <Mic className="size-19" /> : <ArrowUp className="size-19" />}
              </span>
            </div>
          </div>

          <div className={cn("absolute inset-0 flex flex-col items-center bg-background px-26 pt-84 pb-36 transition-opacity duration-slow ease-standard motion-reduce:transition-none", heard(1) ? "opacity-100" : "invisible opacity-0")}>
            {heard(1) && (
              <>
                <span className={cn("text-muted-foreground [font-size:--spacing(11)]", caps)}>Listening</span>
                <span className="relative mt-64 grid place-items-center">
                  {[0, 1100].map((delay) => <i key={delay} className="absolute inset-0 rounded-full bg-primary opacity-0 motion-safe:animate-[listen_2200ms_ease-out_infinite]" style={{ animationDelay: `${delay}ms` }} />)}
                  <Orb className="size-132" />
                </span>
                <p className="mt-66 min-h-110 text-center font-display leading-tight font-light text-balance [font-size:--spacing(29)]">
                  {spoken.filter((_, index) => heard(index + 2)).map((words) => <span key={words} className={fade}>{words} </span>)}
                </p>
                {heard(6) && (
                  <div className={cn("mt-auto flex items-center gap-12 self-stretch bg-secondary px-16 py-14 [border-radius:--spacing(20)]", enter)}>
                    <File className="size-22" />
                    <span className="flex-1">
                      <strong className="block font-semibold">Studio gate code</strong>
                      <small className="block text-muted-foreground [font-size:--spacing(12.5)]">Saved to Notes</small>
                    </span>
                    <Check className="size-22 text-ok" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** @model spec/site/index.md */
export function Site({ runtime }: SiteProps) {
  const { state } = useMachine(runtime);
  const demo = state ?? initial;
  return (
    <div className="flex min-h-svh flex-col overflow-x-clip">
      <header className={cn("flex h-18 shrink-0 items-center justify-between gap-4", gutter)}>
        <a href="/" className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          <Mark aria-hidden className="text-alpha" />
          Alpha
        </a>
        <Button asChild variant="outline" size="sm">
          <a href={source}><GitHub className="size-4.5" />GitHub</a>
        </Button>
      </header>
      <main className={cn("grid flex-1 items-center gap-y-10 pt-4 pb-8 md:grid-cols-[minmax(0,1fr)_minmax(19rem,0.82fr)] md:gap-x-[clamp(2rem,6vw,6rem)] md:py-4", gutter)}>
        <section className="flex flex-col items-start gap-7">
          <h1 className="font-semibold [font-size:clamp(3.25rem,6.4vw,6.5rem)] leading-none [letter-spacing:-0.062em] [word-spacing:0.045em]">
            Your phone.
            <br />
            <em className={cn("text-primary", display)}>Your agent.</em>
          </h1>
          <p className="max-w-[31rem] text-pretty text-muted-foreground [font-size:clamp(1.125rem,1.5vw,1.3125rem)]">
            Alpha is an open-source phone with a personal agent built in. Ask for something, and it works across your mail, calendar, maps and messages to get it done.
          </p>
          <div className="hidden flex-wrap items-center gap-x-6 gap-y-4 md:flex">
            <Button asChild size="lg">
              <a href={source}><GitHub className="size-5" />Get Alpha on GitHub</a>
            </Button>
            <p className="text-base text-muted-foreground">Available now for <strong className="font-semibold text-foreground">Pixel 10</strong> and <strong className="font-semibold text-foreground">Pixel 10a</strong></p>
          </div>
        </section>
        <div className="grid place-items-center">
          <Phone demo={demo} />
        </div>
      </main>
      <footer className={cn("flex shrink-0 justify-center py-5 text-base", gutter)}>
        <a className="text-muted-foreground hover:text-primary" href="https://alphacompute.ai/">Built by <strong className="font-semibold text-foreground">Alpha Compute</strong></a>
      </footer>
    </div>
  );
}
