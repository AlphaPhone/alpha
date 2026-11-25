// spec/app/reminders/index.md, "Story: Organize reminders across smart views and custom lists"
import { cn } from "@repo/ui";
import { Bookmark, Briefcase, Heart, Home, ListTodo, ShoppingCart, Star, Zap } from "lucide-react";
import type { ReminderListColor, ReminderListIcon, ReminderPriority } from "./store.ts";

/** All selectable semantic colors for custom reminder lists. */
export const LIST_COLORS: readonly ReminderListColor[] = ["accent", "blue", "green", "amber", "rose", "violet"];

/** All selectable icons for custom reminder lists. */
export const LIST_ICONS: readonly ReminderListIcon[] = ["list", "home", "work", "shopping", "heart", "star", "bookmark", "bolt"];

const COLOR_BADGE: Readonly<Record<ReminderListColor, string>> = {
  accent: "bg-accent text-accent-foreground",
  blue: "bg-info text-primary-foreground",
  green: "bg-ok text-primary-foreground",
  amber: "bg-warn text-primary-foreground",
  rose: "bg-destructive text-destructive-foreground",
  violet: "bg-alpha text-alpha-foreground",
};

const COLOR_LABEL: Readonly<Record<ReminderListColor, string>> = {
  accent: "Accent",
  blue: "Blue",
  green: "Green",
  amber: "Amber",
  rose: "Rose",
  violet: "Violet",
};

const ICON_LABEL: Readonly<Record<ReminderListIcon, string>> = {
  list: "List",
  home: "Home",
  work: "Work",
  shopping: "Shopping",
  heart: "Personal",
  star: "Star",
  bookmark: "Bookmark",
  bolt: "Quick",
};

/** Return the semantic background and foreground token classes for a list color. */
export function listColorBadgeClass(color: ReminderListColor): string {
  return COLOR_BADGE[color];
}

/** Human-readable label for a list color swatch. */
export function listColorLabel(color: ReminderListColor): string {
  return COLOR_LABEL[color];
}

/** Human-readable label for a list icon button. */
export function listIconLabel(icon: ReminderListIcon): string {
  return ICON_LABEL[icon];
}

/** Render the vector icon for a reminder list. */
export function ListIcon({ icon, className }: { readonly icon: ReminderListIcon; readonly className?: string }) {
  const cls = cn("size-4 shrink-0", className);
  switch (icon) {
    case "home":
      return <Home aria-hidden className={cls} />;
    case "work":
      return <Briefcase aria-hidden className={cls} />;
    case "shopping":
      return <ShoppingCart aria-hidden className={cls} />;
    case "heart":
      return <Heart aria-hidden className={cls} />;
    case "star":
      return <Star aria-hidden className={cls} />;
    case "bookmark":
      return <Bookmark aria-hidden className={cls} />;
    case "bolt":
      return <Zap aria-hidden className={cls} />;
    case "list":
      return <ListTodo aria-hidden className={cls} />;
  }
}

/** Render the compact priority indicator (`!`, `!!`, `!!!`) beside a reminder title. */
export function PriorityMark({ priority }: { readonly priority: ReminderPriority }) {
  if (priority === "none") return null;
  if (priority === "low") return <span aria-label="Low priority" className="font-semibold text-info">!</span>;
  if (priority === "medium") return <span aria-label="Medium priority" className="font-semibold text-warn">!!</span>;
  return <span aria-label="High priority" className="font-semibold text-destructive">!!!</span>;
}
