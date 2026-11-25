// spec/app/assistant/chats.md, "Story: Find my conversations"; spec/app/assistant/chats.md, "Story: Reuse words from a message"
import { AssistantChatHistorySheet, AssistantSearchSheet, type AssistantAttachment, type AssistantMessageProps } from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { useMemo, useState } from "react";
import * as Chats from "../../gen/app__assistant__chats.effect.vibe";
import type { useMachine as useChats } from "../../gen/app__assistant__chats.react.ts";
import * as Composer from "../../gen/app__assistant__composer.effect.vibe";
import type { useMachine as useSearch } from "../../gen/app__assistant__search.react.ts";
import type { MessageSelection } from "./message-actions.vibe";
import { ReplyFailure } from "./ReplyFailure.tsx";
import type { Attached, Board, Line } from "./talk.vibe";

export interface MessageActions {
  copy: (selection: MessageSelection) => void;
  useInEmail?: (selection: MessageSelection) => void;
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
}

/** Recorded rows and their controls are rebuilt only when their data or available actions change. */
export function useMessageRows({ runtime, board, lines, chats, writing, replying, holding, settled, canReadAloud, actions, onSettings, onPreview }: HistoryProps): readonly HistoryRow[] {
  return useMemo(() => {
    if (!chats || !writing || lines.length === 0) return empty;
    const chat = (event: Chats.Event) => void runtime.runPromiseExit(Effect.flatMap(Chats.Machine, (machine) => machine.send(event)));
    const compose = (event: Composer.Event) => void runtime.runPromiseExit(Effect.flatMap(Composer.Machine, (machine) => machine.send(event)));
    return lines.map((line): HistoryRow => {
      const message = board.numbered(line.id);
      const recorded = message > 0 && settled;
      const selection = { conversation: chats.chosen, page: chats.page.ticket, message };
      const blank = line.text.trim() === "";
      const copy = actions?.copy;
      const useInEmail = actions?.useInEmail;
      const fork = { type: "fork", message, replying, holding } as const;
      const quote = { type: "quote", message, recorded } as const;
      const editAgain = { type: "editAgain", message, mine: line.mine, recorded } as const;
      const readAloud = { type: "readAloud", message, mine: line.mine } as const;
      return {
        id: line.id,
        author: line.mine ? "owner" : "alpha",
        text: line.text,
        attachments: line.attachments?.map(chip),
        quote: line.quote,
        children: line.failure === undefined ? undefined : <ReplyFailure kind={line.failure} onSettings={onSettings} />,
        onFork: recorded && Chats.enabled(chats, fork) ? () => chat(fork) : undefined,
        onQuote: Composer.enabled(writing, quote) ? () => compose(quote) : undefined,
        onCopy: copy && Chats.copyableText(recorded, blank) ? () => copy(selection) : undefined,
        onUseInEmail: useInEmail && Chats.textForEmail(recorded, blank, line.mine) ? () => useInEmail(selection) : undefined,
        onEditAgain: Composer.enabled(writing, editAgain) ? () => { board.type(line.text); compose(editAgain); } : undefined,
        onReadAloud: canReadAloud && recorded && !blank && Chats.enabled(chats, readAloud) ? () => chat(readAloud) : undefined,
        onPreview: onPreview && line.attachments?.length ? (id) => {
          const file = line.attachments?.find((one) => one.id === id);
          if (file) onPreview(file);
        } : undefined,
      };
    });
  }, [actions, board, canReadAloud, chats, holding, lines, onPreview, onSettings, replying, runtime, settled, writing]);
}

// spec/app/assistant/chats.md, "Story: Find my conversations"; spec/app/assistant/search.md, "Story: Search my conversations"
export function useHistorySheets(
  chats: ReturnType<typeof useChats>,
  search: ReturnType<typeof useSearch>,
  seen: ReturnType<Board["snapshot"]>,
  free: { replying: boolean; holding: boolean },
) {
  const [listing, setListing] = useState(false);
  const [words, setWords] = useState("");
  const shown = chats.state;
  const finding = search.state;
  const start = { type: "start", ...free } as const;
  const browse = () => {
    void chats.send({ type: "browse" });
    setListing(true);
  };
  const searchHistory = search.can({ type: "openSearch" }) ? () => {
    void chats.send({ type: "browse" });
    void search.send({ type: "openSearch" });
  } : undefined;
  const sheets = shown && finding ? (
    <>
      <AssistantChatHistorySheet
        open={listing}
        onOpenChange={setListing}
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
            setListing(false);
          },
          onStart: chats.can(start) ? () => { void chats.send(start); setListing(false); } : undefined,
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
