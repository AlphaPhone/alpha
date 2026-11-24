import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { Input } from "../Input.tsx";
import { Label } from "../Label.tsx";
import type { AuthStepFrameProps } from "./AuthStepFrame.tsx";

const onPrimary = fn();
const onSecondary = fn();
const onBack = fn();

export const meta: ComponentMeta<AuthStepFrameProps> = {
  args: {
    platform: "Telegram",
    title: "Sign in to Telegram",
    subtitle: "Enter your phone number to receive a verification code.",
    children: (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tg-phone">Phone number</Label>
        <Input id="tg-phone" type="tel" defaultValue="+1 555 010 4242" />
      </div>
    ),
    primaryAction: { label: "Continue", onClick: onPrimary },
    secondaryAction: { label: "Sign in with QR", onClick: onSecondary },
  },
  examples: {
    "Telegram flood wait": {
      platform: "Telegram",
      title: "Enter code",
      subtitle: "Sent to your Telegram app",
      waitNotice: "Too many attempts. Try again in 45 seconds.",
      onBack,
      primaryAction: { label: "Verify", disabled: true, onClick: onPrimary },
      secondaryAction: { label: "Resend code", disabled: true, onClick: onSecondary },
    },
    "Telegram error": {
      platform: "Telegram",
      title: "Two-factor password",
      error: "Incorrect password. Try again.",
      onBack,
      children: (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tg-2fa">Cloud password</Label>
          <Input id="tg-2fa" type="password" invalid />
        </div>
      ),
      primaryAction: { label: "Unlock", onClick: onPrimary },
      secondaryAction: undefined,
    },
    "Slack OAuth scope consent": {
      platform: "Slack",
      title: "Connect Slack workspace",
      subtitle: "Alpha acts as your account only when you tap Send or Approve.",
      scopes: [
        { scope: "channels:read", description: "List public channels in your workspace" },
        { scope: "channels:history", description: "Read messages in channels you join" },
        { scope: "chat:write", description: "Send messages when you tap Send" },
      ],
      children: undefined,
      primaryAction: { label: "Continue to Slack", onClick: onPrimary },
      secondaryAction: undefined,
    },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onPrimary.mockClear();
      onSecondary.mockClear();
      const canvas = within(canvasElement);
      await expect(canvas.getByText("User account · no bot token")).toBeTruthy();
      await userEvent.click(canvas.getByRole("button", { name: "Continue" }));
      await userEvent.click(canvas.getByRole("button", { name: "Sign in with QR" }));
      await expect([onPrimary.mock.calls.length, onSecondary.mock.calls.length]).toEqual([1, 1]);
    },
  },
};
