// spec/settings/privacy.md, "Story: Know where my voice goes"; spec/settings/privacy.md, "Story: Pause or turn off listening and see what the listener did"; spec/settings/preferences.md, "Story: Decide what Alpha may do without asking"
import { useState } from "react";
import type { Facts, SettingsPage } from "../../../gen/settings__facts.ts";
import type { Preference, Preferences } from "../../../gen/settings__preferences.ts";
import { asksBefore, sharesLocation } from "../../../gen/settings__preferences.ts";
import type { ListenerRow, Route, Stop } from "../../../gen/settings__privacy.ts";
import { micOn, voiceRow } from "../../../gen/settings__privacy.ts";
import { Button, Dialog, DialogContent, DialogTitle } from "../components/ui/index.ts";
import { Section, SettingRow, ToggleRow } from "./Rows.tsx";
import { ACCESS, LISTENING } from "./words.ts";

const ROUTE: Record<Route, string> = { OnPhone: "On this phone", ViaCloud: "Eliza Cloud", Direct: "Cartesia", RouteUnavailable: "Unavailable" };

/** The listener row and where speech goes, as Voice reports them. */
export interface PrivacyState { readonly route: Route; readonly listener: ListenerRow; readonly aosp: boolean }

/** What the owner can do with the listener row. */
export interface PrivacyActs { readonly stop: (stop: Stop) => void; readonly listenerSettings: () => void }

export interface PrivacyPagesProps {
  readonly page: "Privacy" | "Permissions";
  readonly facts: Facts;
  readonly preferences: { readonly value: Preferences; readonly readable: boolean };
  readonly native: boolean;
  readonly privacy: PrivacyState;
  readonly privacyActs: PrivacyActs;
  readonly onPermissions: () => void;
  readonly onPreference: (preference: Preference, on: boolean) => void;
  readonly onResetPreferences: () => void;
  readonly onHandoff: (page: SettingsPage) => void;
}

/**
 * Privacy and App permissions.
 * @model spec/settings/privacy.md
 */
export function PrivacyPages({ page, facts, preferences, native, privacy, privacyActs, onPermissions, onPreference, onResetPreferences, onHandoff }: PrivacyPagesProps) {
  const { value, readable } = preferences;
  const [confirmReset, setConfirmReset] = useState(false);
  const read = facts.read;
  if (page === "Permissions") {
    const rows: [string, keyof typeof read][] = [["Camera", "camera"], ["Microphone", "microphone"], ["Location", "locationAccess"], ["Photos", "photos"], ["Files", "files"], ["Notifications", "notifications"], ...(native ? [["Calendar", "calendar"] as [string, keyof typeof read]] : [])];
    return (
      <Section>
        {rows.map(([label, key]) => {
          const access = ACCESS[read[key] as keyof typeof ACCESS];
          return <SettingRow key={label} label={label} state={access} onHandoff={native ? () => onHandoff(label === "Notifications" ? "PageNotifications" : "PagePrivacy") : undefined} ariaLabel={`${label}, ${access.word}${native ? ", opens Android settings" : ""}`} />;
        })}
      </Section>
    );
  }
  const voice = voiceRow(privacy.route);
  const row = privacy.listener;
  const stopping = row.busy;
  return (
    <>
      <Section>
        <ToggleRow label="Ask before Alpha acts" on={asksBefore(value, readable)} locked={!readable} onChange={(on) => onPreference("AskBeforeActions", on)} />
        {native && <ToggleRow label="Location for Alpha" detail="Hosted models can receive it." on={sharesLocation(value, readable)} locked={!readable} onChange={(on) => onPreference("AgentLocation", on)} />}
        <ToggleRow label="Load images in email" on={readable && value.mailImages} locked={!readable} onChange={(on) => onPreference("MailImages", on)} />
        {!readable && <SettingRow label="Reset device preferences" destructive onOpen={() => setConfirmReset(true)} />}
        <SettingRow label="App permissions" onOpen={onPermissions} />
      </Section>
      <Section caption="Voice">
        <SettingRow label="Speech" state={{ word: ROUTE[privacy.route], tone: voice.leaves ? "warn" : undefined }} ariaLabel={`Speech, ${ROUTE[privacy.route]}${voice.leaves ? ", audio leaves the phone" : ""}`} />
        {privacy.aosp && row.shown !== "ListenerUnavailable" && (
          <ToggleRow label="Listening" detail={stopping ? undefined : LISTENING[row.shown]} on={micOn(row.shown) || row.shown === "ListenerPaused"} locked={stopping}
            onChange={(on) => (on ? privacyActs.listenerSettings() : privacyActs.stop("TurnOff"))} />
        )}
        {privacy.aosp && micOn(row.shown) && <SettingRow label="Pause" ariaLabel="Pause listening" busy={stopping} onOpen={() => privacyActs.stop("Pause")} />}
        {row.stopUnconfirmed && <SettingRow label="Microphone may be on" state={{ word: "Open settings", tone: "destructive" }} onHandoff={() => onHandoff("PagePrivacy")} ariaLabel="Microphone may be on, open Android settings" />}
        {privacy.aosp && <SettingRow label="Listening settings" onHandoff={privacyActs.listenerSettings} />}
      </Section>
      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogTitle>Reset device preferences?</DialogTitle>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setConfirmReset(false); onResetPreferences(); }}>Reset</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
