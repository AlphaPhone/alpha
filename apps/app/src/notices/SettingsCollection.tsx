// spec/app/notices/collection.md, "Story: Manage collection in Settings"
import { Banner, Button, ConfirmDialog, ListGroup, ListRow, NotificationAccessRowContext, SettingsNavRow, SettingsSwitchRow } from "@repo/ui";
import { ChevronUp, Play, Plus, SlidersHorizontal, Trash2, X } from "lucide-react";
import { use } from "react";
import type { PolicyCommand, PolicySelection } from "../../gen/app__notices__collection.ts";
import { useMachine } from "../../gen/app__notices__collection.react.ts";
import { area, type Resident, type Shown } from "../runtime/ui.tsx";
import type { Machine } from "../../gen/app__notices__collection.effect.vibe";
import { collectionSettings } from "./collection-settings.vibe";

const historyWords: Record<string, string> = {
  posted: "Arrived", updated: "Updated", removed: "Removed",
  opened: "Opened", dismissed: "Dismissed",
};

function reviewCopy(selection: PolicySelection, label?: string): { title: string; label: string; detail?: string } | undefined {
  switch (selection.command) {
    case "EnableCollection": return { title: "Read notifications from other apps?", label: "Turn on", detail: "Only the apps you choose." };
    case "ResumeCollection": return { title: "Resume reading notifications?", label: "Resume" };
    case "EnablePreview": return { title: "Allow notification previews?", label: "Allow", detail: label ? `Show ${label} previews?` : undefined };
    case "EnableHistory": return { title: "Keep notification history?", label: "Turn on", detail: "100 events · 24 h · no text" };
    case "ClearPolicyHistory": return { title: "Clear notification history?", label: "Clear", detail: "Can’t be undone." };
    default: return undefined;
  }
}

/**
 * Local settings for Android’s notification mirror, drawn as the Sunday v119 demo build drew them (Alpha 45f6bed30,
 * prototype/settings-adapter.ts:1146-1176): one card of Other apps with its status, Android access, the chosen apps,
 * Choose apps, History, View and Clear, with no headings.
 * @model spec/app/notices/collection.md
 */
function SettingsCollection({ runtime }: Shown<Machine | Resident>) {
  const { state, can, send } = useMachine(runtime);
  const access = use(NotificationAccessRowContext);
  const panel = state?.panel;
  if (!panel) return access ? <ListGroup>{access}</ListGroup> : null;
  const policy = panel.report;
  const refresh = { type: "policyRefresh" } as const;
  const apps = { type: "policyFindApps" } as const;
  const readHistory = { type: "policyReadHistory" } as const;
  const confirm = { type: "policyConfirm" } as const;
  const cancel = { type: "policyCancel" } as const;
  const pick = (command: PolicyCommand, packageName = "") => ({ type: "policyChoose", command, packageName } as const);
  const action = (command: PolicyCommand, packageName?: string) => {
    const event = pick(command, packageName);
    return can(event, "Owner") ? () => void send(event, "Owner") : undefined;
  };
  if (panel.phase === "PolicyAway" || panel.phase === "PolicyReading" || panel.phase === "PolicyUnavailable") {
    return (
      <ListGroup>
        <ListRow title="Other apps" detail="Not shared with agent"
          trailing={panel.phase === "PolicyUnavailable" ? "Unavailable" : "Checking…"} />
        {access}
        {can(refresh, "Owner") ? <ListRow title="Refresh" onClick={() => void send(refresh, "Owner")} /> : null}
      </ListGroup>
    );
  }
  const label = policy.apps.find((app) => app.packageName === panel.selection.packageName)?.label;
  const review = panel.review.showing ? reviewCopy(panel.selection, label) : undefined;
  const saving = panel.phase === "PolicyApplying";
  const status = !policy.enabled ? "Off" : policy.paused ? "Paused" : !policy.access ? "No access" : !policy.connected ? "Waiting" : "On";
  const selected = new Set(policy.apps.map(({ packageName }) => packageName));
  const viewHistory = can(readHistory, "Owner") ? () => void send(readHistory, "Owner") : undefined;
  const clearHistory = action("ClearPolicyHistory");
  return (
    <>
      {panel.failed ? <Banner variant="warn">Couldn’t update notification collection</Banner> : null}
      <ListGroup>
        <SettingsSwitchRow title="Other apps" detail={status === "On" || status === "Off" ? "Not shared with agent" : `${status} · Not shared with agent`}
          checked={policy.enabled} saving={saving} onCheckedChange={action(policy.enabled ? "DisableCollection" : "EnableCollection")} />
        {access}
        {policy.paused && policy.enabled ? <ListRow title="Resume" aria-label="Resume reading notifications" leading={<Play />} onClick={action("ResumeCollection")} /> : null}
        {policy.apps.map((app) => (
          <div key={app.packageName} className="flex items-center">
            {app.available ? <div className="min-w-0 flex-1"><SettingsSwitchRow title={app.label} detail="Show previews"
                checked={app.preview} onCheckedChange={action(app.preview ? "DisablePreview" : "EnablePreview", app.packageName)} /></div>
              : <div className="min-w-0 flex-1"><ListRow title={app.label} detail="Choose again" /></div>}
            <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${app.label}`} disabled={!can(pick("RemoveApp", app.packageName), "Owner")}
              onClick={action("RemoveApp", app.packageName)}><X /></Button>
          </div>
        ))}
        <ListRow title="Choose apps" aria-label={panel.choosing ? "Hide app choices" : "Choose notification apps"} leading={panel.choosing ? <ChevronUp /> : <Plus />}
          disabled={!can(apps, "Owner")} onClick={() => void send(apps, "Owner")} />
        {panel.choosing ? panel.choices.filter(({ packageName }) => !selected.has(packageName)).map((app) => (
          <ListRow key={app.packageName} title={app.label} aria-label={`Add ${app.label}`} trailing={<Plus />}
            onClick={action("AddApp", app.packageName)} />
        )) : null}
        <SettingsSwitchRow title="History" detail={policy.historyUnavailable ? "Unavailable" : "24 h · no message text"}
          checked={policy.history} onCheckedChange={action(policy.history ? "DisableHistory" : "EnableHistory")} />
        <SettingsNavRow title="View" aria-label="View local metadata history" icon={<SlidersHorizontal />} disabled={!viewHistory} onOpen={viewHistory} />
        <ListRow title="Clear" aria-label="Clear local metadata history" leading={<Trash2 />} disabled={!clearHistory} onClick={clearHistory} />
        {panel.viewing ? panel.history.length ? panel.history.map(({ id, appLabel, at, word }) =>
          <ListRow key={id} title={appLabel} detail={`${historyWords[word.toLowerCase()] ?? "Notification"} · ${new Date(at).toLocaleString()}`} />)
          : <ListRow title="History" trailing="None" /> : null}
      </ListGroup>
      {review ? <ConfirmDialog open title={review.title} confirmLabel={review.label} destructive={panel.selection.command === "ClearPolicyHistory"}
        onConfirm={() => { if (can(confirm, "Owner")) void send(confirm, "Owner"); }}
        onCancel={() => { if (can(cancel, "Owner")) void send(cancel, "Owner"); }}>{review.detail}</ConfirmDialog> : null}
    </>
  );
}

export default area(collectionSettings, SettingsCollection);
