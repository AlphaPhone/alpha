// The Maps screen as the launcher mounts it (installPrototypeMapsAdapter over the real
// MapsScreenController and MapsController, native plugins as controlled ports): the place
// sheet's phone row, a long press dropping a pin, the route's step list, guidance copy without
// a screen-off session, and the arrival notice when guidance ends with Maps off screen.
import test from 'node:test';
import assert from 'node:assert/strict';
import {bundleMapsAdapter, mountMapsAdapter, tick, providerId, connectionId, providerConfig, attribution} from '../specs/quint/refinement/application/maps-adapter-harness.mjs';

const code = await bundleMapsAdapter();
const image = [{name: 'AlphaTelephony', methods: [{name: 'imageCapability'}]}];
const from = {latitude: 1, longitude: 1};

async function mount(options = {}) {
  const now = Date.now(), routes = [];
  const cafe = {providerId, id: 'cafe-1', name: 'Cafe', coordinate: {latitude: 1.01, longitude: 1.01}, phone: '+1 555 123 4567', attribution, fetchedAt: now};
  const provider = {
    providerId, connectionId,
    async search() { return [cafe]; },
    async detail() { return cafe; },
    route(origin, target, mode) {
      const route = {providerId, id: `route_fixture_${routes.length + 1}_0123456789`, from: origin, to: target, mode, geometry: [origin, target],
        distanceMeters: 1500, durationSeconds: 600, attribution, fetchedAt: now, traffic: 'none',
        steps: [{instruction: 'Head north on Main St', coordinate: origin, distanceMeters: 1500, maneuver: 'depart'},
          {instruction: 'Arrive at Cafe', coordinate: target, distanceMeters: 0, maneuver: 'arrive'}]};
      routes.push(route);
      return Promise.resolve(route);
    },
  };
  const m = await mountMapsAdapter(code, {...options, configure: app => app.configureMapsProvider(providerConfig, provider)});
  const toasts = [], opened = [];
  m.api.toast = text => toasts.push(text);
  m.api.open = (...args) => opened.push(args);
  m.render(); await tick();
  return {m, cafe, routes, toasts, opened};
}
async function settle() { for (let i = 0; i < 4; i++) await tick(); }
async function openCafe(m) {
  m.render().onQ({target: {value: 'cafe'}});
  m.harness.flushInputTimers(); await settle();
  m.render().results[0].go(); await settle();
  return m.render();
}
async function routeToCafe(m) {
  m.harness.locationGranted = false;
  (await openCafe(m)).pc.dirs(); await settle();
  m.render().onOrigin({target: {value: '1, 1'}});
  m.harness.flushInputTimers(); await settle();
  return m.render();
}

test('a place with a phone number shows it with Copy; Call appears only where Phone exists', async () => {
  const {m, toasts, opened} = await mount();
  try {
    const {pc} = await openCafe(m);
    assert.equal(pc.hasPhone, true);
    assert.equal(pc.phone, '+1 555 123 4567');
    assert.equal(pc.call, undefined, 'no Phone app outside the Alpha image');
    pc.copyPhone(); await settle();
    assert.deepEqual(m.harness.copied, ['+1 555 123 4567']);
    assert.deepEqual(toasts, ['Number copied']);
    assert.equal(opened.length, 0);
  } finally { m.restore(); }
});

test('Call opens Phone with the number filled in, and dials nothing itself', async () => {
  const {m, opened} = await mount({pluginHeaders: image});
  try {
    const {pc} = await openCafe(m);
    pc.call();
    assert.deepEqual(opened, [['phone', {prefill: '+15551234567'}]]);
  } finally { m.restore(); }
});

test('a long press on the map drops a pin at the pressed point', async () => {
  const saved = globalThis.MutationObserver;
  globalThis.MutationObserver = class { observe() {} disconnect() {} };
  const {m} = await mount();
  try {
    m.render().mapRef({dataset: {}, isConnected: true, replaceChildren() {}});
    const onLongPress = m.harness.plane?.[8];
    assert.equal(typeof onLongPress, 'function', 'the adapter hands the plane a long-press callback');
    onLongPress({latitude: 2, longitude: 3}); await settle();
    const data = m.render();
    assert.equal(data.mode, 'place');
    assert.equal(data.pc.name, 'Dropped pin');
    assert.deepEqual(m.harness.screen.selected.coordinate, {latitude: 2, longitude: 3});
  } finally { m.restore(); globalThis.MutationObserver = saved; }
});

test('directions list the selected route step by step', async () => {
  const {m, routes} = await mount();
  try {
    const data = await routeToCafe(m);
    assert.equal(routes.length, 1);
    assert.equal(data.dr.hasSteps, true);
    assert.deepEqual(data.dr.steps.map(step => step.text), ['Head north on Main St', 'Arrive at Cafe']);
    assert.notEqual(data.dr.steps[0].distance, '');
    assert.equal(data.dr.steps[1].distance, '', 'no distance on the arrival step');
    // A long press while directions are open keeps the route.
    m.harness.screen.dropPin({latitude: 2, longitude: 3}); await settle();
    assert.equal(m.render().mode, 'dir');
  } finally { m.restore(); }
});

test('guidance without a screen-off session says to keep Maps open, in plain words', async () => {
  const {m} = await mount();
  try {
    (await routeToCafe(m)).dr.start(); await settle();
    let data = m.render();
    assert.equal(data.nativeStatus, 'Waiting for your location.');
    m.harness.bridge.starts.at(-1).reject(Error('refused')); await settle();
    data = m.render();
    assert.equal(data.dr.nav.meta, 'Keep Maps open');
    assert.doesNotMatch(`${data.nativeStatus} ${data.dr.nav.meta}`, /foreground|fix/i);
  } finally { m.restore(); }
});

test('arriving with Maps off screen posts one arrival notice, then ends the screen-off session', async () => {
  const {m, cafe} = await mount();
  try {
    (await routeToCafe(m)).dr.start(); await settle();
    const start = m.harness.bridge.starts.at(-1);
    start.resolve(); await settle();
    m.visibility(true); await settle();
    const watch = m.harness.locations[0].run;
    assert.equal(typeof watch?.onFix, 'function', 'guidance holds its location watch');
    watch.onFix({coordinate: from, accuracyMeters: 5, timestamp: Date.now(), precision: 'precise'}); await settle();
    assert.deepEqual(m.harness.bridge.arrivals, []);
    watch.onFix({coordinate: cafe.coordinate, accuracyMeters: 5, timestamp: Date.now(), precision: 'precise'}); await settle();
    assert.deepEqual(m.harness.bridge.arrivals, [{title: 'Arrived at Cafe', text: 'Navigation ended.'}]);
    assert.deepEqual(m.harness.bridge.stops, [start.sessionId]);
  } finally { m.restore(); }
});

test('arriving with Maps on screen ends the session without a notice', async () => {
  const {m, cafe} = await mount();
  try {
    (await routeToCafe(m)).dr.start(); await settle();
    const start = m.harness.bridge.starts.at(-1);
    start.resolve(); await settle();
    m.harness.locations[0].run.onFix({coordinate: cafe.coordinate, accuracyMeters: 5, timestamp: Date.now(), precision: 'precise'}); await settle();
    assert.equal(m.render().dr.nav.arrived, true);
    assert.deepEqual(m.harness.bridge.arrivals, []);
    assert.deepEqual(m.harness.bridge.stops, [start.sessionId]);
  } finally { m.restore(); }
});
