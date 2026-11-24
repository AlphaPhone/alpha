// spec/site/index.md, "Story: Walk through what Alpha does"
import { Button, Mark, cn } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { ArrowRight, Calendar, Camera, Check, ChevronDown, File, Folder, Globe, Image, LayoutGrid, Mail, MapPin, MessageCircle, Mic, Settings, Workflow } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import type { Machine } from "../gen/site.effect.vibe";
import { useMachine } from "../gen/site.react.ts";
import { type Demo, type Scene, during, initial, reached } from "../gen/site.ts";

export interface SiteProps {
  runtime: ManagedRuntime.ManagedRuntime<Machine, unknown>;
}

const source = "https://github.com/eliza-research/alpha";
const gutter = "mx-auto max-w-[80rem] px-[clamp(1.25rem,5vw,4rem)]";
const enter = "motion-safe:animate-[enter_460ms_cubic-bezier(0.19,1,0.22,1)_both]";
const caps = "font-bold tracking-caps uppercase";
const display = "font-display font-light [font-size:1.1em] [letter-spacing:-0.05em] not-italic";
const headline = "font-semibold text-balance [font-size:clamp(2.5rem,5.4vw,5rem)] leading-none [letter-spacing:-0.055em]";

const passages: readonly { scene: Scene; id: string; kicker: string; title: string; text: string }[] = [
  { scene: "Calendar", id: "calendar", kicker: "Calendar", title: "Ask about your day.", text: "Alpha reads your calendar and answers in a sentence, with the events right there to tap." },
  { scene: "Text", id: "messages", kicker: "Messages and calls", title: "It asks before it acts.", text: "Before it sends a text, places a call or changes an event, Alpha shows you exactly what it is about to do and waits for your yes." },
  { scene: "Maps", id: "maps", kicker: "Maps", title: "Find a place without opening an app.", text: "Answers arrive as a map and a short list, inside the conversation. Tap one to go." },
  { scene: "Inbox", id: "inbox", kicker: "Inbox", title: "Catch up on mail with one question.", text: "Alpha reads your Gmail and tells you what needs you. Then it drafts the replies for you to approve." },
  { scene: "Voice", id: "voice", kicker: "Voice", title: "Or just say it.", text: "Tap the mic and talk. Alpha listens, answers out loud and does the same work, hands free." },
];

const facts = [
  { title: "Runs on your device", text: "The agent, its memory and its database run on the phone itself. A cloud account supplies model inference, speech and Gmail." },
  { title: "Open source", text: "The phone’s interface, its built-in apps and the agent are all on GitHub. Read them, change them, build your own." },
  { title: "You stay in charge", text: "Alpha asks before it does anything that matters, and shows you what it is about to do." },
];

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
  { name: "Apps", icon: LayoutGrid },
];

const questions = ["What’s on my calendar today?", "Text Priya I’m running late", "Coffee near lunch?", "What needs me in my inbox?"];

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

const conversations: readonly Scene[] = ["Calendar", "Text", "Maps", "Inbox"];

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

function Said({ children }: { children: ReactNode }) {
  return <p className={cn("mb-6 max-w-[86%] self-end bg-primary px-14 py-10 font-medium text-primary-foreground [border-radius:--spacing(20)_--spacing(20)_--spacing(6)_--spacing(20)]", enter)}>{children}</p>;
}

function Typing() {
  return (
    <div data-typing className={cn("flex items-center gap-4 rounded-full bg-secondary p-13", enter)}>
      {[0, 130, 260].map((delay) => <i key={delay} className="size-5.5 rounded-full bg-muted-foreground motion-safe:animate-[typing_900ms_ease-in-out_infinite]" style={{ animationDelay: `${delay}ms` }} />)}
    </div>
  );
}

function Reply({ children }: { children: ReactNode }) {
  return <p className={cn("px-4 pt-2 pb-4 font-medium", enter)}>{children}</p>;
}

function Chip({ go = false, className, children }: { go?: boolean; className?: string; children: ReactNode }) {
  return <span className={cn("relative inline-flex h-40 items-center gap-6 rounded-full px-16 font-semibold transition-transform duration-base ease-standard [font-size:--spacing(14)]", go ? "bg-primary text-primary-foreground" : "bg-secondary", className)}>{children}</span>;
}

