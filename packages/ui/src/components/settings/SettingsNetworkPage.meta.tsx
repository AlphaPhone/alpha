import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { fullHeight } from "./samples.ts";
import type { SettingsNetworkPageProps } from "./SettingsNetworkPage.tsx";

const onJoin = fn();
const onRescan = fn();

export const meta: ComponentMeta<SettingsNetworkPageProps> = {
  args: {
    online: "online",
    scan: "found",
    networks: [{ name: "Home", security: "wpa2" }, { name: "Cafe", security: "open" }],
    fits: (network, passphrase) => (network.security === "open" ? passphrase.length === 0 : passphrase.length >= 8),
    onJoin,
    onRescan,
    onBack: fn(),
    onAndroid: fn(),
  },
  decorator: fullHeight,
  examples: {
    Reading: { reading: true, online: "unknown" },
    Scanning: { scanning: true, networks: [], onRescan: undefined },
    "Needs location": { scan: "needs-location", networks: [] },
    Joining: { joining: true },
    "Wrong password": { joined: "wrong-password" },
    "Behind a sign-in page": { online: "sign-in", joined: "sign-in" },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onJoin.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: /Home/ }));
      await expect(canvas.getByRole("button", { name: "Join Home" }).hasAttribute("disabled")).toBe(true);
      await userEvent.type(canvas.getByLabelText("Password for Home"), "correct horse");
      await userEvent.click(canvas.getByRole("button", { name: "Join Home" }));
      await expect(onJoin.mock.calls).toEqual([[{ name: "Home", security: "wpa2" }, "correct horse"]]);
    },
  },
};
