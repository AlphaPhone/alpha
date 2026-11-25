// spec/app/assistant/chats.md, "Story: Find my conversations"; spec/app/assistant/chats.md, "Story: Reuse words from a message"; spec/app/assistant/reply.md, "A recognized tool block outside a fence becomes its card; inside a fence every line stays code"
import { AssistantChatHistorySheet, AssistantSearchSheet, Button, type AssistantAttachment, type AssistantMessageProps } from "@repo/ui";
import type { MapsCard } from "@elizaos/plugin-maps-client";
import { Effect, type ManagedRuntime } from "effect";
import { useMemo, useState } from "react";
import * as Chats from "../../gen/app__assistant__chats.effect.vibe";
import type { useMachine as useChats } from "../../gen/app__assistant__chats.react.ts";
import * as Composer from "../../gen/app__assistant__composer.effect.vibe";
import type { useMachine as useSearch } from "../../gen/app__assistant__search.react.ts";
import type { useMachine as useLayers } from "../../gen/app__shell__layers.react.ts";
import { top } from "../../gen/app__shell__layers.ts";
import type { MessageSelection } from "./message-actions.vibe";
import { MapsCardView, mapsCardsOf } from "./maps-cards.tsx";
import { replyBlocks, wordsOf } from "./words.ts";
import { ReplyFailure } from "./ReplyFailure.tsx";
import type { Attached, Board, Line } from "./talk.vibe";

export interface MessageActions {
  copy: (selection: MessageSelection) => void;
  useInEmail?: (selection: MessageSelection) => void;
  openLink?: (href: string) => void;
  reading?: { readonly message: number; readonly stop: () => void };
}

export function chip(file: Attached): AssistantAttachment {
  const { id, name, mimeType } = file;
  return mimeType.startsWith("image/") ? { id, name, kind: "image", src: `data:${mimeType};base64,${file.data}` } : { id, name, kind: "file" };
}

type HistoryRow = AssistantMessageProps & { id: string };
const empty: readonly HistoryRow[] = [];

interface HistoryProps {
  runtime: ManagedRuntime.ManagedRuntime<Chats.Machine | Composer.Machine, unknown>;
  board: Board;
  lines: readonly Line[];
  chats: Chats.Chats | undefined;
  writing: Composer.Composer | undefined;
  replying: boolean;
  holding: boolean;
  settled: boolean;
  canReadAloud: boolean;
  actions?: MessageActions;
  onSettings?: () => void;
  onPreview?: (file: Attached) => void;
  /** Opens Maps on what the newest agent message's Maps card shows, once for that message. */
  onOpenMaps?: (card: MapsCard, message: number) => void;
  /** The messages whose card already opened Maps. */
  opened?: ReadonlySet<number>;
  /** Sends an answer to the newest agent message's share question as the owner's words, once for that question. */
  onChoose?: (choice: string, value: string) => void;
}

/** Recorded rows and their controls are rebuilt only when their data or available actions change. */
export function useMessageRows({ runtime, board, lines, chats, writing, replying, holding, settled, canReadAloud, actions, onSettings, onPreview, onOpenMaps, opened, onChoose }: HistoryProps): readonly HistoryRow[] {
  const prepared = useMemo(() => lines.map((line) => ({
    line,
    cards: line.mine ? [] : mapsCardsOf(line.text).cards,
    reply: line.mine ? { words: line.text, choices: [] } : replyBlocks(line.text),
  })), [lines]);
  return useMemo(() => {
    if (!chats || !writing || prepared.length === 0) return empty;
    const chat = (event: Chats.Event) => void runtime.runPromiseExit(Effect.flatMap(Chats.Machine, (machine) => machine.send(event)));
    const compose = (event: Composer.Event) => void runtime.runPromiseExit(Effect.flatMap(Composer.Machine, (machine) => machine.send(event)));
    return prepared.map(({ line, cards, reply: { words: text, choices } }): HistoryRow => {
      const message = board.numbered(line.id);
      const live = !line.mine && message > 0 && message === chats.messages && !replying;
      const open = live && onOpenMaps !== undefined && opened?.has(message) !== true ? onOpenMaps : undefined;
      const recorded = message > 0 && settled;
      const selection = { conversation: chats.chosen, page: chats.page.ticket, message };
      const blank = text.trim() === "";
      const copy = actions?.copy;
      const addToEmail = actions?.useInEmail;
      const fork = { type: "fork", message, replying, holding } as const;
      const quote = { type: "quote", message, recorded } as const;
      const editAgain = { type: "editAgain", message, mine: line.mine, recorded } as const;
      const readAloud = { type: "readAloud", message, mine: line.mine } as const;
      const reading = actions?.reading;
      const stopReading = reading !== undefined && reading.message === message && Chats.enabled(chats, readAloud) ? reading.stop : undefined;
      return {
        id: line.id,
        author: line.mine ? "owner" : "alpha",
        text,
        attachments: line.attachments?.map(chip),
        quote: line.quote === undefined ? undefined : wordsOf({ mine: false, text: line.quote }),
        children: cards.length === 0 && choices.length === 0 && line.failure === undefined ? undefined : <>
          {cards.map((card, index) => <MapsCardView key={index} card={card} settled={!live} onOpen={open === undefined ? undefined : () => open(card, message)} />)}
          {live && onChoose !== undefined ? choices.map((choice) => (
            <div key={choice.id} className="flex flex-wrap gap-2">
              {choice.options.map((option) => <Button key={option.value} variant="secondary" size="sm" onClick={() => onChoose(choice.id, option.value)}>{option.label}</Button>)}
            </div>
          )) : null}
          {line.failure === undefined ? null : <ReplyFailure kind={line.failure} onSettings={onSettings} />}
        </>,
        onFork: recorded && Chats.enabled(chats, fork) ? () => chat(fork) : undefined,
        onQuote: Composer.enabled(writing, quote) ? () => compose(quote) : undefined,
        onCopy: copy && Chats.copyableText(recorded, blank) ? () => copy(selection) : undefined,
        onUseInEmail: addToEmail && Chats.textForEmail(recorded, blank, line.mine) ? () => addToEmail(selection) : undefined,
        onEditAgain: Composer.enabled(writing, editAgain) ? () => { board.type(line.text); compose(editAgain); } : undefined,
        onOpenLink: actions?.openLink,
        onReadAloud: stopReading ?? (canReadAloud && recorded && !blank && Chats.enabled(chats, readAloud) ? () => chat(readAloud) : undefined),
        readAloudActive: stopReading !== undefined,
        onPreview: onPreview && line.attachments?.length ? (id) => {
          const file = line.attachments?.find((one) => one.id === id);
          if (file) onPreview(file);
        } : undefined,
      };
    });
  }, [actions, board, canReadAloud, chats, holding, onChoose, onOpenMaps, onPreview, onSettings, opened, prepared, replying, runtime, settled, writing]);
}

