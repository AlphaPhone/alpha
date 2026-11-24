import type { ReactNode } from "react";
import { Ear, KeyRound, ListChecks } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { SettingsDeviceSwitch, type SettingsDeviceSwitchProps } from "./SettingsDeviceSwitch.tsx";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import { type Neighbour, placed, type SettingsPageName, type SettingsPlaceProps } from "./vocabulary.ts";

/** What Alpha may share with a chat turn or change: `Share` in spec/app/settings/preferences.md. */
export type SettingsShare = "agent-location" | "browser-page" | "gmail-changes" | "calendar-edits";

const shared: SettingsShare[] = ["agent-location", "browser-page", "gmail-changes", "calendar-edits"];

export type SettingsPrivacyPageProps = SettingsPlaceProps & {
  /** How the phone's read of the device preferences stands. */
  read: SettingsDeviceSwitchProps["read"];
  /** Whether Alpha asks before it acts, or the safe value when it could not be read. */
  askFirst: boolean;
  /** A save of the device preferences is in flight. */
  saving?: boolean;
  /** A recovery of the device preferences is in flight. */
  recovering?: boolean;
  /** Called with the owner's choice of Ask before Alpha acts. */
  onAskFirstChange?: (askFirst: boolean) => void;
  /** What Alpha may share with a chat turn or change, each as read, or off when it could not be read. */
  shares?: Partial<Record<SettingsShare, boolean>>;
  /** Called with the owner's choice for one of the shares. */
  onShareChange?: (share: SettingsShare, on: boolean) => void;
  /** Resets the device preferences to the phone's defaults; offered only when they cannot be read. */
  onRecover?: () => void;
  /** Goes back to the first page. */
  onBack?: () => void;
  /** Opens a page that hangs from this one. */
  onOpen?: (page: SettingsPageName) => void;
  /** Opens the access walkthrough, to set up Alpha's access. */
  onSetUpAccess?: () => void;
  /** Hands over to the voice area, which owns the listener. */
  onHandOver?: (neighbour: Neighbour) => void;
  /** The rows other areas own on this page, such as the listening rows. */
  children?: ReactNode;
};

/**
 * Privacy: what Alpha may access, the walkthrough to set it up, whether Alpha asks before it acts, what it may share
 * with a chat turn or change, and the listener.
 * @model spec/app/settings/index.md
 */
export function SettingsPrivacyPage({ read, askFirst, saving, recovering, onAskFirstChange, shares = {}, onShareChange, onRecover, onBack, onOpen, onSetUpAccess, onHandOver, place, onPlace, children }: SettingsPrivacyPageProps) {
  const at = (row: number) => placed({ place, onPlace }, row);
  return (
    <SettingsPage title="Privacy" onBack={onBack}>
      <ListGroup>
        <SettingsNavRow title="Permissions" icon={<ListChecks />} onOpen={onOpen && (() => onOpen("permissions"))} {...at(0)} />
        <SettingsNavRow title="Set up Alpha access" icon={<KeyRound />} onOpen={onSetUpAccess} {...at(1)} />
        <SettingsNavRow title="Listener" icon={<Ear />} onOpen={onHandOver && (() => onHandOver("listener"))} {...at(2)} />
      </ListGroup>
      <ListGroup>
        <SettingsDeviceSwitch setting="ask-first" read={read} checked={askFirst} saving={saving} recovering={recovering} onChange={onAskFirstChange} onRecover={onRecover} />
      </ListGroup>
      <ListGroup heading="Share with Alpha">
        {shared.map((share) => (
          <SettingsDeviceSwitch key={share} setting={share} read={read} checked={read === "loaded" && shares[share] === true} saving={saving} recovering={recovering} onChange={onShareChange && ((on) => onShareChange(share, on))} />
        ))}
      </ListGroup>
      {children}
    </SettingsPage>
  );
}
