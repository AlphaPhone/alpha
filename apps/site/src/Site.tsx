// spec/site/index.md, "Story: Walk through what Alpha does"
import { Button, Mark, cn } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Archive, ArrowUp, Bell, Calendar, Camera, Check, CheckCheck, ChevronLeft, Clock, File, Folder, Footprints, Globe, Image, Inbox, Lock, Mail, MapPin, Mic, Plus, RefreshCw, Search, Send, Settings, Share2, Star, Workflow } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import type { Machine } from "../gen/site.effect.vibe";
import { useMachine } from "../gen/site.react.ts";
import { type Demo, type Scene, during, initial, screen, shows, talking } from "../gen/site.ts";

export interface SiteProps {
  runtime: ManagedRuntime.ManagedRuntime<Machine, unknown>;
}

type Talk = Extract<Scene, "Day" | "Coffee" | "Mail">;

const source = "https://github.com/eliza-research/alpha";
const gutter = "mx-auto w-full max-w-[80rem] px-[clamp(1.25rem,5vw,4rem)]";
const enter = "motion-safe:animate-[enter_460ms_cubic-bezier(0.19,1,0.22,1)_both]";
const grow = "motion-safe:animate-[grow_460ms_cubic-bezier(0.19,1,0.22,1)_both]";
const fade = "motion-safe:animate-[fade_320ms_ease-out_both]";
const reveal = "motion-safe:animate-[reveal_900ms_steps(22)_both]";
const caps = "font-bold tracking-caps uppercase";
const display = "font-display font-light [font-size:1.1em] [letter-spacing:-0.05em] not-italic";
const opened = "transition-[opacity,scale,visibility] duration-slow ease-standard motion-reduce:transition-none";
const round = "grid size-44 shrink-0 place-items-center rounded-full bg-secondary";

const talks: readonly Talk[] = ["Day", "Coffee", "Mail"];

const asked = {
  Day: "What’s on today?",
  Coffee: "Coffee near lunch?",
  Menu: "Show me their menu",
  Mail: "What needs me?",
};

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
  { at: "13:00", time: "1:00 PM", title: "Lunch · Priya", where: "Guerrero St", from: 3, next: false },
  { at: "15:00", time: "3:00 PM", title: "Design review", where: "Video call", from: 4, next: true },
];

const places = [
  { name: "Fog & Filter", walk: "3 min", from: 4, spot: "top-[38%] left-[62%]" },
  { name: "Paper Crane Coffee", walk: "4 min", from: 5, spot: "top-[61%] left-[22%]" },
  { name: "Second Sun", walk: "5 min", from: 6, spot: "top-[55%] left-[84%]" },
];

const roads = ["inset-x-[-10%] top-[18%] h-9 -rotate-7", "inset-x-[-10%] top-[34%] h-14 -rotate-7", "inset-x-[-10%] top-[52%] h-8 -rotate-7", "inset-x-[-10%] top-[68%] h-11 -rotate-7", "inset-y-[-20%] left-[12%] w-8 -rotate-7", "inset-y-[-20%] left-[38%] w-12 -rotate-7", "inset-y-[-20%] left-[70%] w-9 -rotate-7", "inset-y-[-20%] left-[90%] w-7 rotate-24"];

const mail = [
  { initials: "NP", sender: "Northpoint", subject: "Partner dinner", gist: "Wants a date for the partner dinner by Friday.", time: "1:12 PM", needs: 3 },
  { initials: "MC", sender: "Maya Chen", subject: "Notes for the 3:00 review", gist: "Pages 6 to 9 are the ones to read first.", time: "12:48 PM" },
  { initials: "DO", sender: "Dana Okafor", subject: "Contract redlines", gist: "Contract redlines, with two questions for you.", time: "11:20 AM", needs: 4 },
  { initials: "SR", sender: "Sam Reyes", subject: "Standup notes", gist: "Build 0.9 goes to beta on Monday.", time: "9:48 AM" },
  { initials: "BO", sender: "Building office", subject: "Water shut-off", gist: "Water is off Thursday from 9 to 11.", time: "9:05 AM", needs: 5 },
  { initials: "CA", sender: "Coastline Air", subject: "Your trip to Portland", gist: "Saturday, 8:40 AM. Seat 7A.", time: "Mon" },
];

