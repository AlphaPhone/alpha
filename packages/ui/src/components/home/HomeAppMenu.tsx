import { Check, Info, Plus } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { ListRow } from "../ListRow.tsx";
import { Sheet, SheetContent } from "../Sheet.tsx";

export type HomeAppMenuProps = {
  /** The menu is open; the parent keeps which app's. */
  open: boolean;
  /** The app's name, as the menu's title. */
  label: string;
  /** The app is on Home already: the menu says so instead of offering to add it. */
  onHome: boolean;
  /** Adds the app to Home and closes the drawer; left out while a change is being saved, so the row refuses. */
  onAddToHome?: () => void;
  /** Hands the app to Android's App info; left out while Android is being asked something else. */
  onShowAppInfo?: () => void;
  /** Closes the menu: Back, Escape or a press outside. */
  onClose: () => void;
};

/** An installed app's menu in the Apps drawer, opened by a long press: Add to Home or On Home, and App info. */
export function HomeAppMenu({ open, label, onHome, onAddToHome, onShowAppInfo, onClose }: HomeAppMenuProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent title={label}>
        <ListGroup surface="plain">
          {onHome
            ? <ListRow title="On Home" leading={<Check />} />
            : <ListRow title="Add to Home" leading={<Plus />} disabled={!onAddToHome} onClick={() => onAddToHome?.()} />}
          {onShowAppInfo ? <ListRow title="App info" leading={<Info />} onClick={onShowAppInfo} /> : null}
        </ListGroup>
      </SheetContent>
    </Sheet>
  );
}
