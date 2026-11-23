import { NativeMapsLocation as SharedLocation, type LocationBridge } from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/native-location.ts';
import type { Position } from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/location.ts';
import type { MapsFailure } from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/contracts.ts';
import { registerPlugin } from '../platform-plugins';
import { Capacitor } from '@capacitor/core';
import { networkLocation, type NetworkFix } from '../runtime/network-location';
export type { Position } from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/location.ts';
const location = registerPlugin<LocationBridge>('ElizaLocation');
const available = () => Capacitor.isPluginAvailable('ElizaLocation');
/** How long Maps waits for GPS before asking for a Wi-Fi/cell position. */
export const GPS_GRACE_MS = 4000;
type NetworkSource = { locate(): Promise<NetworkFix | undefined>; cached?(): NetworkFix | undefined };
/**
 * GPS first. A recent network answer already in the cache is shown at once as an approximate
 * position; otherwise, when GPS gives no fix within GPS_GRACE_MS (indoors, or an image without a
 * network location provider), one network lookup stands in until GPS answers. A one-shot request
 * (a locate card, "near me") finishes with the approximate position.
 */
export class NativeMapsLocation extends SharedLocation {
 private attempt = 0;
 constructor(private readonly network: NetworkSource = networkLocation(), private readonly graceMs = GPS_GRACE_MS, bridge: LocationBridge = location, platform = { isNative: () => Capacitor.isNativePlatform(), available }) {
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
  const approximate = (network: NetworkFix) => {
   onFix({ coordinate: { latitude: network.latitude, longitude: network.longitude }, accuracyMeters: network.accuracyMeters, timestamp: network.timestamp, precision: 'approximate' });
   if (oneShot) void this.stop().catch(onError);
  };
  const known = this.network.cached?.();
  if (known) { approximate(known); if (oneShot) return; }
  setTimeout(() => {
   if (mine !== this.attempt || gps || failed) return;
   void this.network.locate().then(network => {
    if (!network || network === known || mine !== this.attempt || gps || failed) return;
    approximate(network);
   }, () => {});
  }, this.graceMs);
 }
}
/** Whether location is already granted, without showing a permission prompt. */
export async function locationPermissionGranted(): Promise<boolean> {
 if (!available()) return false;
 // A failed read counts as not granted: this check must never prompt or throw into Maps.
 try { return (await location.checkPermissions()).location === 'granted'; } catch { return false; }
}
