// spec/voice/conversation.md, "What the conversation shows follows the session while it runs, and speaking clears the quiet retries"
import type { Shown } from "../../../gen/voice__conversation.ts";
import { cn } from "../lib/cn.ts";
import { shownLabel } from "./messages.ts";

/** What the conversation shows, drawn as moving or resting bars. */
export interface VoiceActivityProps {
  /** What the conversation shows now. */
  shown: Shown;
}

const bars = ["h-2", "h-3", "h-4", "h-3", "h-2"] as const;
const moving = new Set<Shown>(["Starting", "Listening", "Thinking", "Speaking", "Retrying"]);

/**
 * Five bars that move while voice listens, thinks or speaks, and rest otherwise; the phase is their accessible name.
 * @model spec/voice/conversation.md
 */
export function VoiceActivity({ shown }: VoiceActivityProps) {
  const live = moving.has(shown);
  return (
    <span role="img" aria-label={shownLabel(shown)} className="inline-flex h-4 items-center gap-0.5">
      {bars.map((height, index) => (
        <span
          key={index}
          className={cn(
            "w-1 rounded-full motion-reduce:animate-none",
            height,
            shown === "Failed" ? "bg-destructive" : live ? "bg-primary" : "bg-muted-foreground",
            live && "animate-pulse",
            shown === "Speaking" && "duration-fast",
          )}
        />
      ))}
    </span>
  );
}
