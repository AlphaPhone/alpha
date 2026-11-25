// spec/app/shell/index.md, "Story: Move between Home and the apps"
import { Button, cn } from "@repo/ui";
import { ChevronLeft } from "lucide-react";
import { useMachine } from "../../gen/app__shell.react.ts";
import type { Alpha } from "../runtime/area.tsx";

/** The shell's Back control placed inside an area's own header; `className` sizes it to that header. */
export function AppBack({ alpha, className }: { alpha: Alpha; className?: string }) {
  const { can } = useMachine(alpha.runtime);
  if (!can({ type: "goBack" })) return null;
  return <Button variant="ghost" size="icon" aria-label="Back" className={cn("rounded-lg", className)} onClick={() => void alpha.back()}><ChevronLeft /></Button>;
}
