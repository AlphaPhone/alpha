// spec/shell/permissions.md, "Story: Grant Alpha what it needs, when I choose"; spec/shell/permissions.md, "An allowed step says how much Android allowed, and a browser request left off says so"
import { Bell, CalendarDays, Camera, Check, Folder, Images, MapPin, Mic, type LucideIcon } from "lucide-react";
import type { Access, CheckNotice, Grant, Perm, Permissions } from "../../../gen/shell__permissions.ts";
import { accessOf, grantOf, keyAt, offersSettings, panelShown, selected, skippable, stepCount } from "../../../gen/shell__permissions.ts";
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

const GRANTS: Readonly<Record<Grant, string>> = {
  GrantNone: "Allowed", GrantPrecise: "Precise", GrantApproximate: "Approximate", GrantAll: "All", GrantSelected: "Selected", GrantLimited: "Limited",
};

const NOTICES: Readonly<Record<CheckNotice, string>> = {
  NoCheckNotice: "", NoticeStillOff: "Still off", NoticeUnconfirmed: "Couldn’t confirm",
};

/** What an allowed step's row says: how much Android allowed where it tells, else Allowed. */
export function allowedWord(walkthrough: Permissions, index: number): string {
  return GRANTS[grantOf(walkthrough, index)];
}

/** The walkthrough panel's state and the owner's choices on it. */
export interface StartupPermissionsProps {
  /** The walkthrough machine's state; a request is in flight while `pending` names a step. */
  walkthrough: Permissions;
  /** Allow on the current step, or Android's settings page for it. */
  onAllow: () => void;
  /** Moves past the current step; `skip` moves on without its access. */
  onNext: (skip: boolean) => void;
  /** Done on the Ready card. */
  onFinish: () => void;
  /** Leaves a review opened from Settings. */
  onClose: () => void;
}

/**
 * The access walkthrough: each permission's real state, Allow on the current step, and Ready at the end.
 * @model spec/shell/permissions.md
 */
export function StartupPermissions({ walkthrough, onAllow, onNext, onFinish, onClose }: StartupPermissionsProps) {
  const open = panelShown(walkthrough);
  const busy = walkthrough.pending >= 0;
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
  const count = stepCount(walkthrough);
  const settings = offersSettings(walkthrough);
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && review) onClose(); }}>
      <DialogContent closeLabel={review ? "Close" : "Not now"} className="grid max-h-[calc(var(--alpha-free-height,100dvh)-2rem)] grid-cols-1 overflow-y-auto">
        <DialogTitle className="font-serif text-3xl">Access</DialogTitle>
        {count > 0 && <p role="status" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Step {count} of {walkthrough.keys.length}</p>}
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
                  {here && <span className="block text-sm text-muted-foreground">{walkthrough.native && key === "PermLocation" ? "Alpha chat, nearby places and directions" : detail.reason}</span>}
                </span>
                {access === "AccessChecking" ? <Spinner label="Checking" /> : (
                  <span className={cn("font-mono text-xs uppercase tracking-widest", access === "AccessReady" ? "text-ok" : access === "AccessUnavailable" ? "text-warn" : "")}>{access === "AccessReady" ? allowedWord(walkthrough, index) : WORDS[access]}</span>
                )}
              </li>
            );
          })}
        </ol>
        {walkthrough.progressError && <p className="text-sm text-warn">Progress couldn’t be saved on this phone.</p>}
        {walkthrough.notice !== "NoCheckNotice" && <p role="status" className="text-sm text-muted-foreground">{NOTICES[walkthrough.notice]}</p>}
        <div className="flex justify-end gap-2">
          {review ? (
            <Button variant="ghost" onClick={onClose}>Done</Button>
          ) : (
            <Button variant="ghost" disabled={!skippable(walkthrough)} onClick={() => onNext(true)}>Skip</Button>
          )}
          {state === "AccessReady" && !settings ? (
            !review && <Button onClick={() => onNext(false)}>Continue</Button>
          ) : (
            <Button loading={busy} disabled={busy || state === "AccessChecking" || state === "AccessUnavailable"} onClick={onAllow}
              aria-label={`${settings ? "Open settings for" : "Allow"} ${DETAILS[keyAt(walkthrough, current)].title}`}>
              {settings ? "Open settings" : "Allow"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
