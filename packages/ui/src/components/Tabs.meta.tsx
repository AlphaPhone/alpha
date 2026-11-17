import { expect, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { EmptyState } from "./EmptyState.tsx";
import { TabsContent, TabsList, type TabsProps, TabsTrigger } from "./Tabs.tsx";

const children = (
  <>
    <TabsList aria-label="Calls">
      <TabsTrigger value="all">All</TabsTrigger>
      <TabsTrigger value="missed">Missed</TabsTrigger>
      <TabsTrigger value="voicemail" disabled>Voicemail</TabsTrigger>
    </TabsList>
    <TabsContent value="all"><EmptyState title="No calls" /></TabsContent>
    <TabsContent value="missed"><EmptyState title="No missed calls" /></TabsContent>
    <TabsContent value="voicemail"><EmptyState title="No voicemail" /></TabsContent>
  </>
);

export const meta: ComponentMeta<TabsProps> = {
  args: { defaultValue: "all", children },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("tab", { name: "Missed" }));
      await expect(canvas.getByRole("tabpanel", { name: "Missed" }).textContent).toBe("No missed calls");
      await userEvent.keyboard("{ArrowLeft}");
      await expect(canvas.getByRole("tab", { name: "All" }).getAttribute("aria-selected")).toBe("true");
    },
  },
};
