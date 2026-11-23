import type { ComponentProps } from "react";
import type { ComponentMeta } from "vibestack/stories";
import { type Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs.tsx";

const panels = ["All", "Missed", "Voicemail"];

export const meta: ComponentMeta<ComponentProps<typeof Tabs>> = {
  args: {
    defaultValue: "all",
    children: (
      <>
        <TabsList aria-label="Call history">
          {panels.map((name) => <TabsTrigger key={name} value={name.toLowerCase()}>{name}</TabsTrigger>)}
        </TabsList>
        {panels.map((name) => <TabsContent key={name} value={name.toLowerCase()} className="py-4 text-sm">Nothing in {name} yet.</TabsContent>)}
      </>
    ),
  },
};
