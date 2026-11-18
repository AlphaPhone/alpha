import { createRegionalMaps, type RegionalOptions } from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/regional-provider.ts';
import { registerPlugin } from '../platform-plugins';
import { Capacitor } from '@capacitor/core';
import { DailyApps } from '../daily';
import { configureMapsProvider } from './runtime';
import { testMocksEnabled, devSurfacesEnabled } from '../build-flags';

// The regional gateway is a development prototype: only test-mocks builds
// (ELIZA_DEV_ALLOW_TEST_MOCKS=1) read VITE_MAPS_BASE_URL, and plain-HTTP loopback hosts
// and the emulator gateway fold out of every other build. Product builds use Eliza
// Cloud Maps (./cloud-maps.ts).
const regionalBaseUrl: string | undefined = testMocksEnabled ? import.meta.env.VITE_MAPS_BASE_URL || undefined : undefined;
export const regionalMapsConfigured = !!regionalBaseUrl;
export const { regionalDiagnostics, nativeRegion, nativeRegionRequest, regionalMap, initializeRegionalMaps } = createRegionalMaps({
 baseUrl: regionalBaseUrl,
 nativeGateway: testMocksEnabled ? 'http://10.0.2.2:47850' : '',
 developmentHosts: testMocksEnabled ? ['127.0.0.1', '10.0.2.2'] : [],
 development: devSurfacesEnabled,
 isNative: () => Capacitor.isNativePlatform(),
 developmentBuild: async () => testMocksEnabled && (await DailyApps.surfaceInfo()).developmentBuild === true,
 transport: registerPlugin<RegionalOptions['transport']>('AlphaMapsTransport'),
 configure: configureMapsProvider,
});
