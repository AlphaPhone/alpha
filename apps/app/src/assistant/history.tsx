// spec/app/assistant/chats.md, "Story: Find my conversations"; spec/app/assistant/chats.md, "Story: Reuse words from a message"
import type { AssistantAttachment, AssistantMessageProps } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { useMemo } from "react";
import * as Chats from "../../gen/app__assistant__chats.effect.vibe";
import * as Composer from "../../gen/app__assistant__composer.effect.vibe";
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
    const chat = (event: Chats.Event) => void runtime.runPromiseExit(Chats.Machine.use((machine) => machine.send(event)));
    const compose = (event: Composer.Event) => void runtime.runPromiseExit(Composer.Machine.use((machine) => machine.send(event)));
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
