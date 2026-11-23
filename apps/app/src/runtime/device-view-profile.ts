import { ENABLED_MVP_VIEWS } from '../prototype/mvp-features';
import { isUuidV4 } from '../lib/ids.ts';
import { expectRecord } from '../lib/parse.ts';

const PROFILE_PATH = '/api/client-devices/view-profile';
type Request = (path: string, body: unknown | undefined, signal: AbortSignal) => Promise<unknown>;
const object = (value: unknown) => expectRecord(value, () => Error('Enabled-view profile was not verified.'));
function views(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 32 || value.some(v => typeof v !== 'string' || !/^[a-z][a-z_]{0,31}$/.test(v)) || new Set(value).size !== value.length) throw Error('Enabled-view list was not verified.');
  return [...value].sort();
}
function profile(value: unknown): {version: 1; revision: string; views: string[]} | null {
  if (value === null) return null;
  const p = object(value);
  if (p.version !== 1 || !isUuidV4(p.revision)) throw Error('Enabled-view profile was not verified.');
  return {version: 1, revision: p.revision, views: views(p.views)};
}
/** Enroll once using authenticated installation transport; ambiguous writes are never retried. */
export async function negotiateEnabledViews(version: unknown, request: Request, signal: AbortSignal): Promise<string> {
  // An agent without enabled-view negotiation: phone actions still use local view checks, so no notice.
  if (version === undefined) return '';
  if (version !== 1) throw Error('This agent uses an unsupported enabled-view profile.');
  const discovery = object(await request(PROFILE_PATH, undefined, signal));
  signal.throwIfAborted();
  if (discovery.version !== 1) throw Error('Enabled-view discovery was not verified.');
  const supported = views(discovery.supportedViews);
  const enabled = new Set([...ENABLED_MVP_VIEWS, 'home', 'reminders']);
  const wanted = supported.filter(view => enabled.has(view));
  const prior = profile(discovery.profile);
  if (prior && JSON.stringify(prior.views) === JSON.stringify(wanted)) return '';
  const response = object(await request(PROFILE_PATH, {version: 1, views: wanted, expectedRevision: prior?.revision ?? null}, signal));
  signal.throwIfAborted();
  const confirmed = profile(response.profile);
  if (response.version !== 1 || !confirmed || JSON.stringify(confirmed.views) !== JSON.stringify(wanted) || prior && confirmed.revision === prior.revision) throw Error('Connected. Phone actions aren’t confirmed. Reconnect to check.');
  return '';
}
