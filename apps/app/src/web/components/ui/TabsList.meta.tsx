import type { ComponentMeta } from "vibestack/stories";
import { Tabs, TabsContent, type TabsListProps, TabsTrigger } from "./Tabs.tsx";

const panels = ["All", "Missed", "Voicemail", "Contacts", "Favourites", "Blocked"];

export const meta: ComponentMeta<TabsListProps> = {
  args: {
    "aria-label": "Call history",
    children: (
      <>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="missed">Missed</TabsTrigger>
        <TabsTrigger value="voicemail">Voicemail</TabsTrigger>
      </>
    ),
  },
  examples: {
    "With disabled": {
      children: (
        <>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="missed">Missed</TabsTrigger>
          <TabsTrigger value="voicemail" disabled>Voicemail</TabsTrigger>
        </>
      ),
    },
    Many: {
      className: "overflow-x-auto",
      children: panels.map((name) => <TabsTrigger key={name} value={name.toLowerCase()}>{name}</TabsTrigger>),
    },
  },
  decorator: (story) => (
    <Tabs defaultValue="all">
      {story()}
      {panels.map((name) => <TabsContent key={name} value={name.toLowerCase()} className="py-4 text-sm">Nothing in {name} yet.</TabsContent>)}
    </Tabs>
  ),
};
