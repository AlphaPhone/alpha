// spec/account/sheet.md, "The plan notice shows on Home only, until dismissed, and never under a covering screen"
import { CreditCard, X } from "lucide-react";
import { type Sheet, canDismissPlan, planNoticeShown } from "../../../gen/account__sheet.ts";
import { Alert, Button } from "../components/ui/index.ts";

/** The sheet state that decides the Home plan notice, and its two actions. */
export interface PlanNoticeProps {
  sheet: Sheet;
  onOpen: () => void;
  onDismiss: () => void;
}

/**
 * The Home notice for a plan that needs attention.
 * @model spec/account/sheet.md
 */
export function PlanNotice({ sheet, onOpen, onDismiss }: PlanNoticeProps) {
  if (!planNoticeShown(sheet)) return null;
  return (
    <Alert variant="warn" className="flex items-center justify-between gap-2">
      <Button variant="ghost" onClick={onOpen}><CreditCard aria-hidden />Plan needed</Button>
      <Button variant="ghost" size="icon" aria-label="Dismiss" disabled={!canDismissPlan(sheet)} onClick={onDismiss}><X aria-hidden /></Button>
    </Alert>
  );
}
