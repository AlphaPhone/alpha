// spec/app/approvals/index.md, "Story: One action at a time"; spec/app/shell/layers.md, "Story: Keep a sheet or a dialog above the phone"
import { Layer } from "effect";
import { area } from "../runtime/ui.tsx";
import { ApprovalsOverlay } from "./Approvals.tsx";

/** Approvals overlay area, mounted at `overlay` in areas.ts. */
export default area(Layer.empty, ApprovalsOverlay);
