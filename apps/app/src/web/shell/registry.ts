// spec/shell/index.md, "An app is offered only where its availability admits it"
import type { AppId, AppScreen, AppSurface, SurfaceSlot } from "../app-screen.ts";
import { AOSP_ONLY } from "../../shell/apps.vibe";
import { screens as assistantScreens, surfaces as assistantSurfaces } from "../assistant/index.tsx";
import { screens as voiceScreens, surfaces as voiceSurfaces } from "../voice/index.tsx";
import { screens as calendarScreens, surfaces as calendarSurfaces } from "../calendar/index.tsx";
import { screens as notesScreens, surfaces as notesSurfaces } from "../notes/index.tsx";
import { screens as filesScreens, surfaces as filesSurfaces } from "../files/index.tsx";
import { screens as inboxScreens, surfaces as inboxSurfaces } from "../inbox/index.tsx";
import { screens as mapsScreens, surfaces as mapsSurfaces } from "../maps/index.tsx";
import { screens as browserScreens, surfaces as browserSurfaces } from "../browser/index.tsx";
import { screens as cameraScreens, surfaces as cameraSurfaces } from "../camera/index.tsx";
import { screens as telephonyScreens, surfaces as telephonySurfaces } from "../telephony/index.tsx";
import { screens as clockScreens, surfaces as clockSurfaces } from "../clock/index.tsx";
import { screens as accountScreens, surfaces as accountSurfaces } from "../account/index.tsx";
import { screens as workflowsScreens, surfaces as workflowsSurfaces } from "../workflows/index.tsx";
import { screens as settingsScreens, surfaces as settingsSurfaces } from "../settings/index.tsx";

/** Every app screen an area hands the shell. */
export const allScreens: readonly AppScreen[] = [
  ...assistantScreens, ...voiceScreens, ...calendarScreens, ...notesScreens, ...filesScreens, ...inboxScreens,
  ...mapsScreens, ...browserScreens, ...cameraScreens, ...telephonyScreens, ...clockScreens, ...accountScreens,
  ...workflowsScreens, ...settingsScreens,
];

/** Every always-mounted surface an area hands the shell. */
export const allSurfaces: readonly AppSurface[] = [
  ...assistantSurfaces, ...voiceSurfaces, ...calendarSurfaces, ...notesSurfaces, ...filesSurfaces, ...inboxSurfaces,
  ...mapsSurfaces, ...browserSurfaces, ...cameraSurfaces, ...telephonySurfaces, ...clockSurfaces, ...accountSurfaces,
  ...workflowsSurfaces, ...settingsSurfaces,
];

/** Whether the build that admitted these apps is the Alpha AOSP image. */
export function onImage(admitted: readonly string[]): boolean {
  return admitted.some((app) => AOSP_ONLY.has(app as AppId));
}

/** The screens this build offers: every everywhere app, and the AOSP-only ones only on the image. */
export function admittedScreens(admitted: readonly string[]): AppScreen[] {
  return allScreens.filter((screen) => admitted.includes(screen.id) && (screen.availability === "everywhere" || onImage(admitted)));
}

/** The screen of one app, where this build offers it. */
export function screenOf(app: string, admitted: readonly string[]): AppScreen | undefined {
  return admittedScreens(admitted).find((screen) => screen.id === app);
}

/** The surfaces of one slot this build offers. */
export function surfacesIn(slot: SurfaceSlot, admitted: readonly string[]): AppSurface[] {
  return allSurfaces.filter((surface) => surface.slot === slot && (surface.availability === "everywhere" || onImage(admitted)));
}
