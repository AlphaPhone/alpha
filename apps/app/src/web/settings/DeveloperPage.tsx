// spec/settings/index.md, "Developer pages open only in a build with test mocks"
import type { SettingsPage } from "../../../gen/settings__facts.ts";
import { Button } from "../components/ui/index.ts";
import { Section, SettingRow } from "./Rows.tsx";

/** The simulated device commands a development build offers. */
export type DevCommand = "home" | "back" | "power" | "unlock" | "boot" | "assistant" | "shade" | "background" | "resume" | "incoming-call" | "incoming-message" | "pickup";

/** What the developer page can do; none of it reaches a real service. */
export interface DeveloperActs {
  readonly command: (command: DevCommand) => void;
  readonly requestRole: (role: "home" | "assistant" | "dialer" | "sms") => void;
  readonly toggleProfile: () => void;
  readonly profile: "app" | "development";
}

/** The developer page of a build with test mocks: its controls, the version and Android's developer settings. */
export interface DeveloperPageProps {
  readonly developerActs: DeveloperActs;
  readonly version: string;
  readonly native: boolean;
  readonly onHandoff: (page: SettingsPage) => void;
}

const COMMANDS: [DevCommand, string][] = [
  ["home", "Home"], ["back", "Back"], ["power", "Power"], ["unlock", "Unlock"], ["boot", "Restart"], ["assistant", "Assistant"],
  ["shade", "Notifications"], ["background", "Background"], ["resume", "Resume"], ["pickup", "Pick up phone"],
  ["incoming-call", "Incoming call"], ["incoming-message", "Incoming message"],
];

/** Development device controls, roles and the simulated profile, in a build with test mocks only. */
export function DeveloperPage({ developerActs, version, native, onHandoff }: DeveloperPageProps) {
  return (
    <>
      <Section>
        <SettingRow label="App version" state={{ word: version || "Development preview" }} />
        {native && <SettingRow label="Android developer settings" ariaLabel="Android developer settings" onHandoff={() => onHandoff("PageDeveloper")} />}
      </Section>
      <Section caption="Device controls">
        <div className="grid grid-cols-3 gap-2 p-3">
          {COMMANDS.map(([command, label]) => <Button key={command} variant="secondary" size="sm" onClick={() => developerActs.command(command)}>{label}</Button>)}
        </div>
      </Section>
      <Section caption="Roles">
        <div className="grid grid-cols-2 gap-2 p-3">
          {(["home", "assistant", "dialer", "sms"] as const).map((role) => <Button key={role} variant="secondary" size="sm" onClick={() => developerActs.requestRole(role)}>{role}</Button>)}
        </div>
      </Section>
      <Section caption="Profile">
        <div className="p-3">
          <Button variant="outline" onClick={developerActs.toggleProfile}>{developerActs.profile === "development" ? "Use app profile" : "Use development profile"}</Button>
        </div>
      </Section>
    </>
  );
}
