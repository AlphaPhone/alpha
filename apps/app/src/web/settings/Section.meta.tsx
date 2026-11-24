import type { ComponentMeta } from "vibestack/stories";
import { type SectionProps, SettingRow, ToggleRow } from "./Rows.tsx";
import { ACCESS, SWITCH } from "./words.ts";

const none = () => undefined;

export const meta: ComponentMeta<SectionProps> = {
  args: {
    caption: "Connections",
    children: (
      <>
        <SettingRow label="Wi-Fi" state={SWITCH.On} onHandoff={none} />
        <SettingRow label="Bluetooth" state={SWITCH.Off} onHandoff={none} />
        <SettingRow label="Camera" state={ACCESS.Allowed} onOpen={none} />
      </>
    ),
  },
  examples: {
    NoCaption: { caption: undefined },
    LongContent: {
      caption: "Apps that may send notifications",
      children: <>{Array.from({ length: 30 }, (_, at) => <ToggleRow key={at} label={`App ${at + 1}`} on={at % 3 !== 0} onChange={none} />)}</>,
    },
  },
};
