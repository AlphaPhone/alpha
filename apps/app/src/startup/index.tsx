// spec/app/startup/index.md, "Story: Come up knowing where Alpha runs"; spec/app/startup/access.md, "Story: Walk through each access in order"; spec/app/startup/recovery.md, "Story: See that something went wrong, and get out of it"
import { Layer } from "effect";
import { type Resident, type Shown, area } from "../runtime/ui.tsx";
import { StartupOverlay } from "./Startup.tsx";

export { AccessReview } from "./SettingsAccess.tsx";
export { AllSetPanel, MockModeBanner, StartupJournalView, StartupOverlay, type StartupRuntime } from "./Startup.tsx";
export {
  StartupDesk,
  closeAssistant,
  exitMockMode,
  resolveConnection,
  retryAgentConnection,
  startupCore,
  startupResident,
  summonAssistant,
  takeAssistantCall,
  type RaisedCall,
  type StartupDeskService,
  type StartupFacts,
  type StartupHooks,
  type StartupHostSnapshot,
} from "./boot.vibe";
export {
  InstanceDesk,
  answerHandOff,
  ownerGone,
  ownerToFront,
  startInstance,
  startupInstance,
  type InstanceDeskService,
  type InstanceHooks,
} from "./instance.vibe";
export {
  clearJournal,
  harvestExit,
  harvestSystemProblems,
  pruneJournal,
  recordFailure,
  startupJournal,
} from "./journal.vibe";
export {
  RecoveryDesk,
  closeAssistantSurface,
  markPageDrawn,
  reloadBeforeMount,
  reportPageFailure,
  reportPageLost,
  reportUnbuildable,
  requestReload,
  requestReloadAnyway,
  requestSwitchHome,
  setSurfaceVisibility,
  startupRecovery,
  type RecoveryDeskService,
  type RecoveryHooks,
} from "./recovery.vibe";
export {
  AccessDesk,
  beginWalkthrough,
  carryOverWalkthrough,
  markSignInSettled,
  openReview,
  reportFinishTrouble,
  reviewBack,
  reviewKeys,
  setWalkthroughCovered,
  signOutOwner,
  startupReview,
  welcomeOwner,
  type AccessCheckResult,
  type AccessDeskService,
  type AccessHooks,
} from "./settingsAccess.vibe";

function Screen({ runtime }: Shown<Resident>) {
  return <StartupOverlay runtime={runtime} />;
}

/** Startup overlay area, mounted at `overlay` in areas.ts. */
export default area(Layer.empty, Screen);
