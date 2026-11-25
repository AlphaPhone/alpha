// spec/app/home/index.md, "Story: Open an app"; spec/app/home/index.md, "Story: See the apps on this phone"
import type { LauncherApp, NotificationShadeOutcome } from "@elizaos/os-bridges";

/** What the fake phone's launcher holds: its apps, how it answers, and what Home asked of it. */
export interface LauncherScene {
  /** Alpha is the phone's launcher, and Android hands it the shade. */
  launcher: boolean;
  /** This page is Alpha's assistant surface. */
  assistant: boolean;
  apps: LauncherApp[];
  /** A listing fails, as when a profile is being unlocked. */
  unlisted: boolean;
  /** Each app Android refuses to open, with the code it rejects with. */
  readonly refusing: Map<string, string>;
  /** What the shade answers; "silent" never answers. */
  shade: NotificationShadeOutcome | "silent";
  /** Each package Home asked Android to open, and each it asked App info for. */
  readonly opened: string[];
  readonly infos: string[];
  shades: number;
  /** Tell the page the apps changed, as Android's package listener does. */
  changed: () => void;
}

export function launcherScene(): LauncherScene {
  return {
    launcher: true, assistant: false, unlisted: false, refusing: new Map(), shade: "opened", opened: [], infos: [], shades: 0, changed: () => {},
    apps: [
      { packageName: "org.fixture.clock", activityName: "org.fixture.clock.Main", label: "Clock" },
      { packageName: "org.fixture.mail", activityName: "org.fixture.mail.Main", label: "Mail" },
    ],
  };
}
