// spec/app/startup/index.md, "Story: Come up knowing where Alpha runs"; spec/app/startup/access.md, "Story: Walk through each access in order"; spec/app/startup/recovery.md, "Story: See that something went wrong, and get out of it"
import { Layer } from "effect";
import { type Resident, type Shown, area } from "../runtime/ui.tsx";
import { StartupOverlay } from "./Startup.tsx";

export { StartupJournalView, StartupOverlay } from "./Startup.tsx";
export {
  StartupDesk,
  closeAssistant,
  exitMockMode,
  resolveConnection,
  retryAgentConnection,
  summonAssistant,
  takeAssistantCall,
} from "./boot.vibe";
export {
  InstanceDesk,
  answerHandOff,
  ownerGone,
  ownerToFront,
  startInstance,
} from "./instance.vibe";
export {
  clearJournal,
  harvestExit,
  pruneJournal,
  recordFailure,
} from "./journal.vibe";
export {
  RecoveryDesk,
  markPageDrawn,
  reportPageFailure,
  reportPageLost,
  reportUnbuildable,
  requestReload,
  requestReloadAnyway,
  requestSwitchHome,
} from "./recovery.vibe";
export {
  AccessDesk,
  beginWalkthrough,
  reportFinishTrouble,
  welcomeOwner,
} from "./settingsAccess.vibe";

function Screen({ runtime }: Shown<Resident>) {
  return <StartupOverlay runtime={runtime} />;
}

/** Startup overlay area, mounted at `overlay` in areas.ts. */
export default area(Layer.empty, Screen);
