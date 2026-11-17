// spec/app/shell/index.md, "Opening an app shows it on top, closes the drawer and lowers Ask Alpha to its bar"
import { AppTile } from "@repo/ui";
import type { View } from "../../gen/app__shell.ts";
import { viewOrder, views } from "./views.tsx";

export interface HomeProps {
  /** The apps this phone admits and the rules allow opening now. */
  offered: (view: View) => boolean;
  onOpen: (view: View) => void;
}

/** Home: the apps this phone admits, each one press away. */
export function Home({ offered, onOpen }: HomeProps) {
  return (
    <nav aria-label="Apps" className="grid grid-cols-4 gap-x-2 gap-y-6 p-4">
      {viewOrder.filter(offered).map((view) => {
        const { label, icon: Icon } = views[view];
        return <AppTile key={view} label={label} icon={<Icon className="size-6" />} onClick={() => onOpen(view)} />;
      })}
    </nav>
  );
}
