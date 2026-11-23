// The staged resident payload's file names, as upstream writes them (@elizaos/agent/bundle build, @elizaos/os/build
// stageRuntimePayload): the bundle entry, its manifest and the payload inventory under assets/agent. Every Alpha
// script that reads the staged payload or an APK's copy of it takes the names from here.
export const AGENT_ENTRY = 'agent.mjs';
export const AGENT_MANIFEST = 'manifest.json';
export const AGENT_INVENTORY = 'inventory.json';
/** The entry's path inside an APK. */
export const APK_AGENT_ENTRY = `assets/agent/${AGENT_ENTRY}`;
/** The entry's path in the staged Android source set. */
export const STAGED_AGENT_ENTRY = `android/app/src/main/assets/agent/${AGENT_ENTRY}`;
