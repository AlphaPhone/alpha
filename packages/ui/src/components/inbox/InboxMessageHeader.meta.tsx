import type { ComponentMeta } from "vibestack/stories";
import type { InboxMessageHeaderProps } from "./InboxMessageHeader.tsx";

export const meta: ComponentMeta<InboxMessageHeaderProps> = {
  args: { sender: "Ana Lima", address: "ana.lima@example.com", to: "me", cc: undefined, replyTo: undefined, date: "Fri 14 Nov, 09:41" },
  examples: {
    "Copied and reply-to": { cc: "Bruno Costa, Carla Dias", replyTo: "events@example.com" },
    "Long recipients": { to: "Bruno Costa, Carla Dias, Daniel Esteves, Elena Faria, Fabio Gomes, Gina Horta, and eleven others", cc: "list-owner@a-very-long-domain-name.example.com" },
  },
};