const menu = [
  { name: "Flat white", price: "4.50" },
  { name: "Pour over", price: "5.00" },
  { name: "Cortado", price: "4.25" },
  { name: "Almond croissant", price: "4.75" },
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
    <span className={cn("grid shrink-0 place-items-center rounded-full bg-alpha", className)}>
      <Mark aria-hidden className="size-[58%] text-alpha-foreground" />
    </span>
  );
}

function Touch({ light = false, className }: { light?: boolean; className?: string }) {
  return <span data-touch className={cn("pointer-events-none absolute top-1/2 left-1/2 size-46 -translate-1/2 rounded-full motion-safe:animate-[touch_800ms_ease-out_both] motion-reduce:hidden", light ? "bg-primary-foreground/50" : "bg-foreground/30", className)} />;
}

function Working({ children }: { children: ReactNode }) {
  return (
    <span data-typing className="flex h-20.5 items-center gap-8 text-muted-foreground">
      <span className="flex items-center gap-4">
        {[0, 130, 260].map((delay) => <i key={delay} className="size-5.5 rounded-full bg-primary motion-safe:animate-[typing_900ms_ease-in-out_infinite]" style={{ animationDelay: `${delay}ms` }} />)}
      </span>
      {children}
    </span>
  );
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

function Answer({ working, children }: { working?: string | false; children: ReactNode }) {
  return (
    <Part>
      <div className="flex min-h-22 items-start gap-8 px-2 pt-2 font-medium">
        <Orb className="mt-1.5 size-18" />
        {working ? <Working>{working}</Working> : <span className={fade}>{children}</span>}
      </div>
    </Part>
  );
}

function Chip({ go = false, className, children }: { go?: boolean; className?: string; children: ReactNode }) {
  return <span className={cn("relative inline-flex h-40 items-center gap-6 rounded-full px-16 font-semibold transition-transform duration-base ease-standard [font-size:--spacing(14)]", go ? "bg-primary text-primary-foreground" : "bg-secondary", className)}>{children}</span>;
}

// spec/site/index.md, "A part of a scene shows from its beat on, a part of a kept scene whole, and what passes only during its beats"
function Turn({ demo, scene }: { demo: Demo; scene: Talk }) {
  const at = (from: number) => shows(demo, scene, from);
  const passing = (from: number, until: number) => during(demo, scene, from, until);
  switch (scene) {
    case "Day":
      return (
        <>
          {at(0) && <Said>{asked.Day}</Said>}
          {at(1) && <Answer working={passing(1, 2) && "Checking your calendar"}>Two things this afternoon.</Answer>}
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
    case "Coffee":
      return (
        <>
          {at(1) && <Said>{asked.Coffee}</Said>}
          {at(2) && <Answer working={passing(2, 3) && "Looking near Guerrero St"}>Three within a five-minute walk.</Answer>}
          {places.filter((place) => at(place.from)).map((place, index) => (
            <Part key={place.name}>
              <div className={cn("relative flex items-center gap-11 px-12 py-10 transition-colors duration-base ease-standard [border-radius:--spacing(16)] [font-size:--spacing(14.5)]", index === 0 && passing(7, 8) ? "bg-accent" : "bg-secondary")}>
                <b className={cn("grid size-22 shrink-0 place-items-center rounded-full font-bold [font-size:--spacing(11.5)]", index === 0 ? "bg-primary text-primary-foreground" : "bg-foreground text-background")}>{index + 1}</b>
                <strong className="flex-1 font-semibold">{place.name}</strong>
                <span className="text-muted-foreground [font-size:--spacing(13)]">{place.walk}</span>
                {index === 0 && passing(7, 8) && <Touch />}
              </div>
            </Part>
          ))}
        </>
      );
    case "Mail":
      return (
        <>
          {at(0) && <Said>{asked.Mail}</Said>}
          {at(1) && <Answer working={passing(1, 2) && "Reading your inbox"}>Three need you. The other 41 can wait.</Answer>}
          {mail.filter((message) => message.needs !== undefined && at(message.needs)).map((message) => (
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
          {at(5) && (
            <Part>
              <div className="flex gap-8 pt-2">
                <Chip go className={cn(passing(6, 7) && "scale-94")}>
                  Draft replies
                  {passing(6, 7) && <Touch light />}
                </Chip>
                <Chip>Show all</Chip>
              </div>
            </Part>
          )}
          {at(7) && <Answer working={passing(7, 8) && "Drafting three replies"}>Here’s the first. Send it?</Answer>}
          {at(8) && (
            <Part>
              <div className="border border-border bg-background p-14 [border-radius:--spacing(22)]">
                <div className={cn("flex items-center gap-7 text-muted-foreground [font-size:--spacing(11)]", caps)}>
                  <Mail className="size-15" />
                  Reply
                </div>
                <p className="mt-12 font-semibold"><span className="mr-6 font-normal text-muted-foreground">To</span>Dana Okafor</p>
                <p className="mt-8 bg-secondary px-13 py-11 [border-radius:--spacing(14)]">Both changes work for me. I’ll sign today.</p>
                <div className="mt-12 flex h-40 items-center justify-end gap-8">
                  {at(10)
                    ? <span data-sent className={cn("flex items-center gap-6 font-semibold text-ok [font-size:--spacing(14)]", fade)}><CheckCheck className="size-18" />Sent</span>
                    : (
                      <>
                        <Chip>Cancel</Chip>
                        <Chip go className={cn(passing(9, 10) && "scale-94")}>
                          <Send className="size-16" />
                          Send
                          {passing(9, 10) && <Touch light />}
                        </Chip>
                      </>
                    )}
                </div>
              </div>
            </Part>
          )}
        </>
      );
    default: {
      const _exhaustive: never = scene;
      return _exhaustive;
    }
  }
}

function App({ on, className, children }: { on: boolean; className?: string; children: ReactNode }) {
  return <div className={cn("absolute inset-0 bg-background", opened, on ? "opacity-100" : "invisible scale-95 opacity-0", className)}>{children}</div>;
}

function Bar({ title }: { title: string }) {
  return (
    <div className="flex h-56 items-center gap-12 px-16 pt-30">
      <ChevronLeft className="size-22" />
      <strong className="flex-1 font-semibold [font-size:--spacing(19)]">{title}</strong>
    </div>
  );
}

// spec/site/index.md, "Each scene plays on Home, in Maps, in the Browser or in the Inbox"
function Screens({ demo }: { demo: Demo }) {
  const on = screen(demo.scene);
  return (
    <div className={cn("absolute inset-0 transition-[scale,opacity] duration-slow ease-standard motion-reduce:transition-none", talking(demo) && "scale-97 opacity-60")}>
      <App on={on === "Home"} className="px-16 pt-64">
        <ul className="grid grid-cols-4 gap-y-22 text-center text-muted-foreground [font-size:--spacing(11.5)]">
          {apps.map(({ name, icon: Icon, unread }) => (
            <li key={name} className="grid justify-items-center gap-8">
              <span className={cn("relative grid size-58 place-items-center bg-secondary text-foreground transition-transform duration-base ease-standard [border-radius:--spacing(19)]", name === "Inbox" && during(demo, "Apps", 1, 2) && "scale-90")}>
                <Icon className="size-25" />
                {unread && <i className="absolute top-10 right-10 size-8 rounded-full bg-primary" />}
                {name === "Inbox" && during(demo, "Apps", 1, 2) && <Touch />}
              </span>
              {name}
            </li>
          ))}
        </ul>
      </App>

      <App on={on === "Maps"} className="overflow-hidden bg-accent">
        {roads.map((road) => <i key={road} className={cn("absolute bg-background", road)} />)}
        <i className="absolute top-[42%] left-[-4%] h-[9%] w-[13%] -rotate-7 bg-ok/20 [border-radius:--spacing(6)]" />
        <i className="absolute top-[22%] left-[46%] h-[9%] w-[20%] -rotate-7 bg-ok/20 [border-radius:--spacing(6)]" />
        <b className="absolute top-[47%] left-[50%] grid size-34 -translate-1/2 place-items-center rounded-full bg-primary/15">
          <i className="size-14 rounded-full border-background bg-primary [border-style:solid] [border-width:--spacing(3)]" />
        </b>
        {shows(demo, "Maps", 0) && places.map((place, index) => (
          <b key={place.name} className={cn("absolute -mt-14 -ml-14 grid size-28 place-items-center rounded-full font-bold shadow-sm motion-safe:animate-[drop_520ms_cubic-bezier(0.19,1,0.22,1)_both] [font-size:--spacing(13)]", index === 0 ? "bg-primary text-primary-foreground" : "bg-foreground text-background", place.spot)} style={{ animationDelay: `${260 + index * 140}ms` }}>{index + 1}</b>
        ))}
        <div className="absolute inset-x-12 top-36 flex h-52 items-center gap-12 rounded-full bg-background px-18 shadow-lg">
          <ChevronLeft className="size-22" />
          <span className="font-medium">Fog &amp; Filter</span>
        </div>
        {shows(demo, "Maps", 1) && (
          <div className={cn("absolute inset-x-0 bottom-0 bg-background px-20 pt-22 pb-112 shadow-sheet [border-radius:--spacing(28)_--spacing(28)_0_0]", enter)}>
            <strong className="block font-display leading-none font-light [font-size:--spacing(34)] [letter-spacing:-0.03em]">Fog &amp; Filter</strong>
            <span className="mt-6 block text-muted-foreground [font-size:--spacing(14)]">Coffee · 3 min walk · Open until 6</span>
            <div className="mt-16 flex items-center gap-8">
              <span className="flex h-44 flex-1 items-center justify-center gap-8 rounded-full bg-primary font-semibold text-primary-foreground"><Footprints className="size-19" />Directions</span>
              <span className={round}><Star className="size-19" /></span>
              <span className={round}><Share2 className="size-19" /></span>
            </div>
          </div>
        )}
      </App>

      <App on={on === "Menu"}>
        <Bar title="Browser" />
        <div className="relative mx-16 mt-10 flex h-44 items-center gap-8 overflow-hidden rounded-full bg-secondary px-16 text-muted-foreground [font-size:--spacing(13.5)]">
          <Lock className="size-14" />
          fogandfilter.example/menu
          {during(demo, "Menu", 0, 1) && <i className="absolute inset-x-0 bottom-0 h-2 origin-left bg-primary motion-safe:animate-[load_800ms_ease-out_both]" />}
        </div>
        {shows(demo, "Menu", 1) && (
          <div className={cn("px-20 pt-22", fade)}>
            <div className="grid h-132 place-items-center bg-accent [border-radius:--spacing(20)]"><span className={cn("text-muted-foreground [font-size:--spacing(11)]", caps)}>Guerrero St · Since 2014</span></div>
            <strong className="mt-20 block font-display leading-none font-light [font-size:--spacing(34)] [letter-spacing:-0.03em]">Fog &amp; Filter</strong>
            <span className={cn("mt-18 block text-muted-foreground [font-size:--spacing(11)]", caps)}>Menu</span>
            <ul className="mt-6">
              {menu.map(({ name, price }) => (
                <li key={name} className="flex justify-between border-b border-border py-11">
                  <span className="font-medium">{name}</span>
                  <span className="text-muted-foreground tabular-nums">{price}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </App>

      <App on={on === "Inbox"}>
        <div className="flex h-56 items-center gap-12 px-16 pt-30">
          <ChevronLeft className="size-22" />
          <strong className="flex-1 font-semibold [font-size:--spacing(19)]">Inbox</strong>
          <RefreshCw className="size-19" />
          <Search className="ml-10 size-19" />
          <Plus className="ml-10 size-21" />
        </div>
        <div className="mt-10 flex gap-8 px-16 font-semibold [font-size:--spacing(13)]">
          <span className="flex h-36 items-center gap-6 rounded-full bg-foreground px-14 text-background"><Inbox className="size-15" />Inbox</span>
          <span className="flex h-36 items-center gap-6 rounded-full bg-secondary px-14"><Send className="size-15" />Sent</span>
          <span className="flex h-36 items-center gap-6 rounded-full bg-secondary px-14"><Archive className="size-15" />Archive</span>
        </div>
        <ul className="mt-12 px-16">
          {mail.map((message) => (
            <li key={message.sender} className="flex items-start gap-12 py-9">
              <span className="grid size-38 shrink-0 place-items-center rounded-full bg-secondary font-bold [font-size:--spacing(11.5)]">{message.initials}</span>
              <span className="min-w-0 flex-1 [font-size:--spacing(14)]">
                <span className="flex items-baseline justify-between gap-8">
                  <strong className={message.needs === undefined ? "font-medium" : "font-bold"}>{message.sender}</strong>
                  <small className="text-muted-foreground [font-size:--spacing(11.5)]">{message.time}</small>
                </span>
                <span className="flex items-center justify-between gap-8">
                  <span className={cn("truncate", message.needs !== undefined && "font-semibold")}>{message.subject}</span>
                  {message.needs !== undefined && <i className="size-7 shrink-0 rounded-full bg-primary" />}
                </span>
                <small className="block truncate text-muted-foreground [font-size:--spacing(12.5)]">{message.gist}</small>
              </span>
            </li>
          ))}
        </ul>
      </App>
    </div>
  );
}

function Dock({ demo }: { demo: Demo }) {
  const open = talking(demo);
  const typed = during(demo, "Home", 1, 2) ? asked.Day : during(demo, "Coffee", 0, 1) ? asked.Coffee : during(demo, "Maps", 2, 3) ? asked.Menu : during(demo, "Inbox", 2, 3) ? asked.Mail : undefined;
  const opening = during(demo, "Maps", 3, 4) || during(demo, "Menu", 0, 1);
  return (
    <div data-sheet={open ? "open" : "closed"} className="absolute inset-x-0 bottom-0 flex max-h-[calc(100%_-_--spacing(48))] flex-col bg-card shadow-sheet [border-radius:--spacing(28)_--spacing(28)_0_0]">
      <span className="absolute top-8 left-1/2 h-4 w-36 -translate-x-1/2 rounded-full bg-border" />
      <div className={cn("mt-18 grid min-h-0 transition-[grid-template-rows] duration-slow ease-standard motion-reduce:transition-none", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="mx-14 flex min-h-0 flex-col justify-end overflow-hidden">
          {talks.map((scene) => <Turn key={scene} demo={demo} scene={scene} />)}
        </div>
      </div>
      <i className="pointer-events-none absolute inset-x-0 top-18 h-14 bg-linear-to-b from-card to-transparent" />
      <div className="relative mx-10 mt-12 mb-16 flex h-56 shrink-0 items-center gap-10 rounded-full bg-secondary pr-8 pl-8 text-muted-foreground">
        <Orb className="size-40" />
        {typed !== undefined && <span key={typed} data-draft className={cn("min-w-0 flex-1 truncate text-foreground", reveal)}>{typed}</span>}
        {typed === undefined && opening && <Working>Opening their menu</Working>}
        {typed === undefined && !opening && (shows(demo, "Menu", 1)
          ? <span className={cn("flex min-w-0 flex-1 items-center gap-6 truncate", fade)}><Check className="size-17 text-ok" />Opened their menu</span>
          : <span className="min-w-0 flex-1 truncate">Ask Alpha</span>)}
        {opening && <span className="flex-1" />}
        <span className={cn("relative grid size-40 shrink-0 place-items-center rounded-full", typed === undefined ? "text-foreground" : "bg-foreground text-background")}>
          {typed === undefined ? <Mic className="size-21" /> : <ArrowUp className="size-19" />}
          {during(demo, "Note", 0, 1) && <Touch />}
        </span>
        {(during(demo, "Home", 1, 2) || during(demo, "Maps", 2, 3) || during(demo, "Inbox", 2, 3)) && <Touch className="left-[40%]" />}
      </div>
    </div>
  );
}

function Phone({ demo }: { demo: Demo }) {
  const heard = (from: number) => shows(demo, "Note", from);
  return (
    <div
      role="img"
      aria-label="An Alpha phone playing what Alpha does, over and over: it answers a question about the day, finds coffee and opens it in Maps, opens the menu in the Browser, sums up the Inbox, asks before it sends a reply and takes a spoken note."
      data-scene={demo.scene}
      data-screen={screen(demo.scene)}
      className="relative aspect-[372/792] w-[min(72vw,20rem)] max-w-full bg-foreground p-[1.55%] shadow-lg [border-radius:13.5%/6.4%] md:h-[min(calc(100svh-11.5rem),46rem)] md:w-auto"
    >
      <div className="@container relative size-full overflow-hidden bg-background select-none [border-radius:12.4%/5.8%]">
        <div aria-hidden className="absolute inset-0 leading-snug [--spacing:calc(100cqw/360)] [font-size:--spacing(15)]">
          <span className="absolute top-13 left-1/2 z-10 size-11 -translate-x-1/2 rounded-full bg-foreground" />
          <Screens demo={demo} />
          <Dock demo={demo} />

          <div className={cn("absolute inset-0 flex flex-col items-center bg-background px-26 pt-84 pb-36 transition-opacity duration-slow ease-standard motion-reduce:transition-none", heard(1) ? "opacity-100" : "invisible opacity-0")}>
            {heard(1) && (
              <>
                <span className={cn("text-muted-foreground [font-size:--spacing(11)]", caps)}>Listening</span>
                <span className="relative mt-64 grid place-items-center">
                  {[0, 1100].map((delay) => <i key={delay} className="absolute inset-0 rounded-full bg-primary opacity-0 motion-safe:animate-[listen_2200ms_ease-out_infinite]" style={{ animationDelay: `${delay}ms` }} />)}
                  <Orb className="relative size-132" />
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
