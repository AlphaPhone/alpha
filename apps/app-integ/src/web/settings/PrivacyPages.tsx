// spec/settings/privacy.md, "Story: Know where my voice goes"; spec/settings/privacy.md, "Story: Pause or turn off listening and see what the listener did"; spec/settings/preferences.md, "Story: Decide what Alpha may do without asking"; spec/settings/preferences.md, "The open Browser page goes with a chat turn only while Browser page for Alpha is on"
import { ListChecks } from "lucide-react";
import type { Facts, SettingsPage } from "../../../gen/settings__facts.ts";
import type { Preference, Preferences } from "../../../gen/settings__preferences.ts";
import { asksBefore, sharesBrowserPage, sharesLocation } from "../../../gen/settings__preferences.ts";
import type { ListenerRow, Route, Stop } from "../../../gen/settings__privacy.ts";
import { micMayBeOn, micOn, voiceRow } from "../../../gen/settings__privacy.ts";
import { Button, Dialog, DialogContent, DialogTitle } from "../components/ui/index.ts";
import { Section, SettingRow, ToggleRow } from "./Rows.tsx";
import { ACCESS, LISTENING } from "./words.ts";

const ROUTE: Record<Route, string> = { OnPhone: "On this phone", ViaCloud: "Eliza Cloud", Direct: "Cartesia", RouteUnavailable: "Unavailable" };
const ASKS_ABOUT = "Web · Camera · Photos · Texter’s number · Text drafts";
const BROWSER_PAGE = "When you chat with Browser open, Alpha gets the page’s address, title, visible text and links. Never private tabs or sign-in pages. Hosted models can receive it.";

/** The listener row and where speech goes, as Voice reports them. */
export interface PrivacyState { readonly route: Route; readonly listener: ListenerRow; readonly aosp: boolean }

/** What the owner can do with the listener row. */
export interface PrivacyActs { readonly stop: (stop: Stop) => void; readonly listenerSettings: () => void }

/** Privacy or App permissions: the owner's preferences, the voice rows and Android's permission answers. */
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
  /** Reopen the first-run access walkthrough. */
  readonly onAccessSetup: () => void;
  /** Whether the reset of unreadable preferences awaits confirmation. */
  readonly resetAsked: boolean;
  /** Ask for that confirmation, or dismiss it. */
  readonly onAskReset: (open: boolean) => void;
}

/**
 * Privacy and App permissions.
 * @model spec/settings/privacy.md
 */
export function PrivacyPages({ page, facts, preferences, native, privacy, privacyActs, onPermissions, onPreference, onResetPreferences, onHandoff, onAccessSetup, resetAsked, onAskReset }: PrivacyPagesProps) {
  const { value, readable } = preferences;
  const read = facts.read;
  if (page === "Permissions") {
    const rows: [string, keyof typeof read][] = [["Camera", "camera"], ["Microphone", "microphone"], ["Location", "locationAccess"], ["Photos", "photos"], ["Files", "files"], ["Notifications", "notifications"], ...(native ? [["Calendar", "calendar"] as [string, keyof typeof read]] : [])];
    return (
      <Section>
        {rows.map(([label, key]) => {
          const access = ACCESS[read[key] as keyof typeof ACCESS];
          const target: SettingsPage = label === "Notifications" ? "PageNotifications" : label === "Photos" ? "PageAppInfo" : label === "Files" ? "PageFilesAccess" : "PagePrivacy";
          return <SettingRow key={label} label={label} state={access} onHandoff={native ? () => onHandoff(target) : undefined} ariaLabel={`${label}, ${access.word}${native ? ", opens Android settings" : ""}`} />;
        })}
      </Section>
    );
  }
  const voice = voiceRow(privacy.route);
  const speech = !native && privacy.route === "OnPhone" ? "In this app" : ROUTE[privacy.route];
  const row = privacy.listener;
  const stopping = row.busy;
  return (
    <>
      <Section>
        <SettingRow label="Permissions" ariaLabel="App permissions" onOpen={onPermissions} />
        <ToggleRow label="Ask before Alpha acts" detail={readable ? ASKS_ABOUT : undefined} on={asksBefore(value, readable)} locked={!readable} onChange={(on) => onPreference("AskBeforeActions", on)} />
        {native && <ToggleRow label="Location for Alpha" detail="Hosted models can receive it." on={sharesLocation(value, readable)} locked={!readable} onChange={(on) => onPreference("AgentLocation", on)} />}
        <ToggleRow label="Browser page for Alpha" detail={BROWSER_PAGE} on={sharesBrowserPage(value, readable)} locked={!readable} onChange={(on) => onPreference("BrowserPage", on)} />
        {!readable && <SettingRow label="Reset device preferences" destructive onOpen={() => onAskReset(true)} />}
      </Section>
      <Section caption="Voice">
        <SettingRow label="Speech" state={{ word: speech, tone: voice.leaves ? "warn" : undefined }} ariaLabel={`Speech, ${speech}${voice.leaves ? ", audio leaves the phone" : ""}`} />
        {privacy.aosp && row.shown !== "ListenerUnavailable" && (
          <ToggleRow label="Listening" detail={stopping ? undefined : LISTENING[row.shown]} on={micOn(row.shown) || row.shown === "ListenerPaused"} locked={stopping}
            onChange={(on) => (on ? privacyActs.listenerSettings() : privacyActs.stop("TurnOff"))} />
        )}
        {privacy.aosp && micOn(row.shown) && <SettingRow label="Pause" ariaLabel="Pause listening" busy={stopping} onOpen={() => privacyActs.stop("Pause")} />}
        {micMayBeOn(row) && <SettingRow label="Microphone may be on" state={{ word: "Open settings", tone: "destructive" }} onHandoff={() => onHandoff("PageHome")} ariaLabel="Microphone may be on, open Android settings" />}
        {privacy.aosp && <SettingRow label="Listening settings" onHandoff={privacyActs.listenerSettings} />}
      </Section>
      <Section>
        <SettingRow label="Access setup" ariaLabel="Review access setup" icon={<ListChecks aria-hidden className="size-5" />} onOpen={onAccessSetup} />
      </Section>
      <Dialog open={resetAsked} onOpenChange={onAskReset}>
        <DialogContent>
          <DialogTitle>Reset device preferences?</DialogTitle>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onAskReset(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { onAskReset(false); onResetPreferences(); }}>Reset</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
