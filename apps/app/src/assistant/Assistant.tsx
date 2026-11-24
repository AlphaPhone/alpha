// spec/app/assistant/index.md, "Story: Ask Alpha something"; spec/app/assistant/chats.md, "Story: Find my conversations"; spec/app/assistant/composer.md, "Story: Send what I wrote"; spec/app/assistant/search.md, "Story: Search my conversations"
import { Alert, Button, ListRow, SearchField, Spinner, Textarea } from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { GitFork, History, MessageSquarePlus, Search as SearchIcon, Square, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import type { Machine as ConversationMachine } from "../../gen/app__assistant.effect.vibe";
import { askable, inFlight } from "../../gen/app__assistant.ts";
import { useMachine as useConversation } from "../../gen/app__assistant.react.ts";
import type { Machine as ChatsMachine } from "../../gen/app__assistant__chats.effect.vibe";
import { useMachine as useChats } from "../../gen/app__assistant__chats.react.ts";
import type { Machine as ComposerMachine } from "../../gen/app__assistant__composer.effect.vibe";
import { textLimit } from "../../gen/app__assistant__composer.ts";
import { useMachine as useComposer } from "../../gen/app__assistant__composer.react.ts";
import type { Machine as SearchMachine } from "../../gen/app__assistant__search.effect.vibe";
import { useMachine as useSearch } from "../../gen/app__assistant__search.react.ts";
import type { Machine as ShellMachine } from "../../gen/app__shell.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import { freedom } from "./assistant.vibe";
import { Talk } from "./talk.vibe";

export interface AssistantProps {
  /** Provides the assistant's machines and its board, `assisting` of assistant.vibe, and the shell, which holds Ask Alpha's height. */
  runtime: ManagedRuntime.ManagedRuntime<ConversationMachine | ChatsMachine | ComposerMachine | SearchMachine | ShellMachine | Talk, unknown>;
}

const ended = {
  Refused: "Not sent. Your message is back in the composer.",
  Unknown: "Alpha cannot tell whether your message arrived.",
} as const;

const checks = {
  Finished: "The reply finished anyway.",
  StoppedForSure: "The reply was stopped.",
  NotRecorded: "Your agent never got that message.",
  LookLater: "Alpha could not tell how the reply ended. Look again later.",
} as const;

/**
 * Ask Alpha: the conversation showing with the reply as it is written, the owner's conversations, search, and the
 * composer, each control offered exactly when its machine's rules allow its event.
 * @model spec/app/assistant/index.md
 */
export function Assistant({ runtime }: AssistantProps) {
  const conversation = useConversation(runtime);
  const chats = useChats(runtime);
  const composer = useComposer(runtime);
  const search = useSearch(runtime);
  const shell = useShell(runtime);
  const [board] = useState(() => runtime.runSync(Talk.use((talk) => Effect.succeed(talk.board))));
  const seen = useSyncExternalStore(board.subscribe, board.snapshot);
  const [listing, setListing] = useState(false);
  const [words, setWords] = useState("");
  if (conversation.cause || chats.cause || composer.cause) return <Alert variant="destructive" className="m-4">Alpha could not open Ask Alpha</Alert>;
  const [talking, shown, writing, finding] = [conversation.state, chats.state, composer.state, search.state];
  if (!talking || !shown || !writing || !finding) return null;
  const free = freedom(talking, writing, shown.chosen);
  const lines = shown.page.status === "Idle" && shown.chosen === 0 ? [] : board.page(shown.page.ticket);
  const hold = { type: "hold", askable: askable(talking) } as const;
  const start = { type: "start", ...free } as const;
  const newChat = shown.chosen === 0;
  const sendable = newChat ? writing.editor.text && !writing.long && chats.can(start) && askable(talking) : composer.can(hold);
  const { outcome } = talking.turn.send;

  const type = (text: string) => {
    board.type(text);
    void composer.send({ type: "edit", blank: text.trim() === "", long: text.length > textLimit });
  };
  const send = () => {
    if (!sendable) return;
    if (newChat) {
      board.sendWhenMade = true;
      void chats.send(start);
      return;
    }
    board.outgoing = seen.typed;
    board.type("");
    void composer.send(hold);
  };
  const toggleList = () => {
    if (!listing) void chats.send({ type: "browse" });
    setListing(!listing);
  };

  return (
    <section aria-label="Assistant" className="mt-auto flex flex-col gap-3 p-4">
      <div role="toolbar" aria-label="Conversations" className="flex gap-2">
        <Button variant="ghost" size="icon" aria-label="Chats" aria-pressed={listing} onClick={toggleList}><History /></Button>
        {chats.can(start) && <Button variant="ghost" size="icon" aria-label="New chat" onClick={() => void chats.send(start)}><MessageSquarePlus /></Button>}
        {search.can({ type: "openSearch" }) && <Button variant="ghost" size="icon" aria-label="Search chats" onClick={() => { void chats.send({ type: "browse" }); void search.send({ type: "openSearch" }); }}><SearchIcon /></Button>}
        {chats.can({ type: "returnToOriginal", ...free }) && <Button variant="ghost" onClick={() => void chats.send({ type: "returnToOriginal", ...free })}>Back to the original</Button>}
      </div>

      {listing && (
        <nav aria-label="Chats" className="flex flex-col">
          {shown.list.status === "Loading" && <Spinner label="Reading your chats" />}
          {shown.list.status === "Failed" && <Alert variant="warn">Your chats could not be read</Alert>}
          {shown.ids.map((id) => {
            const choose = { type: "choose", conversation: id, ...free } as const;
            return <ListRow key={id} title={seen.titles.get(id) ?? "Ask Alpha"} selected={id === shown.chosen} disabled={!chats.can(choose)} onClick={() => { void chats.send(choose); setListing(false); }} />;
          })}
        </nav>
      )}

      {finding.open && (
        <div role="search" className="flex flex-col gap-2">
          <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (search.can({ type: "find", words: words.trim() })) void search.send({ type: "find", words: words.trim() }); }}>
            <SearchField aria-label="Search chats" value={words} onValueChange={setWords} />
            <Button variant="ghost" size="icon" aria-label="Close search" onClick={() => void search.send({ type: "closeSearch" })}><X /></Button>
          </form>
          {finding.hits.status === "Loading" && <Spinner label="Searching" />}
          {finding.hits.status === "Failed" && <Alert variant="warn">Search did not answer</Alert>}
          {finding.hits.status === "Loaded" && finding.shown === 0 && <Alert>Nothing found</Alert>}
          <ul aria-label="Hits" className="flex flex-col">
            {seen.hits.slice(0, finding.shown).map((hit, at) => {
              const open = { type: "openHit", hit: at + 1, conversation: hit.conversation, message: hit.message, here: hit.conversation === shown.chosen, ...free } as const;
              return <li key={`${hit.conversation} ${hit.message}`}><ListRow title={hit.text} detail={seen.titles.get(hit.conversation)} disabled={!search.can(open)} onClick={() => void search.send(open)} /></li>;
            })}
          </ul>
          {search.can({ type: "more" }) && <Button variant="outline" onClick={() => void search.send({ type: "more" })}>More</Button>}
        </div>
      )}

      {shown.page.status === "Loading" && <Spinner label="Reading the conversation" />}
      {shown.page.status === "Failed" && <Alert variant="warn">This conversation could not be read</Alert>}
      <ol aria-label="Conversation" className="flex flex-col gap-2">
        {lines.map((line, at) => {
          const fork = { type: "fork", message: at + 1, ...free } as const;
          return (
            <li key={line.id} className={line.mine ? "flex items-center gap-1 self-end" : "flex items-center gap-1 self-start"}>
              <span className={line.mine ? "rounded-md bg-primary px-3 py-2 text-primary-foreground" : "rounded-md bg-muted px-3 py-2"}>{line.text}</span>
              {chats.can(fork) && <Button variant="ghost" size="icon" aria-label={`Fork from “${line.text}”`} onClick={() => void chats.send(fork)}><GitFork /></Button>}
            </li>
          );
        })}
        {seen.reply !== "" && <li aria-label="Reply so far" className="self-start rounded-md bg-muted px-3 py-2">{seen.reply}</li>}
      </ol>
      {talking.turn.send.outcome === "Sent" && seen.reply === "" && <Spinner label="Waiting for your agent" />}
      {(outcome === "Refused" || outcome === "Unknown") && <Alert variant="warn">{ended[outcome]}</Alert>}
      {talking.turn.reply === "Broken" && <Alert variant="warn">The reply broke off.</Alert>}
      {talking.check !== "Unchecked" && talking.check !== "Aborting" && <Alert>{checks[talking.check]}</Alert>}
      {conversation.can({ type: "checkForReply" }) && (outcome === "Unknown" || talking.turn.reply === "Stopped" || talking.check === "LookLater" || writing.unsettled) && (
        <Button variant="outline" onClick={() => void conversation.send({ type: "checkForReply" })}>Check for reply</Button>
      )}

      {writing.slot === "Damaged" && composer.can({ type: "recover" }) && (
        <Alert variant="warn" className="flex items-center justify-between gap-2">Your saved message could not be read<Button variant="outline" onClick={() => void composer.send({ type: "recover" })}>Start over</Button></Alert>
      )}
      {writing.failing && (
        <Alert variant="warn" className="flex items-center justify-between gap-2">Your message is not saved on the phone{composer.can({ type: "retry" }) && <Button variant="outline" onClick={() => void composer.send({ type: "retry" })}>Retry</Button>}</Alert>
      )}
      {writing.long && <Alert variant="warn">This message is too long to send</Alert>}
      {composer.can({ type: "restoreSaved" }) && (
        <Alert className="flex flex-col gap-2">
          {writing.unsettled ? `This message may already have been sent: “${seen.saved}”` : `Another copy was saved: “${seen.saved}”`}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { board.type(writing.unsettled || seen.typed === "" ? seen.saved : `${seen.saved}\n${seen.typed}`); void composer.send({ type: "restoreSaved" }); }}>Restore it</Button>
            {composer.can({ type: "replaceSaved" }) && <Button variant="outline" onClick={() => void composer.send({ type: "replaceSaved" })}>{writing.unsettled ? "Let it go" : "Keep mine"}</Button>}
          </div>
        </Alert>
      )}

      <form className="flex items-end gap-2" onSubmit={(event) => { event.preventDefault(); send(); }}>
        <Textarea
          aria-label="Message"
          placeholder="Ask Alpha"
          rows={1}
          disabled={!composer.can({ type: "edit", blank: false, long: false })}
          value={seen.typed}
          onFocus={() => { if (shell.state?.assistant === "Bar" && shell.can({ type: "raise", detent: "Typing" })) void shell.send({ type: "raise", detent: "Typing" }); }}
          onChange={(event) => type(event.target.value)}
        />
        {conversation.can({ type: "stop" }) && <Button type="button" variant="outline" size="icon" aria-label="Stop reply" onClick={() => void conversation.send({ type: "stop" })}><Square /></Button>}
        {sendable && !inFlight(talking.turn) && <Button type="submit">Send</Button>}
      </form>
    </section>
  );
}
