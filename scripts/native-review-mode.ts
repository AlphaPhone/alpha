/** How the private native-screen UI review (scripts/dev-native-preview.ts) runs, and what it says it touches.
 * A developer's real resident agent, with its owner token and any accounts it holds, is attached only on
 * an explicit ALPHA_NATIVE_REVIEW_LOCAL_AGENT=1, never because a token file happens to be in the shell. */
export type NativeReviewMode = {attached: boolean; meta: string; banner: string};

export const NATIVE_REVIEW_LOCAL_AGENT = 'ALPHA_NATIVE_REVIEW_LOCAL_AGENT';

/** Sets the Vite environment for the review in place, before vite.config is imported.
 * `scratchProfile` returns a new empty directory for the synthetic review's browser Cloud profile. */
export function nativeReviewMode(env: Record<string, string | undefined>, scratchProfile: () => string): NativeReviewMode {
  const requested = env[NATIVE_REVIEW_LOCAL_AGENT];
  if (requested !== undefined && requested !== '' && requested !== '1') throw Error(`${NATIVE_REVIEW_LOCAL_AGENT} must be 1 or unset.`);
  if (requested === '1') {
    if (!env.ALPHA_LOCAL_AGENT_TOKEN_FILE) throw Error(`${NATIVE_REVIEW_LOCAL_AGENT}=1 needs ALPHA_LOCAL_AGENT_TOKEN_FILE for the resident agent.`);
    env.VITE_LOCAL_AGENT = '1';
    env.ALPHA_DEV_CONNECTION_TOOLS = '0';
    return {
      attached: true,
      meta: 'Synthetic device providers; no SIM or hardware access. Chat uses the real local agent and any accounts it holds',
      banner: 'Native-screen UI review: simulated device providers; chat uses the real local agent and any accounts it holds; not device acceptance.',
    };
  }
  // An inherited VITE_LOCAL_AGENT=1 would otherwise mount the owner-token bridge under a synthetic label,
  // and the default browser Cloud profile is the developer's own signed-in preview profile.
  env.VITE_LOCAL_AGENT = '';
  env.ALPHA_BROWSER_CLOUD_PROFILE = scratchProfile();
  return {
    attached: false,
    meta: 'Synthetic device providers; no SIM, personal account or hardware access',
    banner: 'Native-screen UI review: simulated providers only; not device acceptance.',
  };
}
