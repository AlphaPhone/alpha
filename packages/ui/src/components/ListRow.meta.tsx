import { ChevronRight, Wifi } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { Avatar } from "./Avatar.tsx";
import type { ListRowProps } from "./ListRow.tsx";
import { StatusDot } from "./StatusDot.tsx";

const onClick = fn();

export const meta: ComponentMeta<ListRowProps> = {
  args: { title: "Ana Lima", detail: "Lunch on Friday?", onClick: undefined },
  examples: {
    Avatar: { leading: <Avatar name="Ana Lima" />, trailing: "09:41" },
    Status: { title: "Wi-Fi", detail: "Home", leading: <Wifi aria-hidden />, trailing: <StatusDot status="ok" label="Connected" /> },
    Pressable: { onClick, trailing: <ChevronRight aria-hidden /> },
    "Title only": { detail: undefined },
  },
  play: {
    Pressable: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onClick.mockClear();
      const row = within(canvasElement).getByRole("button", { name: /Ana Lima/ });
      await userEvent.click(row);
      await userEvent.keyboard("{Enter}");
      await expect(onClick.mock.calls.length).toBe(2);
    },
  },
};
