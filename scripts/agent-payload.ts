// The staged resident payload's file names and places, as upstream writes them (@elizaos/agent/bundle build,
// @elizaos/os/build stageRuntimePayload): the bundle entry, its manifest and the payload inventory under assets/agent,
// and the Android Node runtime lib/<abi>/libeliza_node.so. Every Alpha script that reads the staged payload or an
// APK's copy of it takes the names from here.
export const AGENT_ENTRY = 'agent.mjs';
export const AGENT_MANIFEST = 'manifest.json';
export const AGENT_INVENTORY = 'inventory.json';
/** The Android Node runtime upstream stages per ABI (PayloadCheck.NODE); the only native file installed executable. */
export const NODE_RUNTIME_LIBRARY = 'libeliza_node.so';
/** The entry's path inside an APK. */
export const APK_AGENT_ENTRY = `assets/agent/${AGENT_ENTRY}`;
/** The inventory's path inside an APK (PayloadCheck.INVENTORY under assets/). */
export const APK_AGENT_INVENTORY = `assets/agent/${AGENT_INVENTORY}`;
/** The Node runtime's path inside an APK for one ABI. */
export const apkNodeRuntime = (abi: string) => `lib/${abi}/${NODE_RUNTIME_LIBRARY}`;
/**
 * The payload root `pnpm agent:stage-android` writes (git-ignored). stageRuntimePayload lays it out as an Android
 * source set, <root>/android/app/src/main/{assets/agent,jniLibs/<abi>}, and the generated Gradle host packages it as
 * the app's runtime source set (scripts/android-host.ts passes it as `runtime`), which also keeps the Node runtime's
 * bytes unstripped so they still match the inventory.
 */
export const RUNTIME_PAYLOAD = '.eliza/runtime-payload';
/** The source set inside the payload root, as upstream names it. */
export const RUNTIME_MAIN = 'android/app/src/main';
/** The staged assets/agent directory, relative to the repository root. */
export const STAGED_AGENT_ASSETS = `${RUNTIME_PAYLOAD}/${RUNTIME_MAIN}/assets/agent`;
/** The staged Node runtime libraries (jniLibs/<abi>/libeliza_node.so), relative to the repository root. */
export const STAGED_JNI_LIBS = `${RUNTIME_PAYLOAD}/${RUNTIME_MAIN}/jniLibs`;
/** The entry's path in the staged payload. */
export const STAGED_AGENT_ENTRY = `${STAGED_AGENT_ASSETS}/${AGENT_ENTRY}`;
/** The inventory's path in the staged payload; the generated host refuses a runtime without it. */
export const STAGED_AGENT_INVENTORY = `${STAGED_AGENT_ASSETS}/${AGENT_INVENTORY}`;