const historyLayer = "assistant-history";
const showHistory = { type: "openLayer", id: historyLayer, kind: "SheetLayer", covers: true } as const;
const hideHistory = { type: "closeLayer", id: historyLayer } as const;

// spec/app/assistant/chats.md, "Story: Find my conversations"; spec/app/assistant/search.md, "Story: Search my conversations"; spec/app/shell/layers.md, "Back closes the layer on top, and nothing under it"
export function useHistorySheets(
  chats: ReturnType<typeof useChats>,
  search: ReturnType<typeof useSearch>,
  layers: ReturnType<typeof useLayers>,
  seen: ReturnType<Board["snapshot"]>,
  free: { replying: boolean; holding: boolean },
  beginSearch: (() => void) | undefined,
  returnFocus: () => void,
) {
  const [words, setWords] = useState("");
  const shown = chats.state;
  const finding = search.state;
  const start = { type: "start", ...free } as const;
  const listing = layers.state !== undefined && top(layers.state).id === historyLayer;
  const closeHistory = () => { if (layers.can(hideHistory)) void layers.send(hideHistory); };
  const browse = layers.can(showHistory) ? () => {
    void layers.send(showHistory).then(({ _tag }) => { if (_tag === "Success") void chats.send({ type: "browse" }); });
  } : undefined;
  const searchHistory = beginSearch !== undefined && search.can({ type: "openSearch" }) ? () => {
    setWords("");
    beginSearch();
  } : undefined;
  const sheets = shown && finding ? (
    <>
      <AssistantChatHistorySheet
        open={listing}
        onOpenChange={(open) => { if (!open) closeHistory(); }}
        onReturnFocus={returnFocus}
        history={{
          chats: shown.ids.map((id) => ({ id: String(id), title: seen.titles.get(id) ?? "Ask Alpha", current: id === shown.chosen })),
          status: shown.list.status === "Loading" ? "loading" : shown.list.status === "Failed" ? "failed" : "loaded",
          blocked: free.replying || free.holding,
          making: Chats.making(shown),
          unsure: Chats.unsure(shown),
          onChoose: (id) => {
            const choose = { type: "choose", conversation: Number(id), ...free } as const;
            if (!chats.can(choose)) return;
            void chats.send(choose);
            closeHistory();
          },
          onStart: chats.can(start) ? () => { void chats.send(start); closeHistory(); } : undefined,
          onRetry: () => void chats.send({ type: "browse" }),
        }}
      />
      <AssistantSearchSheet
        open={finding.open}
        onOpenChange={(open) => { if (!open && search.can({ type: "closeSearch" })) void search.send({ type: "closeSearch" }); }}
        search={{
          words,
          hits: seen.hits.slice(0, finding.shown).map((hit, at) => ({ id: String(at + 1), chat: seen.titles.get(hit.conversation) ?? "Ask Alpha", snippet: hit.text })),
          status: finding.hits.status === "Idle" ? "idle" : finding.hits.status === "Loading" ? "loading" : finding.hits.status === "Failed" ? "failed" : "loaded",
          blocked: free.replying || free.holding,
          onWordsChange: (typed) => {
            setWords(typed);
            const find = { type: "find", words: typed.trim() } as const;
            if (search.can(find)) void search.send(find);
          },
          onMore: search.can({ type: "more" }) ? () => void search.send({ type: "more" }) : undefined,
          onOpenHit: (id) => {
            const hit = seen.hits[Number(id) - 1];
            if (hit === undefined) return;
            const open = { type: "openHit", hit: Number(id), conversation: hit.conversation, message: hit.message, here: hit.conversation === shown.chosen, ...free } as const;
            if (search.can(open)) void search.send(open);
          },
        }}
      />
    </>
  ) : null;
  return { browse, search: searchHistory, sheets };
}
