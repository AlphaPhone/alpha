// spec/app/contacts/agent.md, "Story: Approve what the agent asked"; spec/app/contacts/agent.md, "A change is shown line by line, and a removed value never reads as kept"
import { Banner, Button, Card, ListGroup, ListRow } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import type { Machine as AgentMachine } from "../../gen/app__contacts__agent.effect.vibe";
import { lineChange } from "../../gen/app__contacts__agent.ts";
import { useMachine as useAgent } from "../../gen/app__contacts__agent.react.ts";
import type { Machine as PhoneMachine } from "../../gen/app__phone.effect.vibe";
import { clear } from "../../gen/app__phone.ts";
import { useMachine as usePhone } from "../../gen/app__phone.react.ts";
import { Requested } from "./requests.vibe";

export interface ReviewProps {
  /** Provides the agent's requests, Phone's machine, for whether a call may be an emergency call, and what the request names. */
  runtime: ManagedRuntime.ManagedRuntime<AgentMachine | PhoneMachine | Requested, unknown>;
}

const asks = { Dial: "Call", Text: "Text", AddContact: "Add contact", ChangeContact: "Change contact", DeleteContact: "Delete contact" } as const;
const lines = { RemoveLine: "Remove", AddLine: "Add", KeepLine: "Keep" } as const;

/**
 * What the agent asked of the phone, shown exactly: the number, the text or the contact before and after, for the
 * owner to approve or decline. Nothing happens without the owner's approval.
 * @model spec/app/contacts/agent.md
 */
export function Review({ runtime }: ReviewProps) {
  const { state, can, send } = useAgent(runtime);
  const phone = usePhone(runtime).state;
  if (!state || !phone || (state.stage !== "Shown" && state.stage !== "Choosing")) return null;
  const held = runtime.runSync(Requested.use((requested) => requested.get()));
  const safe = clear(phone);
  const approve = { type: "approve", clear: safe, spoken: false } as const;
  const target = held.chosen;
  const number = held.number !== "" ? held.number : target?.phones[0] ?? "";
  const before = new Set([...(target?.phones ?? []), ...(target?.emails ?? [])]);
  const after = new Set([...held.form.phones, ...held.form.emails]);
  return (
    <Card role="dialog" aria-label={asks[state.ask]} className="fixed inset-x-4 bottom-24 z-40 flex flex-col gap-3 p-4">
      <h2 className="font-semibold">{asks[state.ask]}</h2>
      {state.stage === "Choosing" && (
        <ListGroup aria-label="Which contact">
          {held.matches.map((match) => (
            <ListRow key={match.id} title={match.name} detail={match.phones.join(", ")} onClick={() => {
              runtime.runSync(Requested.use((requested) => requested.set({ chosen: match })));
              void send({ type: "choose", emergency: false }, "Owner");
            }} />
          ))}
        </ListGroup>
      )}
      {state.stage === "Shown" && (
        <>
          {(state.ask === "Dial" || state.ask === "Text") && <ListRow title={target?.name ?? number} detail={number} />}
          {state.ask === "Text" && <p className="whitespace-pre-wrap rounded-md border p-3">{held.text}</p>}
          {(state.ask === "AddContact" || state.ask === "ChangeContact" || state.ask === "DeleteContact") && (
            <ListGroup aria-label="Contact">
              {[...new Set([...before, ...after])].map((value) => {
                const change = state.ask === "DeleteContact" ? "RemoveLine" : lineChange(before.has(value), after.has(value));
                return <ListRow key={value} title={value} detail={lines[change]} className={change === "RemoveLine" ? "line-through" : change === "AddLine" ? "font-semibold" : undefined} />;
              })}
            </ListGroup>
          )}
          {!can(approve, "Owner") && can({ type: "showAgain" }, "Owner") && (
            <Banner variant="warn" action={<Button size="sm" onClick={() => void send({ type: "showAgain" }, "Owner")}>Show again</Button>}>This changed on the phone</Banner>
          )}
          {!safe && <Banner variant="warn">Nothing is done during a call that may be an emergency call</Banner>}
        </>
      )}
      <div className="flex gap-2">
        {can(approve, "Owner") && <Button onClick={() => void send(approve, "Owner")}>{state.ask === "Text" ? "Send this text" : state.ask === "Dial" ? "Call" : "Approve"}</Button>}
        {can({ type: "decline" }, "Owner") && <Button variant="ghost" onClick={() => void send({ type: "decline" }, "Owner")}>Not now</Button>}
      </div>
    </Card>
  );
}