// spec/site/index.md, "A part of a scene shows from its beat on, the typing only during its own, and all but the typing when shown whole"
function Conversation({ demo }: { demo: Demo }) {
  const at = (from: number) => reached(demo, from);
  const typing = during(demo, 2);
  const sent = at(5);
  switch (demo.scene) {
    case "Calendar":
      return (
        <>
          {at(1) && <Said>What’s on my calendar today?</Said>}
          {typing && <Typing />}
          {at(3) && <Reply>Two things this afternoon.</Reply>}
          {events.filter((event) => at(event.from)).map((event) => (
            <div key={event.at} className={cn("flex min-h-58 items-center gap-12 self-stretch px-14 py-9 [border-radius:--spacing(16)] [font-size:--spacing(14.5)]", event.next ? "bg-primary text-primary-foreground" : "bg-secondary", enter)}>
              <time dateTime={event.at} className={cn("w-60 shrink-0 tabular-nums [font-size:--spacing(12.5)]", event.next ? "text-primary-foreground/80" : "text-muted-foreground")}>{event.time}</time>
              <span>
                <strong className="block font-semibold">{event.title}</strong>
                <small className={cn("block [font-size:--spacing(12.5)]", event.next ? "text-primary-foreground/80" : "text-muted-foreground")}>{event.where}</small>
              </span>
            </div>
          ))}
        </>
      );
    case "Text":
      return (
        <>
          {at(1) && <Said>Text Priya I’m running 10 minutes late</Said>}
          {typing && <Typing />}
          {at(3) && (
            <div className={cn("self-stretch border border-border bg-background p-14 shadow-md [border-radius:--spacing(22)]", enter)}>
              <div className={cn("flex items-center gap-7 text-muted-foreground [font-size:--spacing(11)]", caps)}>
                <MessageCircle className="size-15" />
                Text message
                {sent && <span className={cn("ml-auto text-ok", enter)}>Sent</span>}
              </div>
              <p className="mt-12 font-semibold"><span className="mr-6 font-normal text-muted-foreground">To</span>Priya Shah</p>
              <p className="mt-8 bg-secondary px-13 py-11 [border-radius:--spacing(14)]">Running about 10 minutes late. See you at 1:10!</p>
              {!sent && (
                <div className="mt-12 flex justify-end gap-8">
                  <Chip>Cancel</Chip>
                  <Chip go className={cn(during(demo, 4) && "scale-94")}>
                    <Check className="size-16" />
                    Send
                    {during(demo, 4) && <span data-touch className="absolute top-1/2 left-1/2 size-46 -translate-1/2 rounded-full bg-foreground/30 motion-safe:animate-[touch_900ms_ease-out_both]" />}
                  </Chip>
                </div>
              )}
            </div>
          )}
          {at(6) && <Reply>Sent. I’ll tell you when she replies.</Reply>}
        </>
      );
    case "Maps":
      return (
        <>
          {at(1) && <Said>Coffee near lunch?</Said>}
          {typing && <Typing />}
          {at(3) && <Reply>Three within a five-minute walk.</Reply>}
          {at(4) && (
            <div className={cn("relative h-150 self-stretch overflow-hidden bg-accent [border-radius:--spacing(18)]", enter)}>
              {roads.map((road) => <i key={road} className={cn("absolute bg-background", road)} />)}
              <i className="absolute top-[46%] left-[2%] h-[22%] w-[19%] -rotate-7 bg-ok/20 [border-radius:--spacing(6)]" />
              <b className="absolute top-[56%] left-[46%] grid size-34 -translate-1/2 place-items-center rounded-full bg-primary/15">
                <i className="size-14 rounded-full border-background bg-primary [border-style:solid] [border-width:--spacing(3)]" />
              </b>
              {places.map((place, index) => <b key={place.name} className={cn("absolute grid size-24 -translate-1/2 place-items-center rounded-full bg-foreground font-bold text-background shadow-sm [font-size:--spacing(12)]", place.spot)}>{index + 1}</b>)}
            </div>
          )}
          {places.filter((place) => at(place.from)).map((place, index) => (
            <div key={place.name} className={cn("flex items-center gap-11 self-stretch px-4 py-5 [font-size:--spacing(14.5)]", enter)}>
              <b className="grid size-22 shrink-0 place-items-center rounded-full bg-foreground font-bold text-background [font-size:--spacing(11.5)]">{index + 1}</b>
              <strong className="flex-1 font-semibold">{place.name}</strong>
              <span className="text-muted-foreground [font-size:--spacing(13)]">{place.walk}</span>
            </div>
          ))}
        </>
      );
    case "Inbox":
      return (
        <>
          {at(1) && <Said>What needs me in my inbox?</Said>}
          {typing && <Typing />}
          {at(3) && <Reply>Three need you. The other 41 can wait.</Reply>}
          {mail.filter((message) => at(message.from)).map((message) => (
            <div key={message.sender} className={cn("flex items-center gap-11 self-stretch bg-secondary px-12 py-10 [border-radius:--spacing(16)] [font-size:--spacing(14.5)]", enter)}>
              <span className="grid size-36 shrink-0 place-items-center rounded-full bg-background font-bold [font-size:--spacing(11.5)]">{message.initials}</span>
              <span>
                <strong className="block font-semibold">{message.sender}</strong>
                <small className="block text-muted-foreground [font-size:--spacing(12.5)]">{message.gist}</small>
              </span>
            </div>
          ))}
          {at(7) && (
            <div className={cn("mt-6 flex gap-8", enter)}>
              <Chip go>Draft replies</Chip>
              <Chip>Show all</Chip>
            </div>
          )}
        </>
      );
    default:
      return null;
  }
}

