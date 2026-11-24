// spec/assistant/send.md, "A composer send holds its text and clears the composer; a handed-over prompt leaves the composer alone"; spec/assistant/recovery.md, "Restart is offered only while the resident is refused and holds a reviewable recovery, once per tap"; spec/assistant/recovery.md, "Try again is offered while the resident is refused with nothing held, and starts it once per tap"; spec/assistant/send.md, "A dictated draft sent exactly as inserted is timed as a voice turn, and its reply is never spoken"; spec/assistant/draft.md, "A held send found by a restart is offered for review and never sent again on its own"; spec/assistant/context.md, "A hosted provider is disclosed wherever the owner can send, and on-device inference is never claimed for it"; spec/assistant/attachments.md, "At most four attachments, each within its cap, and a batch within 19 MiB of base64"
import { ArrowUp, Mic, Paperclip, Square, X } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import type { Target } from "../../assistant/composer.vibe";
import type { ChatFile } from "../../assistant/transcript.vibe";
import { copy, offerText } from "../../assistant/presentation.vibe";
import type { RestartOffer } from "../../assistant/restart.vibe";
import { Button, Textarea } from "../components/ui/index.ts";
import { cn } from "../lib/cn.ts";

/** What the composer shows and the owner's actions on it. */
export type ComposerBarProps = {
  /** The draft of the open conversation. */
  text: string;
  /** Files waiting to be sent with the message. */
  files: readonly ChatFile[];
  /** A reply is being written, so Send and Talk give way to Stop. */
  typing: boolean;
  /** Send is allowed now. */
  canSend: boolean;
  /** The draft may already have been sent and waits for review. */
  unsettled: boolean;
  /** The draft's notice, if any. */
  notice?: string;
  /** The message this send quotes or corrects. */
  target?: Target;
  /** The hosted provider prompts go to, when inference is hosted. */
  disclosure?: string;
  /** The location will travel with the next message. */
  locationShared?: boolean;
  /** Placeholder of the editor. */
  placeholder?: string;
  /** The dictation control the voice area mounts beside the editor, filling this draft. */
  dictation?: ReactNode;
  /** Restart Alpha for an agent the service holds for review, or Try again for one that would not start. */
  restartOffer?: RestartOffer;
  /** A restart or a try is running. */
  restartBusy?: boolean;
  /** The owner tapped Restart Alpha or Try again. */
  onRestart?: () => void;
  /** The owner typed. */
  onText: (text: string) => void;
  /** The owner pressed Send or Enter. */
  onSend: () => void;
  /** The owner stopped the reply being written. */
  onStop: () => void;
  /** The owner asked for a voice conversation. */
  onTalk: () => void;
  /** The owner opened the attachment picker. */
  onAttach: () => void;
  /** The owner removed a waiting file. */
  onRemoveFile: (id: string) => void;
  /** The owner cancelled the quote or edit. */
  onClearTarget: () => void;
  /** The owner settled a message that may already have been sent: put it back, or let it go. */
  onReviewUnsettled: (restore: boolean) => void;
};

/**
 * The composer: a multiline editor that grows from 44 px to its cap, Send or Talk, Stop while a reply is written, waiting files, the target line and Restart Alpha.
 * @model spec/assistant/send.md
 */
export function ComposerBar(props: ComposerBarProps) {
  const { text, files, typing } = props;
  const sendShown = !typing && (text.trim() !== "" || files.length > 0);
  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    if (props.canSend) props.onSend();
  };
  return (
    <div className="flex flex-col gap-2 bg-background px-3 pt-2 pb-[env(safe-area-inset-bottom)]">
      {props.unsettled && (
        <div role="alert" className="flex flex-col gap-2 rounded-md bg-secondary p-3 text-sm">
          <p>{copy.maySent}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => props.onReviewUnsettled(true)}>Put it back</Button>
            <Button size="sm" variant="ghost" onClick={() => props.onReviewUnsettled(false)}>It was sent</Button>
          </div>
        </div>
      )}
      {props.restartOffer !== undefined && props.restartOffer.kind !== "none" && (() => {
        const said = offerText(props.restartOffer.kind === "retry" ? props.restartOffer.refusal : undefined);
        return (
          <div role="status" className="flex flex-col gap-2 rounded-md bg-secondary p-3 text-sm">
            <p><span className="font-medium">{said.title}.</span> {said.explained}</p>
            <div><Button size="sm" disabled={props.restartBusy} onClick={props.onRestart}>{said.action}</Button></div>
          </div>
        );
      })()}
      {props.target && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="min-w-0 flex-1 truncate">{props.target.kind === "edit" ? "Editing message: " : props.target.quote.from === "user" ? "Replying to your message: " : "Replying to Alpha: "}{(props.target.kind === "edit" ? props.target.text : props.target.quote.text).replace(/\s+/g, " ").slice(0, 160)}</span>
          <Button size="icon" variant="ghost" aria-label="Cancel" onClick={props.onClearTarget}><X className="size-4" /></Button>
        </p>
      )}
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((file) => (
            <li key={file.id} className="flex items-center gap-1 rounded-md bg-secondary py-1 pr-1 pl-2 text-xs">
              {file.thumbnail ? <img src={file.thumbnail} alt="" className="size-6 rounded-sm object-cover" /> : <Paperclip aria-hidden className="size-3" />}
              <span className="max-w-32 truncate">{file.name}</span>
              <Button size="icon" variant="ghost" className="size-6" aria-label={`Remove ${file.name}`} disabled={typing} onClick={() => props.onRemoveFile(file.id)}><X className="size-3" /></Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <Button size="icon" variant="ghost" aria-label="Attach media" onClick={props.onAttach} disabled={typing || files.length >= 4}><Paperclip className="size-5" /></Button>
        <Textarea
          data-alpha-composer=""
          aria-label="Message"
          rows={1}
          value={text}
          placeholder={props.placeholder ?? "Ask Alpha"}
          onChange={(event) => props.onText(event.target.value)}
          onKeyDown={onKey}
          className={cn("field-sizing-content max-h-[min(168px,28dvh)] min-h-11 flex-1 resize-none font-legible")}
        />
        {!typing && props.dictation}
        {typing
          ? <Button size="icon" variant="secondary" aria-label="Stop reply" onClick={props.onStop}><Square className="size-4" /></Button>
          : sendShown
            ? <Button size="icon" aria-label="Send" disabled={!props.canSend} onClick={props.onSend} onPointerDown={(event) => { if (event.button === 0) event.preventDefault(); }}><ArrowUp className="size-5" /></Button>
            : <Button size="icon" variant="secondary" aria-label="Talk" onClick={props.onTalk}><Mic className="size-5" /></Button>}
      </div>
      {(props.notice || props.disclosure || props.locationShared) && (
        <p className="text-xs text-muted-foreground">{[props.notice, props.disclosure, props.locationShared ? copy.locationShared : undefined].filter(Boolean).join(" · ")}</p>
      )}
    </div>
  );
}
