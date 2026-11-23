// spec/telephony/voicemail.md, "Story: Hear a voicemail"; spec/telephony/voicemail.md, "Playing marks a voicemail heard, and nothing plays during a call or behind the lock"; spec/telephony/voicemail.md, "A transcript is made on this phone or not at all"; spec/telephony/voicemail.md, "A delete needs the owner's confirmation of the open voicemail, and a refused delete keeps it"
import { MessageSquare, Pause, Phone as PhoneIcon, Play, RotateCw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { Voicemail } from "../../../gen/telephony__voicemail.ts";
import { Avatar, Button, EmptyState, ListRow, Slider } from "../components/ui/index.ts";
import { clockLength, shortWhen, who } from "./present.ts";

export interface VoicemailPanelProps {
  /** The voicemail tab's state. */
  voicemail: Voicemail;
  /** The time the rows are placed against. */
  now: number;
  /** The open voicemail's audio as a playable URL, while it is ready. */
  audioUrl?: string;
  /** Open or close a voicemail. */
  onOpen: (id: string) => void;
  /** Play the open voicemail; the shell marks it heard. */
  onPlay: () => void;
  /** The audio element paused or ended. */
  onStopped: (ended: boolean) => void;
  /** Try the audio again. */
  onRetry: () => void;
  /** Call or text the caller back from Phone or Messages. */
  onCallBack: (number: string) => void;
  onMessage?: (number: string) => void;
  /** Ask, cancel or confirm the delete. */
  onDeleteAsked: () => void;
  onDeleteDeclined: () => void;
  onDeleteConfirmed: () => void;
}

/**
 * The carrier's voicemail: newest first, one open with Play, its transcript, Call back, Message and Delete.
 * @model spec/telephony/voicemail.md
 * @design design.md
 */
export function VoicemailPanel({ voicemail, now, audioUrl, onOpen, onPlay, onStopped, onRetry, onCallBack, onMessage, onDeleteAsked, onDeleteDeclined, onDeleteConfirmed }: VoicemailPanelProps) {
  const audio = useRef<HTMLAudioElement>(null);
  const [position, setPosition] = useState(0);
  const open = voicemail.opened;
  if (voicemail.rows.length === 0) return <EmptyState title="No voicemail" />;
  return (
    <ul className="divide-y divide-border">
      {voicemail.rows.map((row) => {
        const name = who(row.title, row.number);
        const isOpen = open.openId === row.id;
        return (
          <li key={row.id}>
            <ListRow
              title={<span className={row.fresh ? "font-semibold" : undefined}>{name}</span>}
              detail={row.carrierText || clockLength(row.seconds)}
              leading={<Avatar name={name} />}
              trailing={<span className="font-mono text-xs uppercase tabular-nums text-muted-foreground">{shortWhen(row.date, now)}</span>}
              aria-expanded={isOpen}
              aria-label={`Voicemail from ${name}, ${shortWhen(row.date, now)}${row.fresh ? ", new" : ""}`}
              onClick={() => onOpen(row.id)}
            />
            {isOpen && (
              <div className="flex flex-col gap-3 px-4 pb-4">
                {audioUrl && (
                  <audio
                    ref={audio}
                    src={audioUrl}
                    onTimeUpdate={(event) => {
                      setPosition(event.currentTarget.currentTime);
                      if (open.playback !== "Playing") event.currentTarget.pause();
                    }}
                    onPause={() => onStopped(false)}
                    onEnded={() => onStopped(true)}
                  />
                )}
                <div className="flex items-center gap-3">
                  {open.audio === "AudioFailed" ? (
                    <Button variant="secondary" size="icon" aria-label="Try the audio again" onClick={onRetry}><RotateCw aria-hidden /></Button>
                  ) : (
                    <Button
                      size="icon"
                      aria-label={open.playback === "Playing" ? "Pause" : "Play"}
                      loading={open.audio === "AudioFetching"}
                      disabled={open.audio !== "AudioReady" || voicemail.inCall}
                      onClick={() => {
                        if (open.playback === "Playing") audio.current?.pause();
                        else {
                          onPlay();
                          void audio.current?.play().catch(() => onStopped(false));
                        }
                      }}
                    >
                      {open.playback === "Playing" ? <Pause aria-hidden /> : <Play aria-hidden />}
                    </Button>
                  )}
                  <Slider
                    aria-label="Position"
                    min={0}
                    max={Math.max(1, row.seconds)}
                    value={[Math.floor(position)]}
                    disabled={open.audio !== "AudioReady"}
                    onValueChange={([value]) => {
                      if (audio.current && value !== undefined) audio.current.currentTime = value;
                    }}
                    className="flex-1"
                  />
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{clockLength(position)} / {clockLength(row.seconds)}</span>
                </div>
                {open.transcript === "TranscriptDone" && <p className="font-legible">{open.words}</p>}
                {open.transcript === "TranscriptRunning" && <p className="text-sm text-muted-foreground">Transcribing on this phone…</p>}
                <div className="flex items-center gap-2">
                  {row.number && <Button variant="secondary" size="icon" aria-label={`Call ${name}`} onClick={() => onCallBack(row.number)}><PhoneIcon aria-hidden /></Button>}
                  {row.number && onMessage && <Button variant="secondary" size="icon" aria-label={`Message ${name}`} onClick={() => onMessage(row.number)}><MessageSquare aria-hidden /></Button>}
                  <span className="flex-1" />
                  {open.confirming ? (
                    <div role="alertdialog" aria-label="Delete this voicemail?" className="flex gap-2">
                      <Button variant="ghost" disabled={open.deleting} onClick={onDeleteDeclined}>Keep</Button>
                      <Button variant="destructive" loading={open.deleting} onClick={onDeleteConfirmed}>Delete</Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="icon" aria-label="Delete voicemail" disabled={voicemail.writeBlocked} onClick={onDeleteAsked}><Trash2 aria-hidden /></Button>
                  )}
                </div>
                {voicemail.deleteFailed && <p role="status" className="text-sm text-destructive">The voicemail could not be deleted.</p>}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
