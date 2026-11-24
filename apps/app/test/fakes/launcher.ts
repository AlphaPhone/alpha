// spec/app/home/index.md, "Story: Open an app"; spec/app/home/index.md, "Story: See the apps on this phone"
import type { LaunchTarget, LauncherApp, LauncherAppsChange, NotificationShadeOutcome, SystemHostPlugin, SystemPlugin } from "@elizaos/os/bridges/definitions/system";
import { type Faked, plugin, rejection } from "./phone.ts";

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

type Used = Pick<SystemPlugin, "listLauncherApps" | "launchApp" | "getBuildInfo" | "getLaunchInfo" | "openNotificationShade"> & Pick<SystemHostPlugin, "openAppInfo">;

/** `SystemPlugin.java`, the `ElizaSystem` plugin, as far as Home asks it: its apps, opening one or its info page, the shade and how Alpha is presented. */
export function elizaSystem(scene: LauncherScene): Faked {
  return plugin<Used, { launcherAppsChanged: LauncherAppsChange }>((emit) => {
    scene.changed = () => emit("launcherAppsChanged", { reason: "changed" });
    const known = (target: LaunchTarget) => scene.apps.find((app) => app.packageName === target.packageName);
    return {
      listLauncherApps: () => (scene.unlisted ? Promise.reject(rejection("failed")) : Promise.resolve({ apps: scene.apps })),
      launchApp(target) {
        scene.opened.push(target.packageName);
        const refused = scene.refusing.get(target.packageName) ?? (known(target) ? undefined : "not-installed");
        return refused === undefined ? Promise.resolve() : Promise.reject(rejection(refused));
      },
      openAppInfo(target) {
        scene.infos.push(target.packageName);
        return known(target) ? Promise.resolve() : Promise.reject(rejection("not-installed"));
      },
      openNotificationShade() {
        scene.shades += 1;
        const shade = scene.shade;
        return shade === "silent" ? new Promise(() => {}) : Promise.resolve({ status: shade });
      },
      getBuildInfo: () => Promise.resolve({ launcher: scene.launcher, version: "test" }),
      getLaunchInfo: () => Promise.resolve({ assistant: scene.assistant }),
    };
  });
}
