// Arrival with Maps off screen: the whole Java bridge and navigation service post one
// dismissable "Arrived at" notice for the renderer that owns the session, and nothing for
// another renderer or when no session runs. Android delivery is a controlled port.
import test from 'node:test';
import assert from 'node:assert/strict';
import {app, javaTraces} from '../specs/quint/refinement/native/java.mjs';
import {navigationServicePlatform} from '../specs/quint/refinement/native/navigation-service-platform.mjs';
import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';

test('arrival notice is posted once, by the session owner, and the session still stops', {timeout: scaledTimeout(180000)}, () => {
  const platform = navigationServicePlatform();
  try {
    const result = javaTraces('../../../../test/fixtures/NavigationArrivalTest.java', [
      ...['AlphaNavigationService.java', 'AlphaMapsTransportPlugin.java', 'PluginWorkers.java'].map(name => app + name),
      'specs/quint/refinement/native/NavigationServicePorts.java',
      'node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/JSObject.java',
      ...platform.paths,
    ], [], 'ai.alphacompute.alphaphone.NavigationArrivalTest');
    assert.deepEqual(result, {
      idle: false, foreign: false, shown: true, posted: 1,
      title: 'Arrived at Cafe', text: 'Navigation ended.', autoCancel: true, ongoing: false,
      stopped: true, activeAfterStop: false,
    });
  } finally {
    platform.close();
  }
});
