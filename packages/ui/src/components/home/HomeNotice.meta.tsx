import { expect, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { HomeNoticeProps } from "./HomeNotice.tsx";

export const meta: ComponentMeta<HomeNoticeProps> = {
  args: { notice: { tag: "TellNotOpened", ask: { tag: "OpenApp", label: "Clock" }, why: "Gone" }, place: "AsToast" },
  examples: {
    "Turned off": { notice: { tag: "TellNotOpened", ask: { tag: "OpenApp", label: "Clock" }, why: "TurnedOff" }, place: "InDrawer" },
    "Profile locked": { notice: { tag: "TellNotOpened", ask: { tag: "OpenApp", label: "Mail (Work)" }, why: "ProfileLocked" }, place: "InDrawer" },
    "Not in front": { notice: { tag: "TellNotOpened", ask: { tag: "OpenApp", label: "Clock" }, why: "NotInFront" } },
    "App info refused": { notice: { tag: "TellNotOpened", ask: { tag: "AppInfo", label: "Clock" }, why: "Unable" }, place: "InDrawer" },
    "Shade refused": { notice: { tag: "TellNotOpened", ask: { tag: "Shade" }, why: "Unable" } },
    "No answer": { notice: { tag: "TellNoAnswer" } },
    "Unlock first": { notice: { tag: "TellUnlockFirst" } },
    "Not saved": { notice: { tag: "TellNotSaved" }, place: "InEditBar" },
    "Saved Home unreadable": { notice: { tag: "TellSavedUnreadable" } },
    "Apps unread": { notice: { tag: "TellAppsUnread" } },
  },
  play: {
    Default: ({ canvasElement }: { canvasElement: HTMLElement }) =>
      expect(canvasElement).toHaveTextContent("Couldn't open Clock. It's no longer installed."),
    "Not saved": ({ canvasElement }: { canvasElement: HTMLElement }) =>
      expect(within(canvasElement).getByRole("alert")).toHaveTextContent("Couldn't save your change to Home"),
  },
};
