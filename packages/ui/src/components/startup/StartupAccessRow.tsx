import type { ReactNode } from "react";
import { Bell, Calendar, Camera, Folder, Images, MapPin, Mic } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { Spinner } from "../Spinner.tsx";
import type { StatusDotProps } from "../StatusDot.tsx";
import { SettingsReading } from "../settings/SettingsReading.tsx";
import type { StartupAccess, StartupAccessAction, StartupAccessWord } from "./vocabulary.ts";

export type StartupAccessRowProps = {
  /** Which access the row is about. */
  access: StartupAccess;
  /** What Android reports of it, in the words Steps gives. */
  word: StartupAccessWord;
  /** The step being asked: its row says what the access is for and carries the action. */
  current?: boolean;
  /** Use the Android copy where its feature carries a different rationale. */
  native?: boolean;
  /** The one action the row offers; its button is pressable only with `onAct`. */
  action?: StartupAccessAction;
  /** Android's prompt or the owner's request is still unanswered; the button refuses presses. */
  busy?: boolean;
  /** Presses the action; given exactly when the machine allows it. */
  onAct?: () => void;
};

const names: Record<StartupAccess, { title: string; reason: string; icon: ReactNode }> = {
  Notifications: { title: "Notifications", reason: "Reminders and updates", icon: <Bell /> },
  Microphone: { title: "Microphone", reason: "Voice notes and talk", icon: <Mic /> },
  Camera: { title: "Camera", reason: "Photos and text scans", icon: <Camera /> },
  Location: { title: "Location", reason: "Nearby places, directions", icon: <MapPin /> },
  Calendar: { title: "Calendar", reason: "Read; add after review", icon: <Calendar /> },
  Photos: { title: "Photos", reason: "Photos you allow", icon: <Images /> },
  Files: { title: "Files", reason: "Shared storage files", icon: <Folder /> },
};

const words: Record<StartupAccessWord, { label: string; status: StatusDotProps["status"] }> = {
  Allowed: { label: "Allowed", status: "ok" },
  Precise: { label: "Precise", status: "ok" },
  Approximate: { label: "Approximate", status: "ok" },
  AllPhotos: { label: "All", status: "ok" },
  SelectedPhotos: { label: "Selected", status: "ok" },
  Limited: { label: "Limited", status: "ok" },
  Off: { label: "Off", status: "off" },
  AskFirst: { label: "Ask", status: "off" },
  Reading: { label: "Checking", status: "busy" },
  CouldNotCheck: { label: "Couldn’t check", status: "warn" },
};

/**
 * One access and where it stands. The step being asked, while it lacks access, also says what the access is for and
 * carries its one action, Allow, Settings, Check or Try again, which is then the word for where it stands.
 * @model spec/app/startup/access.md
 */
export function StartupAccessRow({ access, word, current = false, native = false, action, busy = false, onAct }: StartupAccessRowProps) {
  const { title, reason, icon } = names[access];
  const { label, status } = words[word];
  const rationale = native && access === "Location" ? "Alpha chat, nearby places and directions" : reason;
  const checking = current && (word === "Reading" || busy);
  return (
    <li className="flex min-h-14.25 items-center gap-3.5 border-b border-border" aria-current={current ? "step" : undefined}>
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary [&>svg]:size-5">{icon}</span>
      <span className="min-w-0 flex-1 leading-[1.5] wrap-anywhere">
        <span className={cn("block", current && "font-medium")}>{title}</span>
        {current ? <span className="block text-caption leading-[1.5] text-muted-foreground/97 dark:text-muted-foreground">{rationale}</span> : null}
      </span>
      {(!checking && !action) || status === "ok" ? (
        <span role={current && status === "ok" ? "status" : undefined} className="shrink-0 text-sm text-muted-foreground/97 dark:text-muted-foreground">
          {status === "busy" ? <Spinner size="sm" label={label} /> : <SettingsReading reading={{ word: "reported", value: label, status }} />}
        </span>
      ) : null}
      {action || checking ? (
        <Button size="sm" className="bg-primary font-normal text-primary-foreground hover:bg-primary active:bg-primary"
          loading={checking} disabled={checking || !onAct} aria-label={checking ? "Checking" : undefined} onClick={onAct}>
          {checking ? null : action}
        </Button>
      ) : null}
    </li>
  );
}
