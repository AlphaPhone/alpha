import { ListRow, type ListRowProps } from "@repo/ui";
import { ChevronRight } from "lucide-react";

type AddOptionProps = Pick<ListRowProps, "title" | "leading" | "onClick" | "aria-label" | "aria-haspopup">;

/** A choice in the Add to Workflows menu. */
export function AddOption(props: AddOptionProps) {
  return <ListRow {...props} className="min-h-16 gap-3.5 rounded-xl bg-secondary px-3.5 font-semibold"
    trailing={<ChevronRight aria-hidden />} />;
}
