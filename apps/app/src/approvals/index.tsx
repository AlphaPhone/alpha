// spec/app/approvals/index.md, "Story: One action at a time"; spec/app/shell/layers.md, "Story: Keep a sheet or a dialog above the phone"
import { Layer } from "effect";
import { area } from "../runtime/area.tsx";
import { ApprovalsOverlay } from "./Approvals.tsx";

export { ApprovalCard, ApprovalsOverlay } from "./Approvals.tsx";
export {
  ApprovalDesk,
  approvalLayer,
  approvals,
  bindConversation,
  fetchPendingApprovals,
  hearMessage,
  presentProposal,
  recoverPending,
  resetApprovalJournal,
  setApprovalContext,
  submitDirect,
  submitProposal,
  type ApprovalContext,
  type ApprovalHooks,
  type DeskSnapshot,
} from "./approvals.vibe";
export { classifyOperation, describeProposal, preferenceFromSetting, stageSummary, type ProposalCardSummary, type ProposalDetail } from "./operation.ts";

/** Approvals overlay area, mounted at `overlay` in areas.ts. */
export default area(Layer.empty, ApprovalsOverlay);
