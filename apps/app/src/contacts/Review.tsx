// spec/app/contacts/agent.md, "Story: Approve what the agent asked"; spec/app/contacts/agent.md, "A change is shown line by line, and a removed value never reads as kept"; spec/app/contacts/agent.md, "The owner picks the exact number or the one contact, and that one is shown"
import { Banner, Button, Card, ListGroup, ListRow } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import type { Machine as AgentMachine } from "../../gen/app__contacts__agent.effect.vibe";
import { lineChange, reachesANumber } from "../../gen/app__contacts__agent.ts";
import { useMachine as useAgent } from "../../gen/app__contacts__agent.react.ts";
import type { Machine as PhoneMachine } from "../../gen/app__phone.effect.vibe";
import { clear } from "../../gen/app__phone.ts";
import { useMachine as usePhone } from "../../gen/app__phone.react.ts";
import { judge } from "../phone/words.ts";
import { type Lines, Requested, afterOf, choicesOf, linesOf, unchangedBy } from "./requests.vibe";

export interface ReviewProps {
  /** Provides the agent's requests, Phone's machine, for whether a call may be an emergency call, and what the phone found for the request. */
  runtime: ManagedRuntime.ManagedRuntime<AgentMachine | PhoneMachine | Requested, unknown>;
}

const asks = { Dial: "Call", Text: "Text", AddContact: "Add contact", ChangeContact: "Change contact", DeleteContact: "Delete contact" } as const;
const lines = { RemoveLine: "Remove", AddLine: "Add", KeepLine: "Keep" } as const;
const blank: Lines = { name: "", phones: [], emails: [] };

/** Each number and address of `before` and `after` on a line of its own, saying what the change does to it. */
function Changes({ before, after, removing, saved }: { before: Lines; after: Lines; removing: boolean; saved: ReadonlyMap<string, string> }) {
  const was = new Set([...before.phones, ...before.emails]);
  const will = new Set([...after.phones, ...after.emails]);
  return (
    <ListGroup aria-label="Contact">
      {before.name !== "" && after.name !== before.name && !removing && <ListRow title={after.name} detail={`Rename from ${before.name}`} className="font-semibold" />}
      {[...new Set([...was, ...will])].map((value) => {
        const change = removing ? "RemoveLine" : lineChange(was.has(value), will.has(value));
        const elsewhere = change === "AddLine" ? saved.get(value) : undefined;
        return <ListRow key={value} title={value} detail={elsewhere === undefined || elsewhere === before.name ? lines[change] : `${lines[change]}, saved as ${elsewhere}`} className={change === "RemoveLine" ? "line-through" : change === "AddLine" ? "font-semibold" : undefined} />;
      })}
    </ListGroup>
  );
}

/**
 * What the agent asked of the phone, shown exactly: the number to pick, the text, or the contact before and after, for
 * the owner to approve or decline. Nothing happens without the owner's approval.
 * @model spec/app/contacts/agent.md
 */
export function Review({ runtime }: ReviewProps) {
  const { state, can, send } = useAgent(runtime);
  const phone = usePhone(runtime).state;
  if (!state || !phone || (state.stage !== "Shown" && state.stage !== "Choosing")) return null;
  const held = runtime.runSync(Requested.use((requested) => requested.get()));
  const safe = clear(phone);
  const approve = { type: "approve", clear: safe, spoken: false } as const;
  const target = held.matches.find((one) => one.id === state.contact);
  const before = target === undefined ? blank : linesOf(target);
  return (
    <Card role="dialog" aria-label={asks[state.ask]} className="fixed inset-x-4 bottom-24 z-40 flex flex-col gap-3 p-4">
      <h2 className="font-semibold">{asks[state.ask]}</h2>
      {state.stage === "Choosing" && (
        <ListGroup aria-label={reachesANumber(state.ask) ? "Which number" : "Which contact"}>
          {reachesANumber(state.ask)
            ? choicesOf(held.matches).map(({ contact, number }) => {
                const choose = { type: "choose", number, contact: contact.id, emergency: judge(number.replace(/[^\d+]/g, "")) === "Emergency", unchanged: false } as const;
                return <ListRow key={`${contact.id} ${number}`} title={contact.name} detail={number} disabled={!can(choose, "Owner")} onClick={() => void send(choose, "Owner")} />;
              })
            : held.matches.map((contact) => {
                const choose = { type: "choose", number: "", contact: contact.id, emergency: false, unchanged: unchangedBy(held.operation, contact) } as const;
                return <ListRow key={contact.id} title={contact.name} detail={[...contact.phones, ...contact.emails].join(", ")} disabled={!can(choose, "Owner")} onClick={() => void send(choose, "Owner")} />;
              })}
        </ListGroup>
      )}
      {state.more && <p className="text-sm text-muted-foreground">More contacts matched than are shown</p>}
      {state.stage === "Shown" && (
        <>
          {reachesANumber(state.ask) && <ListRow title={target?.name ?? state.number} detail={state.number} />}
          {state.ask === "Text" && <p className="whitespace-pre-wrap rounded-md border p-3">{state.text}</p>}
          {state.ask === "AddContact" && held.matches.length > 0 && (
            <ListGroup aria-label="Already in Contacts">
              {held.matches.map((twin) => <ListRow key={twin.id} title={twin.name} detail={[...twin.phones, ...twin.emails].join(", ")} />)}
            </ListGroup>
          )}
          {state.ask === "AddContact" && <p className={held.matches.length > 0 ? "font-semibold" : undefined}>{held.matches.length > 0 ? "Add (keep existing)" : afterOf(held.operation, blank).name}</p>}
          {(state.ask === "AddContact" || state.ask === "ChangeContact" || state.ask === "DeleteContact") && (
            <Changes before={before} after={afterOf(held.operation, before)} removing={state.ask === "DeleteContact"} saved={held.saved} />
          )}
          {!can(approve, "Owner") && can({ type: "showAgain" }, "Owner") && (
            <Banner variant="warn" action={<Button size="sm" onClick={() => void send({ type: "showAgain" }, "Owner")}>Show again</Button>}>This changed on the phone</Banner>
          )}
          {!safe && <Banner variant="warn">Nothing is done during a call that may be an emergency call</Banner>}
        </>
      )}
      <div className="flex gap-2">
        {can(approve, "Owner") && <Button aria-label={state.ask === "Text" ? "Send this text" : undefined} onClick={() => void send(approve, "Owner")}>{state.ask === "Text" ? "Send" : state.ask === "Dial" ? "Call" : "Approve"}</Button>}
        {can({ type: "decline" }, "Owner") && <Button variant="ghost" onClick={() => void send({ type: "decline" }, "Owner")}>Not now</Button>}
      </div>
    </Card>
  );
}
