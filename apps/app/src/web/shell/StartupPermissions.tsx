// spec/shell/permissions.md, "Story: Grant Alpha what it needs, when I choose"
import { Bell, CalendarDays, Camera, Check, Folder, Images, MapPin, Mic, type LucideIcon } from "lucide-react";
import type { Access, Perm, Permissions } from "../../../gen/shell__permissions.ts";
import { accessOf, keyAt, selected } from "../../../gen/shell__permissions.ts";
import { Button, Dialog, DialogContent, DialogTitle, Spinner } from "../components/ui/index.ts";
import { cn } from "../lib/cn.ts";

const DETAILS: Readonly<Record<Perm, { title: string; reason: string; icon: LucideIcon }>> = {
  PermNotifications: { title: "Notifications", reason: "Reminders and updates", icon: Bell },
  PermMicrophone: { title: "Microphone", reason: "Voice notes and talk", icon: Mic },
  PermCamera: { title: "Camera", reason: "Photos and text scans", icon: Camera },
  PermLocation: { title: "Location", reason: "Nearby places, directions", icon: MapPin },
  PermCalendar: { title: "Calendar", reason: "Read; add after review", icon: CalendarDays },
  PermPhotos: { title: "Photos", reason: "Photos you allow", icon: Images },
  PermFiles: { title: "Files", reason: "Shared storage files", icon: Folder },
};

const WORDS: Readonly<Record<Access, string>> = {
  AccessChecking: "Checking", AccessAsk: "Ask", AccessSettings: "Off", AccessReady: "Allowed", AccessUnavailable: "Couldn’t check",
};

export interface StartupPermissionsProps {
  walkthrough: Permissions;
  /** The step's request or Settings handoff is in flight. */
  busy?: boolean;
  onAllow: () => void;
  onNext: (skip: boolean) => void;
  onFinish: () => void;
  onClose: () => void;
}

/**
 * The access walkthrough: each permission's real state, Allow on the current step, and Ready at the end.
 * @model spec/shell/permissions.md
 */
export function StartupPermissions({ walkthrough, busy = false, onAllow, onNext, onFinish, onClose }: StartupPermissionsProps) {
  const open = walkthrough.phase === "PhaseWalkthrough" || walkthrough.phase === "PhaseReady";
  if (walkthrough.phase === "PhaseReady") {
    return (
      <Dialog open={open} onOpenChange={(next) => { if (!next) onFinish(); }}>
        <DialogContent closeLabel="Done">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary"><Check aria-hidden className="size-6" /></span>
          <DialogTitle className="font-serif text-3xl">All set</DialogTitle>
          {walkthrough.progressError && <p className="text-sm text-warn">Progress couldn’t be saved on this phone.</p>}
          <Button onClick={onFinish}>Done</Button>
        </DialogContent>
      </Dialog>
    );
  }
  const current = selected(walkthrough);
  const state = accessOf(walkthrough, current);
  const review = walkthrough.target >= 0;
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && review) onClose(); }}>
      <DialogContent closeLabel={review ? "Close" : "Not now"} className="grid max-h-[calc(var(--alpha-free-height,100dvh)-2rem)] grid-cols-1 overflow-y-auto">
        <DialogTitle className="font-serif text-3xl">Access</DialogTitle>
        <ol className="flex flex-col">
          {walkthrough.keys.map((key, index) => {
            const detail = DETAILS[key];
            const Icon = detail.icon;
            const here = index === current;
            const access = accessOf(walkthrough, index);
            return (
              <li key={key} aria-current={here ? "step" : undefined} className={cn("flex min-h-14 items-center gap-3 py-2", !here && "text-muted-foreground")}>
                <Icon aria-hidden className="size-5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block">{detail.title}</span>
                  {here && <span className="block text-sm text-muted-foreground">{detail.reason}</span>}
                </span>
                {access === "AccessChecking" ? <Spinner label="Checking" /> : (
                  <span className={cn("font-mono text-xs uppercase tracking-widest", access === "AccessReady" ? "text-ok" : access === "AccessUnavailable" ? "text-warn" : "")}>{WORDS[access]}</span>
                )}
              </li>
            );
          })}
        </ol>
        {walkthrough.progressError && <p className="text-sm text-warn">Progress couldn’t be saved on this phone.</p>}
        <div className="flex justify-end gap-2">
          {review ? (
            <Button variant="ghost" onClick={onClose}>Done</Button>
          ) : (
            <Button variant="ghost" disabled={busy || state === "AccessChecking"} onClick={() => onNext(true)}>Not now</Button>
          )}
          {state === "AccessReady" ? (
            !review && <Button onClick={() => onNext(false)}>Continue</Button>
          ) : (
            <Button loading={busy} disabled={state === "AccessChecking" || state === "AccessUnavailable"} onClick={onAllow}
              aria-label={`${state === "AccessSettings" ? "Open settings for" : "Allow"} ${DETAILS[keyAt(walkthrough, current)].title}`}>
              {state === "AccessSettings" ? "Open settings" : "Allow"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
