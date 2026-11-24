import type { ComponentMeta } from "vibestack/stories";
import type { InstalledAppIconProps } from "./InstalledAppIcon.tsx";

export const appImage = `data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><rect width='48' height='48' rx='12'/><circle cx='24' cy='24' r='12' fill='none' stroke-width='3' stroke='white'/><path d='M24 16v8l5 4' fill='none' stroke-width='3' stroke='white'/></svg>")}`;

export const meta: ComponentMeta<InstalledAppIconProps> = {
  examples: { Image: { image: appImage } },
};
