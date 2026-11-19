/**
 * What the Own API keys form says when the phone does not save a provider key. Alpha's local
 * agent bridge (`AlphaLocalAgentPlugin.configureProvider`) checks and saves the key through the
 * shared provider slot (`NativeProviderSlot` in plugin-native-agent), and rejects with the slot's
 * own English when the check or save fails. Alpha keys a table on each reviewed slot sentence
 * and shows its own; the bridge's own refusals are already Alpha's and pass as written. Any other
 * native rejection on this path reads as Alpha's fallback, never as the native text.
 */
import { failureText, isNativeRejection } from "../utils/native-refusal";

/** Keyed by every fixed sentence `NativeProviderSlot.java` refuses a key check or save with. */
export const PROVIDER_KEY_REFUSALS: ReadonlyMap<string, string> = new Map([
  ["Cerebras did not accept this key. It was not saved.", "Cerebras didn’t accept this key. Nothing was saved."],
  [
    "Cerebras is rate-limiting key checks. Try again shortly; the key was not saved.",
    "Cerebras is limiting key checks right now. Nothing was saved; try again in a moment.",
  ],
  [
    "Cerebras could not confirm this key right now. It was not saved.",
    "Cerebras couldn’t confirm this key right now. Nothing was saved.",
  ],
  [
    "Cerebras returned an unexpected response. The key was not saved.",
    "Cerebras sent a reply Alpha couldn’t read. Nothing was saved.",
  ],
  [
    "Cerebras could not be reached to check this key. It was not saved.",
    "Couldn’t reach Cerebras to check this key. Nothing was saved.",
  ],
  ["Enter a valid Cerebras key.", "Enter a valid Cerebras key."],
  ["Choose the supported Cerebras model.", "Choose the Cerebras model Alpha supports."],
  ["Enter a valid Cartesia key or leave voice off.", "Enter a valid Voice key, or leave voice off."],
]);

/** The slot's refusal for a key whose models listing lacks the pinned model, with the model kept. */
const MODEL_NOT_OFFERED = /^This Cerebras key does not offer (\S{1,128})\. It was not saved\.$/;

/** Alpha's own bridge refusals on this path (`AlphaLocalAgentPlugin.java`), shown as written. */
export const ALPHA_PROVIDER_BRIDGE_REFUSALS: ReadonlySet<string> = new Set([
  "Open unlocked Settings to manage provider keys.",
  "On-device agent is unavailable in this version.",
  "Enter a valid Voice key or leave it unchanged.",
  "Alpha Phone uses qwen-3.8-27b on Cerebras.",
  "Provider request was cancelled or is unavailable.",
  "Provider could not be saved securely.",
  "Local agent bridge is closed.",
  "Provider setup is busy. Try again shortly.",
]);

export const PROVIDER_KEY_FALLBACK = "Couldn’t check or save this key. Nothing was saved.";

/**
 * Alpha's sentence for a failed key save, or `undefined` when `error` is already Alpha's (a
 * bridge refusal, or a plain error Alpha's own code or browser host raised) and stays as it is.
 */
export function providerKeyRefusalText(error: unknown): string | undefined {
  const text = failureText(error);
  const known = PROVIDER_KEY_REFUSALS.get(text);
  if (known) return known;
  const model = MODEL_NOT_OFFERED.exec(text)?.[1];
  if (model) return `This Cerebras key can’t use ${model}. Nothing was saved.`;
  if (!isNativeRejection(error) || ALPHA_PROVIDER_BRIDGE_REFUSALS.has(text)) return undefined;
  return PROVIDER_KEY_FALLBACK;
}