function Phone({ demo }: { demo: Demo }) {
  const home = demo.scene === "Home";
  const talking = conversations.includes(demo.scene);
  const question = home && !demo.whole && demo.beat > 0 ? questions[demo.beat - 1] : undefined;
  return (
    <div
      role="img"
      aria-label="An Alpha phone. As you scroll it shows Alpha answering a question about today’s calendar, asking before it sends a text, finding coffee on a map, summing up an inbox and taking a spoken note."
      data-scene={demo.scene}
      className="relative aspect-[372/792] w-[min(68vw,19rem)] max-w-full bg-foreground p-[1.55%] shadow-lg [border-radius:13.5%/6.4%] md:h-[min(calc(100svh-9.5rem),46rem)] md:w-auto"
    >
      <div className="@container relative size-full overflow-hidden bg-background select-none [border-radius:12.4%/5.8%]">
        <div aria-hidden className="absolute inset-0 leading-snug [--spacing:calc(100cqw/360)] [font-size:--spacing(15)]">
          <span className="absolute top-13 left-1/2 z-10 size-11 -translate-x-1/2 rounded-full bg-foreground" />

          <div className={cn("absolute inset-0 px-16 pt-40 transition-[scale,opacity] duration-slow ease-standard motion-reduce:transition-none", !home && "scale-97 opacity-60")}>
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
              {question === undefined
                ? <span className="min-w-0 flex-1 truncate [font-size:--spacing(15.5)]">Ask Alpha</span>
                : <span key={question} data-question className="min-w-0 flex-1 truncate text-foreground motion-safe:animate-[reveal_1100ms_steps(26)_both] [font-size:--spacing(15.5)]">{question}</span>}
              <Mic className="size-22 text-foreground" />
            </div>
          </div>

          <div data-sheet={talking ? "open" : "closed"} className={cn("absolute inset-x-0 top-150 bottom-0 bg-card shadow-sheet transition-transform duration-slow ease-standard motion-reduce:transition-none [border-radius:--spacing(28)_--spacing(28)_0_0]", talking ? "translate-y-0" : "translate-y-[104%]")}>
            <span className="absolute top-8 left-1/2 h-4 w-36 -translate-x-1/2 rounded-full bg-input" />
            <div className="flex h-60 items-center gap-10 px-16 pt-12">
              <Orb className="size-28" />
              <strong className="flex-1 font-semibold">Alpha</strong>
              <ChevronDown className="size-22" />
            </div>
            <div key={demo.scene} className="absolute inset-x-14 top-68 bottom-84 flex flex-col items-start gap-8">
              <Conversation demo={demo} />
            </div>
            <div className="absolute inset-x-10 bottom-18 flex h-56 items-center justify-between rounded-full bg-secondary pr-8 pl-20 text-muted-foreground">
              Message Alpha
              <span className="grid size-40 place-items-center rounded-full bg-foreground text-background"><Mic className="size-19" /></span>
            </div>
          </div>

          <div className={cn("absolute inset-0 flex flex-col items-center bg-background px-26 pt-84 pb-36 transition-opacity duration-slow ease-standard motion-reduce:transition-none", demo.scene === "Voice" ? "opacity-100" : "invisible opacity-0")}>
            {demo.scene === "Voice" && (
              <>
                <span className={cn("text-muted-foreground [font-size:--spacing(11)]", caps)}>Listening</span>
                <span className="relative mt-64 grid place-items-center">
                  {[0, 1100].map((delay) => <i key={delay} className="absolute inset-0 rounded-full bg-primary opacity-0 motion-safe:animate-[listen_2200ms_ease-out_infinite]" style={{ animationDelay: `${delay}ms` }} />)}
                  <Orb className="size-132" />
                </span>
                <p className="mt-66 min-h-110 text-center font-display leading-tight font-light text-balance [font-size:--spacing(29)]">
                  {spoken.filter((_, index) => reached(demo, index + 1)).map((words) => <span key={words} className={enter}>{words} </span>)}
                </p>
                {reached(demo, 6) && (
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
    <div id="top" className="overflow-x-clip">
      <header className={cn("flex h-18 items-center justify-between gap-4", gutter)}>
        <a href="/" className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          <Mark aria-hidden className="text-alpha" />
          Alpha
        </a>
        <p className="hidden text-sm text-muted-foreground md:block">Now on Pixel 10 and Pixel 10a</p>
        <Button asChild variant="outline" size="sm">
          <a href={source}><GitHub className="size-4.5" />GitHub</a>
        </Button>
      </header>
      <main>
        <div className={cn("md:grid md:grid-cols-[minmax(0,1fr)_minmax(19rem,0.82fr)] md:gap-x-[clamp(2rem,6vw,6rem)]", gutter)}>
          <section data-passage="Home" className="flex flex-col items-start justify-center gap-7 pt-6 pb-10 md:col-start-1 md:row-start-1 md:min-h-[calc(100svh-4.5rem)] md:pt-8 md:pb-20">
            <h1 className="font-semibold [font-size:clamp(3.25rem,6.4vw,6.5rem)] leading-none [letter-spacing:-0.062em] [word-spacing:0.045em]">
              Your phone.
              <br />
              <em className={cn("text-primary", display)}>Your agent.</em>
            </h1>
            <p className="max-w-[31rem] text-pretty text-muted-foreground [font-size:clamp(1.125rem,1.5vw,1.3125rem)]">
              Alpha is an open-source phone with a personal agent built in. Ask for something, and it works across your mail, calendar, maps and messages to get it done.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <Button asChild size="lg">
                <a href={source}><GitHub className="size-5" />Get Alpha on GitHub</a>
              </Button>
              <p className="text-base text-muted-foreground">Available now for <strong className="font-semibold text-foreground">Pixel 10</strong> and <strong className="font-semibold text-foreground">Pixel 10a</strong></p>
            </div>
            <a href="#calendar" className="mt-6 hidden items-center gap-1.5 text-base text-muted-foreground hover:text-primary md:inline-flex">
              See what it does
              <ChevronDown aria-hidden className="size-5 motion-safe:animate-[nudge_2400ms_ease-in-out_infinite]" />
            </a>
          </section>

          <div className="sticky top-0 z-20 -mx-[clamp(1.25rem,5vw,4rem)] h-[62svh] overflow-hidden bg-linear-to-b from-background from-82% to-transparent md:static md:col-start-2 md:row-span-2 md:row-start-1 md:mx-0 md:h-auto md:overflow-visible md:bg-none">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-linear-to-b from-background to-transparent md:hidden" />
            <div className="absolute inset-x-0 bottom-7 grid place-items-center md:sticky md:inset-x-auto md:top-9 md:bottom-auto md:h-[calc(100svh-4.5rem)]">
              <Mark aria-hidden className="absolute size-[34rem] text-foreground opacity-4 motion-safe:animate-[turn_240s_linear_infinite] md:size-[min(128%,46rem)]" />
              <Phone demo={demo} />
              <nav aria-label="Walkthrough" className="absolute right-0 hidden flex-col md:flex">
                {[{ scene: "Home", id: "top", kicker: "Home" }, ...passages].map(({ scene, id, kicker }) => (
                  <a key={id} href={`#${id}`} aria-label={kicker} aria-current={demo.scene === scene} className="grid size-6 place-items-center">
                    <span className={cn("w-1.5 rounded-full transition-all duration-base ease-standard motion-reduce:transition-none", demo.scene === scene ? "h-5 bg-primary" : "h-1.5 bg-border")} />
                  </a>
                ))}
              </nav>
            </div>
          </div>

          <div className="md:col-start-1 md:row-start-2">
            {passages.map(({ scene, id, kicker, title, text }) => (
              <section key={id} id={id} data-passage={scene} className="flex min-h-[60svh] max-w-[31rem] scroll-mt-[62svh] flex-col gap-3 pt-5 md:min-h-[88svh] md:scroll-mt-0 md:justify-center md:gap-4 md:pt-0">
                <p className={cn("text-xs text-primary", caps)}>{kicker}</p>
                <h2 className="font-display leading-none font-light text-balance [font-size:clamp(2rem,8.4vw,2.75rem)] [letter-spacing:-0.035em] md:[font-size:clamp(2.5rem,4.4vw,4.25rem)]">{title}</h2>
                <p className="text-pretty text-muted-foreground [font-size:clamp(1.0625rem,1.4vw,1.25rem)]">{text}</p>
              </section>
            ))}
          </div>
        </div>

        <section aria-labelledby="yours" className={cn("py-[clamp(5rem,12vw,10rem)]", gutter)}>
          <h2 id="yours" className={headline}>The agent lives <em className={cn("text-primary", display)}>on the phone.</em></h2>
          <div className="mt-[clamp(2.5rem,6vw,5rem)] grid gap-x-[clamp(1.5rem,4vw,4rem)] gap-y-10 md:grid-cols-3">
            {facts.map(({ title, text }) => (
              <div key={title} className="grid content-start gap-2.5 border-t border-foreground pt-5">
                <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                <p className="text-base text-pretty text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="get" className="relative overflow-clip bg-alpha text-alpha-foreground">
          <Mark aria-hidden className="absolute top-full -right-[40vw] size-[min(62rem,130vw)] -translate-y-1/2 opacity-10 motion-safe:animate-[turn_240s_linear_infinite] md:top-1/2 md:-right-48" />
          <div className={cn("relative flex flex-col items-start gap-6 py-[clamp(5rem,11vw,9rem)]", gutter)}>
            <p className={cn("text-xs text-alpha-foreground/75", caps)}>Available now</p>
            <h2 id="get" className={cn("max-w-[13ch]", headline)}>Put Alpha on your <em className={display}>Pixel&nbsp;10</em> or <em className={display}>Pixel&nbsp;10a.</em></h2>
            <p className="max-w-[34rem] text-balance text-alpha-foreground/85 [font-size:clamp(1.0625rem,1.4vw,1.25rem)]">The source, the build steps and the releases are on GitHub.</p>
            <Button asChild size="lg" variant="secondary" className="bg-background text-primary hover:bg-background/90 active:bg-background/80">
              <a href={source}><GitHub className="size-5" />Get Alpha on GitHub<ArrowRight aria-hidden className="size-5" /></a>
            </Button>
            <code className="max-w-full overflow-x-auto rounded-full border border-alpha-foreground/30 px-5 py-3 font-mono text-sm whitespace-nowrap select-all">git clone {source}</code>
          </div>
        </section>
      </main>
      <footer className={cn("flex flex-wrap items-center gap-x-8 gap-y-4 py-8 text-base", gutter)}>
        <span className="mr-auto flex basis-full items-center gap-2 text-xl font-semibold tracking-tight md:basis-auto">
          <Mark aria-hidden className="text-alpha" />
          Alpha
        </span>
        <a className="text-muted-foreground hover:text-primary" href="https://alphacompute.ai/">Built by <strong className="font-semibold text-foreground">Alpha Compute</strong></a>
        <a className="text-muted-foreground hover:text-primary" href={source}>GitHub</a>
      </footer>
    </div>
  );
}
