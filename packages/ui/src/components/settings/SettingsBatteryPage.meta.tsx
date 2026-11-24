import type { ComponentMeta } from "vibestack/stories";
import { fullHeight, reported, unavailable } from "./samples.ts";
import type { SettingsBatteryPageProps } from "./SettingsBatteryPage.tsx";

export const meta: ComponentMeta<SettingsBatteryPageProps> = {
  args: { battery: reported("87%", "ok"), onAndroid: () => undefined },
  decorator: fullHeight,
  examples: { Low: { battery: reported("9%", "warn") }, Unavailable: { battery: unavailable } },
};
