import { cn } from "@repo/ui";
import { callerInitials } from "./words.ts";

/** The call row or voicemail caller’s initials, visible beside the name. */
export function CallAvatar({ name, raised = false }: { name: string; raised?: boolean }) {
  return <span aria-hidden className={cn("grid size-11 shrink-0 place-items-center rounded-full font-bold", raised ? "bg-background" : "bg-secondary")}>{callerInitials(name)}</span>;
}
