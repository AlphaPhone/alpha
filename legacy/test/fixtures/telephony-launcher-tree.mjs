// Fabricated `aapt dump xmltree` text for a launcher with the nine telephony role handlers.
// Shared by the TypeScript role tests and the Python image-identity test; not APK evidence.
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const enabled = '(type 0x12)0xffffffff';
export const disabled = '(type 0x12)0x0';
export const element = (depth, name, attrs) => [
  `${' '.repeat(depth)}E: ${name} (line=1)`,
  ...Object.entries(attrs).map(([key, value]) =>
    `${' '.repeat(depth + 2)}A: android:${key}(0x01010003)=${value.startsWith('(type') ? value : JSON.stringify(value)}`),
];
const component = (tag, name, publicEntry, permission, attrs = {}) =>
  element(6, tag, {name, enabled: disabled, exported: publicEntry ? enabled : disabled, ...(permission && {permission}), ...attrs});
const filter = (action, data, defaultCategory = false) => [
  ...element(8, 'intent-filter', {}),
  ...element(10, 'action', {name: action}),
  ...(defaultCategory ? element(10, 'category', {name: 'android.intent.category.DEFAULT'}) : []),
  ...(data ? element(10, 'data', data) : []),
];

/** The nine role handlers, disabled in the APK until the image enables them. */
export function telephonyRoleTree(pkg, {setupReceiver = false} = {}) {
  return [
    '  E: manifest (line=1)', `    A: package="${pkg}"`, '    E: application (line=2)',
    ...component('activity', '.MainActivity', true),
    ...component('service', '.AlphaInCallService', true, 'android.permission.BIND_INCALL_SERVICE'),
    ...element(8, 'meta-data', {name: 'android.telecom.IN_CALL_SERVICE_UI', value: enabled}),
    ...filter('android.telecom.InCallService'),
    ...component('activity', '.AlphaCallActivity', false),
    ...component('activity', `${pkg}.AlphaDialPadActivity`, true),
    ...filter('android.intent.action.DIAL', null, true),
    ...filter('android.intent.action.DIAL', {scheme: 'tel'}, true),
    ...component('receiver', '.AlphaSmsDeliverReceiver', true, 'android.permission.BROADCAST_SMS'),
    ...filter('android.provider.Telephony.SMS_DELIVER'),
    ...component('receiver', '.AlphaMmsWapPushReceiver', true, 'android.permission.BROADCAST_WAP_PUSH'),
    ...filter('android.provider.Telephony.WAP_PUSH_DELIVER', {mimeType: 'application/vnd.wap.mms-message'}),
    ...component('receiver', '.AlphaMmsResultReceiver', false),
    ...component('service', '.AlphaRespondViaMessageService', true, 'android.permission.SEND_RESPOND_VIA_MESSAGE'),
    ...filter('android.intent.action.RESPOND_VIA_MESSAGE', {scheme: 'smsto'}, true),
    ...component('activity', '.AlphaSmsComposeActivity', true),
    ...filter('android.intent.action.SENDTO', {scheme: 'smsto'}, true),
    ...component('provider', 'ai.eliza.plugins.messages.MmsFileProvider', false, null, {
      authorities: `${pkg}.mms`, grantUriPermissions: enabled,
    }),
    // The first-run receiver that production image staging requires, protected by role management.
    ...(setupReceiver ? element(6, 'receiver', {name: `${pkg}.AlphaTelephonySetupReceiver`, exported: enabled,
      enabled, permission: 'android.permission.MANAGE_ROLE_HOLDERS'}) : []),
  ].join('\n');
}

// `bun test/fixtures/telephony-launcher-tree.mjs PACKAGE [--without-setup-receiver]` prints the tree.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.stdout.write(telephonyRoleTree(process.argv[2], {setupReceiver: !process.argv.includes('--without-setup-receiver')}) + '\n');
