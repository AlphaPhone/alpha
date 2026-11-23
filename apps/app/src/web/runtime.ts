// spec/shell/index.md, "Story: Open an app from Home and keep my place"
import { Layer, ManagedRuntime } from "effect";
import { live } from "../platform/layers.vibe";
import { layer as shellLayer } from "../shell/layer.vibe";
import { shellIntegration } from "../shell/integration.vibe";
import { assistantHostLive, deviceExecutorsLive } from "../shell/assistantHost.vibe";
import { slotsLive } from "../shell/compose/slots.vibe";
import { cameraHandoffsLive } from "../shell/compose/camera.vibe";
import { startupLive } from "../shell/compose/startup.vibe";
import { layer as assistantLayer } from "../assistant/layer.vibe";
import { layer as voiceLayer } from "../voice/layer.vibe";
import { layer as calendarLayer } from "../calendar/layer.vibe";
import { layer as notesLayer } from "../notes/layer.vibe";
import { layer as filesLayer } from "../files/layer.vibe";
import { layer as inboxLayer } from "../inbox/layer.vibe";
import { layer as mapsLayer } from "../maps/layer.vibe";
import { layer as browserLayer } from "../browser/layer.vibe";
import { layer as cameraLayer } from "../camera/layer.vibe";
import { layer as telephonyLayer } from "../telephony/layer.vibe";
import { layer as clockLayer } from "../clock/layer.vibe";
import { layer as accountLayer } from "../account/layer.vibe";
import { layer as workflowsLayer, workflowStepDecisions } from "../workflows/layer.vibe";
import { layer as settingsLayer } from "../settings/layer.vibe";

const on = <A, E, R, A2, E2, R2>(upper: Layer.Layer<A, E, R>, lower: Layer.Layer<A2, E2, R2>) => Layer.provideMerge(upper, lower);

const platform = on(Layer.merge(slotsLive, startupLive), live);
const shell = on(shellLayer, platform);
const voice = on(voiceLayer, shell);
const account = on(accountLayer, voice);
const files = on(filesLayer, account);
const settings = on(settingsLayer, files);
const notes = on(notesLayer, settings);
const calendar = on(calendarLayer, notes);
const telephony = on(telephonyLayer, calendar);
const host = on(Layer.mergeAll(assistantHostLive, deviceExecutorsLive([]), workflowStepDecisions), telephony);
const assistant = on(assistantLayer, host);
const workflows = on(workflowsLayer, assistant);
const browser = on(browserLayer, workflows);
const inbox = on(inboxLayer, browser);
const maps = on(mapsLayer, inbox);
const camera = on(cameraLayer, on(cameraHandoffsLive, maps));
const clock = on(clockLayer, camera);

/**
 * The one runtime of the app, built once: the platform with the late ports' slots, the shell, every area in order, the assistant
 * host with Workflows' step decisions, Camera's handoffs from the areas before it, and last the shell's integration, which fills the
 * slots, registers every area's device executors and runs the followers.
 */
export const runtime = ManagedRuntime.make(on(shellIntegration, clock));

/** Every service and Machine the runtime provides. */
export type AppServices = ManagedRuntime.ManagedRuntime.Success<typeof runtime>;
