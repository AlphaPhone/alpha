import { Alert } from "../Alert.tsx";
import { Toast } from "../Toast.tsx";

/** What Android was asked, with the name of the app it was asked about. */
export type HomeAsk = { tag: "OpenApp"; label: string } | { tag: "AppInfo"; label: string } | { tag: "Shade" };

/** Why Android did not do what it was asked. */
export type HomeWhy = "Gone" | "TurnedOff" | "ProfileLocked" | "NotInFront" | "Unable";

/** What Home tells the owner: one of the launcher's `Tell…` effects. */
export type HomeNoticeMessage =
  | { tag: "TellNotOpened"; ask: HomeAsk; why: HomeWhy }
  | { tag: "TellNoAnswer" }
  | { tag: "TellUnlockFirst" }
  | { tag: "TellNotSaved" }
  | { tag: "TellSavedUnreadable" }
  | { tag: "TellAppsUnread" };

/** Where the owner is when the notice is told. */
export type HomePlace = "AsToast" | "InDrawer" | "InEditBar";

export type HomeNoticeProps = {
  /** What went wrong. */
  notice: HomeNoticeMessage;
  /** A toast on bare Home, inline in the open drawer, or in the edit bar while Home is being edited. */
  place: HomePlace;
  className?: string;
};

const failed = { OpenApp: (label: string) => `Couldn't open ${label}`, AppInfo: (label: string) => `Couldn't show App info for ${label}` };
const reasons: Record<HomeWhy, string> = {
  Gone: "It's no longer installed.",
  TurnedOff: "It's turned off.",
  ProfileLocked: "Its profile is locked.",
  NotInFront: "Alpha wasn't in front.",
  Unable: "Android couldn't do it.",
};

/** What Home says of `notice`, in the owner's words. */
export const homeNoticeWords = (notice: HomeNoticeMessage): string => {
  switch (notice.tag) {
    case "TellNotOpened": {
      const { ask } = notice;
      const lead = ask.tag === "Shade" ? "Couldn't open notifications" : failed[ask.tag](ask.label);
      return `${lead}. ${reasons[notice.why]}`;
    }
    case "TellNoAnswer":
      return "Android didn't answer about notifications";
    case "TellUnlockFirst":
      return "Unlock your phone first";
    case "TellNotSaved":
      return "Couldn't save your change to Home";
    case "TellSavedUnreadable":
      return "Couldn't read your saved Home";
    case "TellAppsUnread":
      return "Couldn't read your apps";
    default: {
      const _exhaustive: never = notice;
      return _exhaustive;
    }
  }
};

/**
 * A failure told where the owner is looking: a toast on bare Home, put in the shell's `ToastRegion`, or a warning in
 * place in the drawer or the edit bar.
 * @model spec/app/home/index.md
 */
export function HomeNotice({ notice, place, className }: HomeNoticeProps) {
  return place === "AsToast"
    ? <Toast className={className}>{homeNoticeWords(notice)}</Toast>
    : <Alert variant="warn" className={className}>{homeNoticeWords(notice)}</Alert>;
}
