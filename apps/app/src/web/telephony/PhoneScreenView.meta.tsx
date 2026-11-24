import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import {
  commsCall, commsKeypad, commsRecents, commsRecentsAlpha, keypad, keypadDialing, longRequest, phoneVoicemail, recents, recentsEmpty, recentsFailed,
  recentsFiltered, recentsMany, recentsNeedAccess, recentsReading, restoredCard, voicemail, voicemailConfirming,
} from "./fixtures.ts";
import type { PhoneScreenViewProps } from "./PhoneScreenView.tsx";

export const meta: ComponentMeta<PhoneScreenViewProps> = {
  args: {
    phone: recents, voicemail, now: recents.readAt, answer: "", comms: commsRecents, request: "", card: null,
    onTab: fn(), onContacts: fn(), onQuery: fn(), onAsk: fn(), onCall: fn(), onAllow: fn(), onRefresh: fn(), onClearQuery: fn(), onPress: fn(), onErase: fn(),
    onOpenVoicemail: fn(), onPlay: fn(), onStopped: fn(), onRetryAudio: fn(), onCallBack: fn(), onMessage: fn(),
    onDeleteAsked: fn(), onDeleteDeclined: fn(), onDeleteConfirmed: fn(),
    onRequest: fn(), onSubmitRequest: fn(), onAlpha: fn(), onEndCall: fn(), onCloseChat: fn(), onDecline: fn(),
  },
  examples: {
    Reading: { phone: recentsReading },
    NeedsAccess: { phone: recentsNeedAccess },
    Failed: { phone: recentsFailed },
    NoCalls: { phone: recentsEmpty },
    ManyCalls: { phone: recentsMany },
    AlphaFilter: { phone: recentsFiltered, answer: "One missed call from Maya Chen today." },
    Keypad: { phone: keypad, comms: commsKeypad },
    Dialing: { phone: keypadDialing, comms: commsCall },
    Voicemail: { phone: phoneVoicemail, voicemail: voicemailConfirming },
    AskingAlpha: { comms: commsRecentsAlpha, request: longRequest, card: restoredCard },
  },
  play: {
    Default: async ({ canvasElement, args }) => {
      const phone = within(canvasElement);
      await userEvent.click(phone.getByRole("button", { name: /Call Maya Chen/ }));
      await expect(args.onCall).toHaveBeenCalledWith("4155550100");
      await userEvent.click(phone.getByRole("button", { name: "Keypad" }));
      await expect(args.onTab).toHaveBeenCalledWith("KeypadTab");
      await userEvent.click(phone.getByRole("button", { name: "Contacts" }));
      await expect(args.onContacts).toHaveBeenCalled();
    },
    AlphaFilter: async ({ canvasElement, args }) => {
      const phone = within(canvasElement);
      await expect(phone.getByText("One missed call from Maya Chen today.")).toBeVisible();
      await userEvent.click(phone.getByRole("button", { name: /Clear filter Maya/ }));
      await expect(args.onClearQuery).toHaveBeenCalled();
    },
    Dialing: async ({ canvasElement, args }) => {
      // The spies in `args` are shared by every story of the file, and Default's play taps a call: count only this story's taps.
      for (const spy of [args.onEndCall, args.onCall]) spy.mockClear();
      const phone = within(canvasElement);
      await expect(phone.getByRole("button", { name: "Call" })).toBeDisabled();
      await userEvent.click(phone.getByRole("button", { name: "End call" }));
      await expect(args.onEndCall).toHaveBeenCalled();
      await expect(args.onCall).not.toHaveBeenCalled();
    },
    AskingAlpha: async ({ canvasElement, args }) => {
      const phone = within(canvasElement);
      await userEvent.click(phone.getByRole("button", { name: "Send to Alpha" }));
      await expect(args.onSubmitRequest).toHaveBeenCalled();
      await expect(args.onAsk).not.toHaveBeenCalled();
    },
  },
};
