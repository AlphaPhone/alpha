import tokens from "@repo/design-system/tokens.json" with { type: "json" };
import { ChevronLeft, Ellipsis, Plus } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { AppHeader } from "./AppHeader.tsx";
import { Button } from "./Button.tsx";

export default { title: "Ui/AppHeader", component: AppHeader };

/**
 * Android's large text multiplies every type size and leaves lengths alone. A browser has no such zoom, so the frame
 * multiplies the type tokens instead and leaves the measured scale at 1: on the phone the clamp divides by the scale
 * the zoom then multiplies back. Alpha's own text size stays at 100%.
 */
const androidText = (percent: number): CSSProperties => Object.fromEntries(
  Object.entries(tokens.text).map(([name, { size }]) => [`--text-${name}`, `calc(${size} * ${percent / 100})`]),
);

/** A phone 412 points wide, at `percent` Android text, on the launcher or not; above 150% the shell marks the title's own row. */
const phone = (percent: number, launcher = true) => (Story: () => ReactNode) => (
  <div data-alpha-title-row={percent > 150 ? "" : undefined} style={androidText(percent)}>
    <div data-alpha-launcher={launcher ? "" : undefined} className="w-103 bg-background text-foreground">
      <Story />
    </div>
  </div>
);
const launcher = (percent: number) => phone(percent);

const back = <Button variant="ghost" size="icon" aria-label="Back"><ChevronLeft /></Button>;
const actions = (
  <>
    <Button variant="ghost" size="icon" aria-label="Add to Workflows"><Plus /></Button>
    <Button variant="ghost" size="icon" aria-label="Workflows options"><Ellipsis /></Button>
  </>
);
const main = { title: "Workflows", leading: back, children: actions };
const detail = { title: "Holiday photos from Lisbon, June", leading: back, detail: true, children: actions };

/** An app's first page on the launcher: the 32px serif title beside Back and the actions. */
export const LauncherMain = { args: main, decorators: [launcher(100)] };

/** A screen inside an app on the launcher, such as a folder or an album: 26px, one line, cut with an ellipsis. */
export const LauncherDetail = { args: detail, decorators: [launcher(100)] };

/** At 300% text the first page's title takes its own row, no larger than lets the word fit it whole. */
export const LauncherMainLargeText = { args: main, decorators: [launcher(300)] };

/** At 300% text a screen's title takes its own row and wraps there. */
export const LauncherDetailLargeText = { args: detail, decorators: [launcher(300)] };

/** Off the launcher, with Alpha not the Home app or opened as the assistant, at 300% text the title also takes its own row and wraps. */
export const AppMainLargeText = { args: { ...main, title: "Password manager" }, decorators: [phone(300, false)] };
