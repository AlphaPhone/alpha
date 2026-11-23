// spec/shell/index.md, "An app is offered only where its availability admits it"
import { Effect } from "effect";
import type { AppId, AppScreen, AppSurface, SurfaceSlot } from "../app-screen.ts";
import { AccountPresentation } from "../../account/presentation.vibe";
import { AccountSheet } from "../../account/sheet.vibe";
import { NotesEditor } from "../../notes/editor.vibe";
import { AOSP_ONLY } from "../../shell/apps.vibe";
import { runtime, type AppServices } from "../runtime.ts";
import { screens as accountScreens, surfaces as accountSurfaces } from "../account/index.tsx";
import { screens as assistantScreens, surfaces as assistantSurfaces } from "../assistant/index.tsx";
import { EmailCardView } from "../assistant/EmailCardView.tsx";
import { screens as browserScreens, surfaces as browserSurfaces } from "../browser/index.tsx";
import { HomeAgendaCard, SyncSettings, screens as calendarScreens, surfaces as calendarSurfaces } from "../calendar/index.tsx";
import { screens as cameraScreens, surfaces as cameraSurfaces } from "../camera/index.tsx";
import { screens as clockScreens, surfaces as clockSurfaces } from "../clock/index.tsx";
import { screens as filesScreens, surfaces as filesSurfaces } from "../files/index.tsx";
import { screens as inboxScreens, surfaces as inboxSurfaces } from "../inbox/index.tsx";
import { MapsCard, screens as mapsScreens, surfaces as mapsSurfaces } from "../maps/index.tsx";
import { screens as notesScreens, surfaces as notesSurfaces } from "../notes/index.tsx";
import { screens as settingsScreens, surfaces as settingsSurfaces } from "../settings/index.tsx";
import { HomeCards, ReviewRows, screens as telephonyScreens, surfaces as telephonySurfaces } from "../telephony/index.tsx";
import { screens as voiceScreens, surfaces as voiceSurfaces } from "../voice/index.tsx";
import { screens as workflowsScreens, surfaces as workflowsSurfaces } from "../workflows/index.tsx";

const handled = (program: Effect.Effect<boolean, never, AppServices>) => () => runtime.runPromise(program).catch(() => false);

/** Account's Back: a section closes back to the account section before the shell's Back leaves the app. */
export const accountBack = handled(Effect.gen(function* () {
  const sheet = yield* AccountSheet;
  if ((yield* sheet.current()).section === "AccountSection") return false;
  yield* (yield* AccountPresentation).back();
  return true;
}));

/** Notes' Back: an open note is saved and closed before the shell's Back leaves the app. */
export const notesBack = handled(Effect.gen(function* () {
  const editor = yield* NotesEditor;
  if ((yield* editor.draft()) === undefined) return false;
  yield* editor.leave();
  return true;
}));

const backs: Partial<Record<AppId, () => Promise<boolean>>> = { account: accountBack, notes: notesBack };

const withBack = (screen: AppScreen): AppScreen => screen.back !== undefined || backs[screen.id] === undefined ? screen : { ...screen, back: backs[screen.id] };

/** Every app screen an area hands the shell, each with its own Back where the app has layers of its own. */
export const allScreens: readonly AppScreen[] = [
  ...assistantScreens, ...voiceScreens, ...calendarScreens, ...notesScreens, ...filesScreens, ...inboxScreens,
  ...mapsScreens, ...browserScreens, ...cameraScreens, ...telephonyScreens, ...clockScreens, ...accountScreens,
  ...workflowsScreens, ...settingsScreens,
].map(withBack);

/** Every always-mounted surface an area hands the shell. */
export const allSurfaces: readonly AppSurface[] = [
  ...assistantSurfaces, ...voiceSurfaces, ...calendarSurfaces, ...notesSurfaces, ...filesSurfaces, ...inboxSurfaces,
  ...mapsSurfaces, ...browserSurfaces, ...cameraSurfaces, ...telephonySurfaces, ...clockSurfaces, ...accountSurfaces,
  ...workflowsSurfaces, ...settingsSurfaces,
];

/** What Home mounts from other areas: Calendar's agenda card and, on the Alpha image only, Telephony's attention cards. */
export const homeMounts = { agenda: HomeAgendaCard, attention: HomeCards } as const;

/** What Settings mounts from other areas: Calendar's device sync settings. */
export const settingsMounts = { calendarSync: SyncSettings } as const;

/** What the assistant's chat and approval cards embed from other areas: Maps' card, the email card and Telephony's review rows. */
export const chatMounts = { maps: MapsCard, email: EmailCardView, telephonyReview: ReviewRows } as const;

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
