import { expect, fn, screen, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { StatusDot } from "../StatusDot.tsx";
import type { StartupAllSetProps } from "./StartupAllSet.tsx";

const onDone = fn();

export const meta: ComponentMeta<StartupAllSetProps> = {
  args: { onDone, children: undefined },
  examples: {
    "Connection failed": { trouble: "ConnectionFailed" },
    "Sign-in needs attention": { trouble: "SignInNeedsAttention" },
    "Not saved": { notSaved: true },
    "With the account's state": { children: <StatusDot status="ok" label="AI ready" showLabel /> },
  },
  play: {
    Default: async () => {
      onDone.mockClear();
      const sheet = await screen.findByRole("dialog", { name: "All set" });
      await userEvent.click(within(sheet).getByRole("button", { name: "Done" }));
      await expect(onDone.mock.calls.length).toBe(1);
    },
    "Connection failed": async () => expect(await screen.findByRole("alert")).toHaveTextContent("Connection failed"),
  },
};
