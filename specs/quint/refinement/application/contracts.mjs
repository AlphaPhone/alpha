import assert from 'node:assert/strict';
import {checkTraces as check, qmap} from '../check-traces.mjs';
import {bundledSource, sourceModule, sourceContext, memoryStore, trace, checkpoint, call, captureSources, boundInputs} from './support.mjs';
captureSources(['specs/quint/refinement/application/contracts.mjs']);
const checkTraces = options => check(boundInputs({...options, sources: [...options.sources,
  'specs/quint/refinement/application/contracts.mjs', 'specs/quint/refinement/application/support.mjs']}));

export async function calendarPresentation() {
  const formModule = await bundledSource('apps/app/src/runtime/calendar-form-draft.ts');
  const form = {title: 'Meeting', notes: '', where: '', t: 12, d: 1, video: false, who: [], cal: 'alpha-reminders', repeat: 'none', alert: null, creationId: 'creation-one', off: 0};
  const anchor = new Date(2026, 10, 7), raw = formModule.exports.encodeCalendarForm(form, anchor);
  const restored = formModule.exports.decodeCalendarForm(raw, anchor).form;
  assert.equal(restored.creationId, form.creationId);
  assert.equal(restored.id, null);
  const f = trace('creation-draft-retains-identity', {'s.openEvent': 0});
  checkpoint(f, 'encode source creation draft', [call('newForm'), call('saveDraft')], {'s.durableDraft': !!raw, 's.creationId': restored.creationId === form.creationId ? 1 : 0});
  checkpoint(f, 'decode without selected provider event', call('restoreDraft'), {'s.openEvent': restored.id === null ? 0 : 1, 's.creationId': restored.creationId === form.creationId ? 1 : 0});
  return checkTraces({model: 'CalendarPresentation', sources: formModule.sources, traces: [f], scope: 'bounded-component', assumptions: [
    'Actual creation-draft encoding and decoding preserve their stable identity; no Calendar mutation runs.',
    'Calendar rendering, account-scoped sync-destination preferences, range-generation races, provider results and submitted-time snapshots require their own adapters. The previous display-hiding preference was removed from the product.']});
}

export async function credentialVault() {
  const module = await bundledSource('apps/app/src/passwords/dev-vault.ts');
  const surface = sourceContext(['apps/app/src/passwords/password-manager.ts'], ['passwordSurfaceOpen']);
  const vault = module.exports.createDevelopmentVault(), traces = [];
  const observe = async () => ({'s.locked': (await vault.status()).locked});
  const t = trace('vault-unlock-expiry-and-relock', await observe());
  const active = surface.passwordSurfaceOpen({page: 'password-provider'});
  checkpoint(t, 'actual password surface admission', call('open'), {...await observe(), 's.active': active});
  await vault.unlock(); const entries = await vault.list();
  checkpoint(t, 'development vault metadata unlock', call('unlock'), {...await observe(), 's.entries': entries.entries.length > 0});
  vault.expire(); await assert.rejects(vault.list(), error => error.code === 'locked');
  checkpoint(t, 'source unlock window expires', call('lock'), await observe());
  await vault.unlock(); checkpoint(t, 'explicit fresh unlock', call('unlock'), await observe());
  await vault.lock(); checkpoint(t, 'explicit source lock', call('lock'), await observe()); traces.push(t);
  return checkTraces({model: 'CredentialVault', sources: [...module.sources, 'apps/app/src/passwords/password-manager.ts'], traces, scope: 'bounded-component', assumptions: [
    'The real in-memory development vault implements the metadata/unlock contract. Surface admission runs the actual predicate.',
    'Renderer secret clearing, native vault damage/reset, origin binding and Android authentication remain untested by this adapter.']});
}

export async function permissionWalkthrough() {
  const flow = await sourceModule('apps/app/src/startup-permission-flow.ts');
  const source = 'apps/app/src/startup-permission-progress.ts';
  const policy = await sourceModule(source);
  const store = memoryStore(), current = () => policy.readStartupPermissionProgress(store, true);
  const t = trace('seven-permission-progress-persistence', {'s.savedProgress': current().step});
  checkpoint(t, 'signed-in test fixture', call('signIn'), {'s.savedProgress': current().step});
  for (let index = 0; index < flow.nativeStartupPermissionKeys.length - 1; index++) {
    policy.writeStartupPermissionProgress(store, {version: 4, status: 'pending', step: index + 1}, true);
    checkpoint(t, 'write and read back next permission', [call('platformStatus', index, true), call('advance')], {'s.savedProgress': current().step});
  }
  policy.writeStartupPermissionProgress(store, {version: 4, status: 'completed', step: flow.nativeStartupPermissionKeys.length}, true);
  checkpoint(t, 'completed record after all native platform grants', [call('platformStatus', flow.nativeStartupPermissionKeys.length - 1, true), call('advance'), call('finish')], {'s.savedProgress': current().step, 's.completed': current().status === 'completed'});
  const replay = new Map(store.values); store.values.clear(); for (const [key, value] of replay) store.values.set(key, value);
  checkpoint(t, 'new reader sees durable completion', call('restart'), {'s.savedProgress': current().step, 's.completed': current().status === 'completed'});
  return checkTraces({model: 'PermissionWalkthrough', sources: [source, 'apps/app/src/startup-permission-flow.ts'], traces: [t], scope: 'bounded-component', assumptions: [
    'Checks actual seven-step marker read/write validation and persistence. Platform grants are controlled fixture inputs.',
    'This is a progress-store projection; component allow/advance/finish gating, cancellation and pending prompt races need a React adapter.']});
}
