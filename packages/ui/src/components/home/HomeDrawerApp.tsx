import type { ComponentProps } from "react";
import { LayoutGrid } from "lucide-react";
import { AppTile } from "../AppTile.tsx";

export type HomeDrawerAppProps = Omit<ComponentProps<"button">, "children"> & {
  /** The app's name, as Android gives it. */
  label: string;
  /** What tells it apart from another app of the same name, such as its profile: shown after the name. */
  detail?: string;
  /** The icon Android gave for the app, as an image URL. */
  image?: string;
  /** Android is being asked to open this app. */
  opening?: boolean;
  /** Opens the app's menu, from a long press or the context menu key; left out where it may not open. */
  onOpenMenu?: () => void;
};

/** An installed app in the Apps drawer: a press opens it, a long press opens its menu. */
export function HomeDrawerApp({ label, detail, image, opening = false, onOpenMenu, ...props }: HomeDrawerAppProps) {
  return (
    <AppTile
      label={label}
      detail={detail}
      variant="drawer"
      icon={image ? <img alt="" src={image} className="size-full rounded-drawer-icon object-cover" /> : <LayoutGrid className="size-6.5" />}
      aria-busy={opening || undefined}
      aria-keyshortcuts={onOpenMenu ? "Shift+F10" : undefined}
      onContextMenu={onOpenMenu && ((event) => {
        event.preventDefault();
        onOpenMenu();
      })}
      {...props}
    />
  );
}
