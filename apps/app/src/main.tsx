import { Capacitor } from '@capacitor/core';

// The native application has one shared AppProvider. The compatibility renderer
// stays outside that module graph and owns the existing browser/developer lane.
if (Capacitor.getPlatform() === 'android') {
  void import('./native-main').then(({ mountNativeApplication }) => mountNativeApplication());
} else {
  void import('./compatibility-main');
}
