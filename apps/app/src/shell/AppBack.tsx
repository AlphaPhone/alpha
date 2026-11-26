// spec/app/shell/index.md, "Story: Move between Home and the apps"; spec/app/shell/index.md, "On the launcher the first page of Settings and of Workflows draws no Back, and Android's Back still leaves it"
import { Button, cn } from "@repo/ui";
import { ChevronLeft } from "lucide-react";
import { drawsAppBack } from "../../gen/app__shell.ts";
import { useMachine } from "../../gen/app__shell.react.ts";
import { useMachine as useCanvas } from "../../gen/app__shell__keyboard.react.ts";
import type { Alpha } from "../runtime/area.tsx";

/**
 * The shell's Back control placed inside an area's own header; `className` sizes it to that header. Marked as an app's
 * `firstPage`, it is not drawn while Alpha is the launcher; Android's Back still leaves. `label` names it, "Back" unless the
 * app's own header names it otherwise.
 */
export function AppBack({ alpha, className, firstPage = false, label = "Back" }: { alpha: Alpha; className?: string; firstPage?: boolean; label?: string }) {
  const { state } = useMachine(alpha.runtime);
  const launcher = useCanvas(alpha.runtime).state?.launcher ?? false;
  if (!state || !drawsAppBack(state, launcher, firstPage ? "FirstPage" : "InnerPage")) return null;
  return <Button variant="ghost" size="icon" aria-label={label} className={cn("rounded-lg", className)} onClick={() => void alpha.back()}><ChevronLeft /></Button>;
}
