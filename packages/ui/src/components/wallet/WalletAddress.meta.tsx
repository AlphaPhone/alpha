import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { WalletAddressProps } from "./WalletAddress.tsx";

const onCopy = fn();

export const meta: ComponentMeta<WalletAddressProps> = {
  args: { address: "0x52908400098527886E0F7030069857D2E4169EE7", name: "Ethereum", onCopy },
  examples: { Copied: { copied: true }, Read: { onCopy: undefined } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onCopy.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Copy Ethereum address" }));
      await expect(onCopy.mock.calls.length).toBe(1);
    },
  },
};
