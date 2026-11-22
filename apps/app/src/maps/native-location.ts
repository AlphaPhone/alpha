import { NativeMapsLocation as SharedLocation, type LocationBridge } from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/native-location.ts';
import type { Position } from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/location.ts';
import type { MapsFailure } from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/contracts.ts';
import { registerPlugin } from '../platform-plugins';
import { Capacitor } from '@capacitor/core';
import { networkLocation, type NetworkFix } from '../runtime/network-location';
export type { Position } from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/location.ts';
const location = registerPlugin<LocationBridge>('ElizaLocation');
/** How long Maps waits for GPS before asking for a Wi-Fi/cell position. */
export const GPS_GRACE_MS = 4000;
type NetworkSource = { locate(): Promise<NetworkFix | undefined> };
/**
 * GPS first. When it gives no fix within GPS_GRACE_MS (indoors, or an image without a network
 * location provider), one network lookup stands in as an approximate position until GPS answers.
 * A one-shot request (a locate card, "near me") then finishes with it.
 */
export class NativeMapsLocation extends SharedLocation {
 private attempt = 0;
 constructor(private readonly network: NetworkSource = networkLocation(), private readonly graceMs = GPS_GRACE_MS, bridge: LocationBridge = location, platform = { isNative: () => Capacitor.isNativePlatform(), available: () => Capacitor.isPluginAvailable('ElizaLocation') }) {
  super(bridge, platform);
 }
 override async stop(): Promise<void> { this.attempt++; return super.stop(); }
 override async start(oneShot: boolean, onFix: (position: Position) => void, onError: (error: MapsFailure) => void): Promise<void> {
  let gps = false, failed = false;
  const fix = (position: Position) => { gps = true; onFix(position); };
  const error = (failure: MapsFailure) => { failed = true; onError(failure); };
  await super.start(oneShot, fix, error);
  // The shared start() stops any earlier session first; read the attempt once the watch is set up.
  const mine = this.attempt;
  if (failed || gps || this.awaitingPermission()) return;
  setTimeout(() => {
   if (mine !== this.attempt || gps || failed) return;
   void this.network.locate().then(network => {
    if (!network || mine !== this.attempt || gps || failed) return;
    onFix({ coordinate: { latitude: network.latitude, longitude: network.longitude }, accuracyMeters: network.accuracyMeters, timestamp: network.timestamp, precision: 'approximate' });
    if (oneShot) void this.stop().catch(onError);
   }, () => {});
  }, this.graceMs);
 }
}
/** Whether location is already granted, without showing a permission prompt. */
export async function locationPermissionGranted(): Promise<boolean> {
 if (!Capacitor.isPluginAvailable('ElizaLocation')) return false;
 try { return (await location.checkPermissions()).location === 'granted'; } catch { return false; }
}
