// spec/app/contacts/agent.md, "Story: Approve what the agent asked"; spec/app/contacts/agent.md, "A change is shown line by line, and a removed value never reads as kept"; spec/app/contacts/agent.md, "The owner picks the exact number or the one contact, and that one is shown"; spec/app/contacts/agent.md, "A text's review says when it likely goes as several linked texts"
import { Banner, Button, Dialog, DialogContent, DialogTitle, Mark, cn, focusRing } from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { Check, Phone as Call, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { Machine as AgentMachine } from "../../gen/app__contacts__agent.effect.vibe";
import { lineChange, maxMatches, reachesANumber } from "../../gen/app__contacts__agent.ts";
import { useMachine as useAgent } from "../../gen/app__contacts__agent.react.ts";
import type { Machine as PhoneMachine } from "../../gen/app__phone.effect.vibe";
import { clear } from "../../gen/app__phone.ts";
import { useMachine as usePhone } from "../../gen/app__phone.react.ts";
import type { Telephony } from "../platform/telephony.vibe";
import { callerInitials, displayNumber } from "../phone/words.ts";
import { type Lines, Requested, afterOf, chooseNumber, choicesOf, likelyTexts, linesOf, unchangedBy } from "./requests.vibe";

export interface ReviewProps {
  /** Provides the agent's requests, Phone's machine, for whether a call may be an emergency call, and what the phone found for the request. */
  runtime: ManagedRuntime.ManagedRuntime<AgentMachine | PhoneMachine | Requested | Telephony, unknown>;
}

const asks = { Dial: "Call", Text: "Text", AddContact: "Add contact", ChangeContact: "Change contact", DeleteContact: "Delete contact" } as const;
const words = { RemoveLine: "Remove ", AddLine: "Add ", KeepLine: "Keep " } as const;
const blank: Lines = { name: "", phones: [], emails: [] };

/** One line of a row: struck and quiet when the change removes it, strong when it adds it. */
interface Line { key?: string; text: string; struck?: boolean; added?: boolean }

interface OptionProps {
  label: string;
  name: string;
  lines: readonly Line[];
  /** The action the row takes, drawn in its colour. */
  icon: ReactNode;
  tone: "alpha" | "call" | "hangup";
  disabled?: boolean;
  send?: boolean;
  onChoose: () => void;
}

/** One thing the owner can choose: who or what it is, line by line, and the action it takes in a round mark. */
function Option({ label, name, lines, icon, tone, disabled, send, onChoose }: OptionProps) {
  return (
    <button type="button" aria-label={label} disabled={disabled} data-alpha-review-send={send ? "" : undefined} onClick={onChoose}
      className={cn(focusRing, "flex min-h-14 w-full items-center gap-3 rounded-action bg-secondary p-1.5 text-left disabled:opacity-50")}>
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold whitespace-nowrap">{callerInitials(name)}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-md font-semibold">{name}</span>
        {lines.map((line) => (
          <span key={line.key ?? line.text} className={cn("text-sm tabular-nums wrap-anywhere", line.struck ? "text-muted-foreground line-through" : "text-foreground", line.added && "font-semibold")}>{line.text}</span>
        ))}
      </span>
      <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-full text-alpha-foreground [&_svg]:size-5", tone === "call" ? "bg-call" : tone === "hangup" ? "bg-hangup" : "bg-alpha")}>{icon}</span>
    </button>
  );
}

/** Each number and address of `before` and `after` on a line of its own, saying in words what the change does to it. */
function changeLines(before: Lines, after: Lines, removing: boolean, saved: ReadonlyMap<string, string>): Line[] {
  const beforePhones = new Set(before.phones);
  const afterPhones = new Set(after.phones);
  const beforeEmails = new Set(before.emails);
  const afterEmails = new Set(after.emails);
  const nameChange = !removing && before.name !== "" && after.name !== before.name
    ? [{ key: "name", text: after.name === "" ? `Remove ${before.name}` : `Rename from ${before.name}`, struck: true }]
    : [];
  const rows = [
    ...[...new Set([...beforePhones, ...afterPhones])].map((value) => ({ kind: "phone" as const, value, had: beforePhones.has(value), will: afterPhones.has(value) })),
    ...[...new Set([...beforeEmails, ...afterEmails])].map((value) => ({ kind: "email" as const, value, had: beforeEmails.has(value), will: afterEmails.has(value) })),
  ];
  return [...nameChange, ...rows.map(({ kind, value, had, will }) => {
    const change = removing ? "RemoveLine" : lineChange(had, will);
    const elsewhere = change === "AddLine" ? saved.get(value) : undefined;
    const text = `${words[change]}${kind === "phone" ? displayNumber(value) : value}`;
    return { key: `${kind}:${value}`, text: elsewhere === undefined || elsewhere === before.name ? text : `${text}, saved as ${elsewhere}`, struck: change === "RemoveLine", added: change === "AddLine" };
  })];
}

/**
 * What the agent asked of the phone, shown as Alpha's approval card: the number to pick, the text, or the contact
 * before and after, for the owner to approve or decline. Nothing happens without the owner's approval.
 * @model spec/app/contacts/agent.md
 */
export function Review({ runtime }: ReviewProps) {
  const { state, can, send } = useAgent(runtime);
  const phone = usePhone(runtime).state;
  if (!state || !phone || (state.stage !== "Shown" && state.stage !== "Choosing")) return null;
  const held = runtime.runSync(Effect.flatMap(Requested, (requested) => requested.get()));
  if (held.request !== state.request) return null;
  const safe = clear(phone);
  const { request } = state;
  const approve = { type: "approve", request, shown: state.review.shown, clear: safe } as const;
  const showAgain = { type: "showAgain", request } as const;
  const decline = { type: "decline", request } as const;
  const approved = () => void send(approve, "Owner");
  const target = held.matches.find((one) => one.id === state.contact);
  const before = target === undefined ? blank : linesOf(target);
  const after = afterOf(held.operation, before);
  const contactChange = state.ask === "AddContact" || state.ask === "ChangeContact" || state.ask === "DeleteContact";
  const reaching = state.stage === "Shown" && reachesANumber(state.ask);
  const title = reaching ? `${asks[state.ask]} ${target?.name ?? displayNumber(state.number)}` : asks[state.ask];
  const twin = held.matches[0]?.name ?? after.name;
  const label = state.ask === "DeleteContact" ? `Delete ${before.name}`
    : state.ask === "AddContact" ? (held.matches.length > 0 ? `Add anyway: ${twin} is already in Contacts` : `Add ${after.name}`)
    : `Save changes to ${before.name}`;
  return (
    <Dialog open onOpenChange={(next) => { if (!next && can(decline, "Owner")) void send(decline, "Owner"); }}>
      <DialogContent data-alpha-review={request} data-alpha-review-version={state.review.shown} aria-label={asks[state.ask]} aria-describedby={undefined}
        className="flex max-h-[calc(var(--alpha-viewport-height,100dvh)-6rem)] flex-col gap-2.5 p-3.5">
        <DialogTitle className="sr-only">{asks[state.ask]}</DialogTitle>
        <p className="flex shrink-0 items-center gap-1.5 text-xs font-semibold tracking-loose text-muted-foreground uppercase"><Mark aria-hidden className="size-4.5 text-alpha" />Needs approval</p>
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <h2 className="text-md font-semibold wrap-anywhere">{title}</h2>
            {reaching && <p className="mt-0.5 text-sm text-muted-foreground tabular-nums wrap-anywhere">{displayNumber(state.number)}</p>}
          </div>
          {reaching && can(approve, "Owner") && (
            <Button data-alpha-review-send="" aria-label={state.ask === "Text" ? "Send this text" : `Call: ${title}`}
              className={cn("min-h-11 min-w-16 shrink-0 px-4 text-base", state.ask === "Dial" && "bg-call hover:bg-call/90 active:bg-call/80")} onClick={approved}>
              {state.ask === "Text" ? "Send" : "Call"}
            </Button>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain">
          {state.stage === "Shown" && state.ask === "Text" && <p className="rounded-action bg-secondary p-3 whitespace-pre-wrap wrap-anywhere">{state.text}</p>}
          {state.stage === "Shown" && state.ask === "Text" && likelyTexts(state.text) > 1 && <p className="text-sm text-muted-foreground">It likely goes as {likelyTexts(state.text)} linked texts</p>}
          {(state.stage === "Choosing" || contactChange) && (
            <div role="group" aria-label={state.stage === "Choosing" ? (reachesANumber(state.ask) ? "Which number" : "Which contact") : "Contact"} className="flex flex-col gap-0.5">
              {state.more && <p className="mb-1 text-sm leading-detail text-muted-foreground wrap-anywhere">Only the first {maxMatches} matching contacts are shown. For another one, ask again with their full name.</p>}
              {state.stage === "Choosing" && (reachesANumber(state.ask)
                ? choicesOf(held.matches).map(({ contact, number }) => {
                    const choose = { type: "choose", request, number, contact: contact.id, emergency: false, unchanged: false } as const;
                    return <Option key={`${contact.id} ${number}`} label={`${asks[state.ask]} ${contact.name} ${displayNumber(number)}`} name={contact.name} lines={[{ text: displayNumber(number) }]}
                      icon={state.ask === "Dial" ? <Call /> : <Check />} tone={state.ask === "Dial" ? "call" : "alpha"} disabled={!can(choose, "Owner")}
                      onChoose={() => void runtime.runPromise(chooseNumber(state, held, contact.id, number))} />;
                  })
                : held.matches.map((contact) => {
                    const choose = { type: "choose", request, number: "", contact: contact.id, emergency: false, unchanged: unchangedBy(held.operation, contact) } as const;
                    const removing = state.ask === "DeleteContact";
                    return <Option key={contact.id} label={`${removing ? "Delete" : "Change"} ${contact.name}`} name={contact.name}
                      lines={[...contact.phones.map(displayNumber), ...contact.emails].slice(0, 2).map((text) => ({ text }))}
                      icon={removing ? <Trash2 /> : <Check />} tone={removing ? "hangup" : "alpha"} disabled={!can(choose, "Owner")} onChoose={() => void send(choose, "Owner")} />;
                  }))}
              {state.stage === "Shown" && contactChange && (
                <Option send disabled={!can(approve, "Owner")} onChoose={approved} name={after.name || before.name} label={label}
                  lines={[
                    ...(state.ask === "AddContact" ? held.matches.map((one) => ({ text: `${one.name} is already in Contacts` })) : []),
                    ...(state.ask === "AddContact" && held.matches.length > 0 ? [{ text: "Add (keep existing)", added: true }] : []),
                    ...changeLines(before, after, state.ask === "DeleteContact", held.saved),
                  ]}
                  icon={state.ask === "DeleteContact" ? <Trash2 /> : state.ask === "AddContact" ? <Plus /> : <Check />} tone={state.ask === "DeleteContact" ? "hangup" : "alpha"} />
              )}
            </div>
          )}
          {state.stage === "Shown" && !can(approve, "Owner") && can(showAgain, "Owner") && (
            <Banner variant="warn" action={<Button size="sm" onClick={() => void send(showAgain, "Owner")}>Show again</Button>}>This changed on the phone</Banner>
          )}
          {state.stage === "Shown" && !safe && <Banner variant="warn">Nothing is done during a call that may be an emergency call</Banner>}
        </div>
        {can(decline, "Owner") && <button type="button" className={cn(focusRing, "min-h-11 shrink-0 self-end rounded-md px-3 text-sm text-muted-foreground")} onClick={() => void send(decline, "Owner")}>Not now</button>}
      </DialogContent>
    </Dialog>
  );
}
