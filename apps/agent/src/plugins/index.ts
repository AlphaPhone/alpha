// spec/agent/index.md, "Story: Run Alpha's agent on the phone"
import type { AgentPlugin, ModuleContext, ModuleFactory } from "@elizaos/agent";
import { Effect } from "effect";
import { clockActions, clockProvider, clockRoutes } from "./clock.ts";
import { remindersAction, remindersProvider, remindersRoutes } from "./reminders.ts";
import { AlphaAppsStore } from "./store.ts";
import type { AgentRuntimeLike, AgentView } from "./types.ts";

/** Product plugin name registered with eliza's resident agent. */
export const alphaAppsPluginName = "alpha-apps";

const views: AgentView[] = [
  {
    id: "clock",
    label: "Clock",
    path: "/clock",
    description: "Alarms, countdown timers, stopwatch, and world clock.",
    navigationAliases: ["alarms", "timers", "stopwatch", "world clock"],
    relatedActions: ["CLOCK_ALARM", "CLOCK_TIMER", "CLOCK_WORLD"],
  },
  {
    id: "reminders",
    label: "Reminders",
    path: "/reminders",
    description: "Reminder lists, smart views, due dates, recurrence, priorities, and subtasks.",
    navigationAliases: ["reminder", "to-do", "todo", "tasks", "checklist"],
    relatedActions: ["REMINDERS_MANAGE", "OWNER_REMINDERS"],
  },
];

/** Build the Alpha product plugin backed by `store` (or a new store in `stateDirectory`). */
export function createAlphaAppsPlugin(options: {
  readonly stateDirectory?: string;
  readonly timeZone?: string;
  readonly runtime?: AgentRuntimeLike;
  readonly store?: AlphaAppsStore;
} = {}): { readonly plugin: AgentPlugin; readonly store: AlphaAppsStore } {
  const store = options.store ?? new AlphaAppsStore({ stateDirectory: options.stateDirectory });
  const timeZone = options.timeZone ?? "UTC";
  const plugin: AgentPlugin = {
    name: alphaAppsPluginName,
    description: "Alpha first-party Clock and Reminders actions, providers, views, and HTTP sync routes.",
    actions: [...clockActions(store, timeZone), remindersAction(store, timeZone)],
    providers: [clockProvider(store, timeZone), remindersProvider(store, timeZone)],
    views,
    routes: [...clockRoutes(store, timeZone), ...remindersRoutes(store, options.runtime, timeZone)],
  };
  return { plugin, store };
}

/** Hosted module factory for `runAgentCli`'s `hostModules`, binding the Alpha product plugin to the agent's state directory and timezone. */
export const alphaAppsModule: ModuleFactory<never> = (context: ModuleContext) => {
  const { plugin } = createAlphaAppsPlugin({
    stateDirectory: context.stateDirectory,
    timeZone: context.timeZone,
    runtime: context.runtime,
  });
  return Effect.succeed({ name: alphaAppsPluginName, plugin });
};

export { AlphaAppsStore } from "./store.ts";
