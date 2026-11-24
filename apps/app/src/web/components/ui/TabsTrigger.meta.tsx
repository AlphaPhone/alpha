import type { ComponentMeta } from "vibestack/stories";
import { Tabs, TabsContent, TabsList, TabsTrigger, type TabsTriggerProps } from "./Tabs.tsx";

export const meta: ComponentMeta<TabsTriggerProps> = {
  args: { value: "all", children: "All" },
  examples: {
    Inactive: { value: "voicemail", children: "Voicemail" },
    Long: { value: "unknown", children: "Unknown and withheld numbers" },
  },
  decorator: (story) => (
    <Tabs defaultValue="all">
      <TabsList aria-label="Call history">
        {story()}
        <TabsTrigger value="missed">Missed</TabsTrigger>
      </TabsList>
      {["all", "missed", "voicemail", "unknown"].map((value) => <TabsContent key={value} value={value} className="py-4 text-sm">No calls here yet.</TabsContent>)}
    </Tabs>
  ),
};
