import { Wifi } from "lucide-react";
import type { ComponentMeta } from "vibestack/stories";
import type { SettingRowProps } from "./Rows.tsx";
import { ACCESS, ROLE, SWITCH } from "./words.ts";

const none = () => undefined;

export const meta: ComponentMeta<SettingRowProps> = {
  args: { label: "Camera", state: ACCESS.Allowed, onOpen: none, onHandoff: undefined },
  examples: {
    Handoff: { label: "Wi-Fi", state: SWITCH.On, onOpen: undefined, onHandoff: none, ariaLabel: "Wi-Fi, On, opens Android settings" },
    Fact: { label: "Home app", state: ROLE.HeldElsewhere, onOpen: undefined },
    Unread: { label: "Microphone", state: ACCESS.Unread },
    Warning: { label: "Location", state: ACCESS.Partial },
    WithIcon: { label: "Wi-Fi", state: SWITCH.On, icon: <Wifi aria-hidden className="size-5" /> },
    Destructive: { label: "Erase all content", state: undefined, destructive: true },
    LongLabel: { label: "Let Alpha read notifications from apps you choose while the phone is locked", state: ACCESS.Asks },
  },
};
