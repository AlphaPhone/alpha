import type { ReactNode } from "react";
import { Ear, ListChecks, SlidersHorizontal } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { SettingsDeviceSwitch, type SettingsDeviceSwitchProps } from "./SettingsDeviceSwitch.tsx";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import { placed, type SettingsPageName, type SettingsPlaceProps } from "./vocabulary.ts";

/** What Alpha may share with a chat turn or change: `Share` in spec/app/settings/preferences.md. */
export type SettingsShare = "agent-location" | "browser-page" | "gmail-changes" | "calendar-edits" | "telegram-context" | "slack-context";

const connectedShares: SettingsShare[] = ["gmail-changes", "calendar-edits", "telegram-context", "slack-context"];

export type SettingsPrivacyPageProps = SettingsPlaceProps & {
  /** The phone can share its Android location. */
  onPhone?: boolean;
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
  /** Hands over to the voice area, which owns the listener; the row is offered only on an Alpha image, which has one. */
  onListener?: () => void;
  /** The rows other areas own on this page, such as where speech goes. */
  children?: ReactNode;
};

/**
 * Privacy: what Alpha may access, whether Alpha asks before it acts, what it may share with a chat turn or change,
 * where speech goes, the listener on an Alpha image, and the walkthrough to set up access.
 * @model spec/app/settings/index.md
 */
export function SettingsPrivacyPage({ onPhone = true, read, askFirst, saving, recovering, onAskFirstChange, shares = {}, onShareChange, onRecover, onBack, onOpen, onSetUpAccess, onListener, place, onPlace, children }: SettingsPrivacyPageProps) {
  const at = (row: number) => placed({ place, onPlace }, row);
  const permissionSwitch = (share: SettingsShare) => (
    <SettingsDeviceSwitch key={share} setting={share} read={read} checked={read === "loaded" && shares[share] === true} saving={saving} recovering={recovering} onChange={onShareChange && ((on) => onShareChange(share, on))} />
  );
  return (
    <SettingsPage title="Privacy" onBack={onBack} backLabel="Back to Settings">
      <ListGroup className="[&_label>span:first-child>span:first-child]:leading-[normal]">
        <SettingsNavRow title="Permissions" icon={<SlidersHorizontal />} onOpen={onOpen && (() => onOpen("permissions"))} {...at(0)} />
        <SettingsDeviceSwitch setting="ask-first" read={read} checked={askFirst} saving={saving} recovering={recovering} onChange={onAskFirstChange} onRecover={onRecover} />
        {onPhone ? permissionSwitch("agent-location") : null}
        {permissionSwitch("browser-page")}
      </ListGroup>
      {children}
      {onListener ? (
        <ListGroup>
          <SettingsNavRow title="Listener" icon={<Ear />} onOpen={onListener} {...at(2)} />
        </ListGroup>
      ) : null}
      <ListGroup>
        <SettingsNavRow title="Access setup" aria-label="Review access setup" icon={<ListChecks />} onOpen={onSetUpAccess} {...at(1)} />
      </ListGroup>
      <ListGroup>
        {connectedShares.map(permissionSwitch)}
      </ListGroup>
    </SettingsPage>
  );
}
