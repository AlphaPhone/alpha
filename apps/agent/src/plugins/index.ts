// spec/agent/index.md, "Story: Run Alpha's agent on the phone"
import type { AgentPlugin, ModuleContext, ModuleFactory } from "@elizaos/agent-host";
import { Effect } from "effect";
import { clockActions, clockProvider, clockRoutes } from "./clock.ts";
import { type CloudAccount, importLegacyStoreForRuntime, type LegacyStoreOpener, parseEarlierOwner } from "./legacy-import.ts";
import { remindersAction, remindersProvider, remindersRoutes } from "./reminders.ts";
import { AlphaAppsStore } from "./store.ts";
import type { AgentRuntimeLike } from "./types.ts";

/** Product plugin name registered with eliza's resident agent. */
export const alphaAppsPluginName = "alpha-apps";

/** Build the Alpha product plugin backed by `store` (or a new store in `stateDirectory`). */
export function createAlphaAppsPlugin(options: {
  readonly stateDirectory?: string;
  readonly timeZone?: string;
  readonly runtime?: AgentRuntimeLike;
  readonly store?: AlphaAppsStore;
  readonly earlierImport?: {
    readonly legacyStoreDir?: string;
    readonly owner?: CloudAccount;
    readonly account?: CloudAccount;
    readonly conversationWorldId?: string;
    readonly embeddingDimensions?: number;
    readonly openLegacyStore?: LegacyStoreOpener;
  };
} = {}): { readonly plugin: AgentPlugin; readonly store: AlphaAppsStore } {
  const store = options.store ?? new AlphaAppsStore({ stateDirectory: options.stateDirectory });
  const timeZone = options.timeZone ?? "UTC";
  const plugin: AgentPlugin = {
    name: alphaAppsPluginName,
    description: "Alpha first-party Clock and Reminders actions, providers, and HTTP sync routes.",
    init: async (_config, runtime) => {
      const contexts = (runtime as { contexts?: { tryRegister?: (ctx: unknown) => void } } | undefined)?.contexts;
      contexts?.tryRegister?.({
        id: "clock",
        label: "Clock",
        description: "Alarms, countdown timers, and world clock.",
        descriptionCompressed: "Alarms, timers, and world clock.",
        sensitivity: "personal",
        cacheScope: "agent",
      });
      if (options.earlierImport?.openLegacyStore !== undefined) {
        await importLegacyStoreForRuntime({
          legacyStoreDir: options.earlierImport.legacyStoreDir,
          owner: options.earlierImport.owner,
          account: options.earlierImport.account,
          stateDirectory: options.stateDirectory,
          runtime,
          conversationWorldId: options.earlierImport.conversationWorldId,
          embeddingDimensions: options.earlierImport.embeddingDimensions,
          openLegacyStore: options.earlierImport.openLegacyStore,
        });
      }
    },
    actions: [...clockActions(store, timeZone), remindersAction(store, timeZone)],
    providers: [clockProvider(store, timeZone), remindersProvider(store, timeZone)],
    routes: [...clockRoutes(store, timeZone), ...remindersRoutes(store, options.runtime, timeZone)],
  };
  return { plugin, store };
}

/**
 * Hosted module factory builder for `runAgentCli`'s `hostModules`, binding the Alpha product plugin
 * to the agent's state directory and timezone, and the earlier store the phone passes to the account
 * the launch names, so it is brought in only for its owner.
 * @public
 */
export function alphaAppsModuleWith(options: { readonly openLegacyStore?: LegacyStoreOpener } = {}): ModuleFactory<never> {
  return (context: ModuleContext) => {
    const environment = context.launch.environment;
    const { plugin } = createAlphaAppsPlugin({
      stateDirectory: context.stateDirectory,
      timeZone: context.timeZone,
      runtime: context.runtime,
      earlierImport: {
        legacyStoreDir: environment?.ALPHA_LEGACY_STORE_DIR,
        owner: parseEarlierOwner(environment?.ALPHA_LEGACY_OWNER),
        account: context.launch.account,
        conversationWorldId: context.conversationOwner?.world,
        embeddingDimensions: context.launch.embeddingDimensions,
        openLegacyStore: options.openLegacyStore,
      },
    });
    return Effect.succeed({ name: alphaAppsPluginName, plugin });
  };
}

/**
 * Hosted module factory for `runAgentCli`'s `hostModules`, binding the Alpha product plugin to the agent's state directory and timezone.
 * @public
 */
export const alphaAppsModule: ModuleFactory<never> = alphaAppsModuleWith();

export { AlphaAppsStore } from "./store.ts";
/** @public main.vibe imports it by name in the generated host entry. */
export { makeNativeNotesCleanup } from "./notes-cleanup.vibe";

/** @public Used by the generated host entry with the local inference engine. */
export { notesTranscriptionRoutes } from "./notes-transcription.ts";
