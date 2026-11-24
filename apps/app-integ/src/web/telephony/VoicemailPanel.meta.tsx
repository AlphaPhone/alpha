import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { voicemail, voicemailConfirming, voicemailUnsupported } from "./fixtures.ts";
import type { VoicemailPanelProps } from "./VoicemailPanel.tsx";

export const meta: ComponentMeta<VoicemailPanelProps> = {
  args: {
    voicemail, now: voicemail.rows[0]!.date + 600_000, onOpen: fn(), onPlay: fn(), onStopped: fn(), onRetry: fn(), onCallBack: fn(), onMessage: fn(),
    onDeleteAsked: fn(), onDeleteDeclined: fn(), onDeleteConfirmed: fn(),
  },
  examples: {
    Confirming: { voicemail: voicemailConfirming },
    InCall: { voicemail: { ...voicemail, inCall: true } },
    Unsupported: { voicemail: voicemailUnsupported },
    NoRecognizer: { voicemail: { ...voicemail, opened: { ...voicemail.opened, transcript: "TranscriptUnavailable", words: "", engine: "NoEngine" } } },
  },
  play: {
    Default: async ({ canvasElement, args }) => {
      await expect(within(canvasElement).getByText("Call me back when you land.")).toBeVisible();
      await expect(args.onDeleteConfirmed).not.toHaveBeenCalled();
    },
    InCall: async ({ canvasElement, args }) => {
      const play = within(canvasElement).queryByRole("button", { name: /Play/ });
      if (play) await expect(play).toBeDisabled();
      await expect(args.onPlay).not.toHaveBeenCalled();
    },
  },
};
