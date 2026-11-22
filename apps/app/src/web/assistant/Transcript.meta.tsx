import { expect, fn, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { TranscriptProps } from "./Transcript.tsx";
import { conversation, streaming } from "./fixtures.ts";

const handlers = { onQuote: fn(), onEdit: fn(), onApprove: fn(), onDecline: fn(), onOpenCard: fn(), onChoose: fn(), onPlan: fn(), onOpenRun: fn(), onEmail: fn() };

export const meta: ComponentMeta<TranscriptProps> = {
  args: { rows: conversation, typing: false, draftEmpty: true, canFork: true, cloud: "Eliza Cloud", emergency: false, now: Date.UTC(2030, 0, 1, 12, 0), emptyText: "Ask me anything.", ...handlers },
  examples: { Streaming: { rows: streaming, typing: true }, Empty: { rows: [] } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await expect(canvas.getByText("About 25 minutes by car right now.")).toBeTruthy();
      await expect(canvas.getByText(/\[CHOICE:maps-share id=x\]/)).toBeTruthy();
      await expect(canvas.queryAllByRole("button", { name: /maps-share/ })).toHaveLength(0);
    },
  },
};
