import { Bluetooth, Wifi } from "lucide-react";
import { expect, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ListGroupProps } from "./ListGroup.tsx";
import { ListRow } from "./ListRow.tsx";
import { StatusDot } from "./StatusDot.tsx";
import { Switch } from "./Switch.tsx";

const children = (
  <>
    <ListRow title="Wi-Fi" detail="Home" leading={<Wifi aria-hidden />} trailing={<StatusDot status="ok" label="Connected" />} onClick={() => undefined} />
    <ListRow asChild title="Bluetooth" leading={<Bluetooth aria-hidden />} trailing={<Switch id="bluetooth" />}>
      <label htmlFor="bluetooth" />
    </ListRow>
  </>
);

export const meta: ComponentMeta<ListGroupProps> = {
  args: { heading: "Network", children },
  examples: { "No heading": { heading: undefined } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      const toggle = canvas.getByRole("switch", { name: "Bluetooth" });
      await userEvent.click(canvas.getByText("Bluetooth"));
      await expect(toggle.getAttribute("aria-checked")).toBe("true");
      await userEvent.click(toggle);
      await expect(toggle.getAttribute("aria-checked")).toBe("false");
    },
  },
};
