package ai.alphacompute.alphaphone;

import ai.eliza.plugins.securestore.nativeonly.SecureSlotPolicy;
import ai.eliza.plugins.securestore.nativeonly.SecureSlotPolicy.Caller;
import ai.eliza.plugins.securestore.nativeonly.SecureSlotPolicy.SlotRequest;
import ai.eliza.plugins.securestore.nativeonly.SecureSlotPolicy.SlotRule;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Alpha's renderer-slot data for the shared SecureSlotPolicy (@elizaos/os secure-store,
 * spec/os/android/secureStore.md): which slot names are native-only, which the app view may
 * compare-and-exchange, and each slot's byte budget. The rules live upstream; only Alpha's slot
 * names are here. {@link #APP} governs ElizaSecureStore; {@link #LEGACY} governs the earlier
 * AlphaConnection slots, which the app view still reads and clears while it adopts them.
 */
final class RendererCredentialSlots {
 private RendererCredentialSlots() {}
 private static final String[] NATIVE_NAMESPACES = {
  "canonical-notification-owner", "gmail-background", "native-calendar-sync", "native-delete-journal", "native-delete-installation", "native-digest-source", "resident-results", "local-agent-provider", "workflow-notice-taps",
  "workflow-notice-delivery", "workflow-notice-owner", "workflow-approval-notices", "action-journal", "hosted-background",
  "hosted-digests", "hosted-notices", "note-audio-metadata", "reminder-taps",
  // In-app Cloud sign-in: the pending Google PKCE record and the key acknowledgement receipt.
  "cloud-signin", "google-workspace-return",
  // Physical deployment slots are native-owned. Renderer calls must use logical names.
  "cloud-deployment",
  // SMS send ledger and per-operation records are native-owned.
  "sms-send-ledger", "alpha-sms-operation",
  // The agent device-execution journal and Clock's review marks are reached only through AlphaActionJournal.
  "device-execution", "clock-agent-review",
  // Shared password backup recovery keys never leave native code (PasswordSharedBackup).
  "password-backup-recovery",
  // Which earlier AlphaConnection slots native code already moved into ElizaSecureStore.
  "alpha-legacy-slots",
  // NativeSecureStore's own credential snapshot (upstream sign-in and runtime custody).
  "runtime.active_server", "session.device_auth", "session.cloud_token", "runtime.agent_profiles"
 };
 private static final int KIB = 1024, MIB = 1024 * 1024;
 /** The draft and pending-action slots the earlier Alpha kept, each exchangeable, with its budget (AlphaCredentialStore.slotLimit). */
 private static final Object[][] LEGACY_EXCHANGEABLE = {
  {"inbox-drafts:v1:[\\s\\S]*", 8 * MIB}, {"inbox-operation:v1:[a-f0-9]{64}", 8 * MIB},
  {"calendar-linked-sync:v1:[a-f0-9]{64}", 4 * MIB}, {"connected-read-cache:v1:[a-f0-9]{64}", 4 * MIB},
  {"workflow-draft:v1:[a-f0-9]{64}", 256 * KIB}, {"assistant-draft:v1:[a-f0-9]{64}", 256 * KIB},
  {"notes-records:v1:device", 32 * MIB}, {"reminder-deletions:v1:device", 256 * KIB}, {"reminder-creations:v1:device", 256 * KIB},
  {"clock-handoff:v1:device", 256 * KIB}, {"notes-audio-deletions:v1:device", MIB},
  {"notes-trash:v1:device", 30 * MIB, 32 * MIB}, {"notes-draft:v1:device", 32 * MIB},
  {"note-origins:v1:device", 512 * KIB}, {"notes-folders:v1:device", 64 * KIB},
  {"sms-draft:v1:(new|thread:[1-9][0-9]{0,18})", 8 * MIB},
  // AP-16 AC-30: the open comms proposal card (data only) and the last briefed subject.
  {"alpha-proposal:v1", 256 * KIB}
 };
 /** Slots only this version's app view names: Notes' canonical draft, the Inbox's device-wide stored machines and the account's delegation record. */
 private static final Object[][] APP_EXCHANGEABLE = {
  {"notes-canonical-draft:v1:device", 32 * MIB}, {"device:alpha/device/inbox/[a-z/-]{1,64}", 8 * MIB},
  // The account's in-flight Cloud delegation record; os refuses any name under cloud-delegation.
  {"account-delegation:v1:[a-f0-9]{64}", 256 * KIB}
 };
 /** The earlier Cloud delegation record, a delegation slot that os refuses; only the earlier store keeps it. */
 private static final Pattern LEGACY_DELEGATION = Pattern.compile("cloud-delegation:v1:[a-f0-9]{64}");
 /** Cloud sign-in credentials: renderer writes and removals reserve a credential intent (AlphaLocalAgentPlugin). */
 private static final List<String> CREDENTIAL_SLOTS = List.of("cloud:production", "cloud:staging");
 /** The policy of ElizaSecureStore: every earlier slot it adopts, and this version's own. */
 static final SecureSlotPolicy APP = policy(LEGACY_EXCHANGEABLE, APP_EXCHANGEABLE);
 /** The policy of the earlier AlphaConnection slots. */
 static final SecureSlotPolicy LEGACY = policy(LEGACY_EXCHANGEABLE);

 private static SecureSlotPolicy policy(Object[][]... tables) {
  List<Object> classes = new ArrayList<>();
  for (Object[][] table : tables) for (Object[] row : table) {
   Map<String, Object> slot = new LinkedHashMap<>();
   slot.put("pattern", row[0]);
   slot.put("access", "exchangeable");
   slot.put("limit", row[1]);
   if (row.length > 2) slot.put("retained", row[2]);
   classes.add(slot);
  }
  Map<String, Object> config = new LinkedHashMap<>();
  config.put("nativeOnly", Arrays.asList(NATIVE_NAMESPACES));
  config.put("slots", classes);
  return SecureSlotPolicy.parse(config);
 }

 /** The native-only namespaces, for the device isolation campaign. */
 static List<String> nativeNamespaces() { return List.of(NATIVE_NAMESPACES); }

 private static boolean admitted(SecureSlotPolicy policy, String slot, SlotRequest request) {
  SlotRule rule = policy.rule(slot);
  return rule != null && SecureSlotPolicy.admits(Caller.RendererCaller, request, rule);
 }

 /** The earlier slot `slot` when the app view may read it; a native-only or unnamed slot throws. */
 static String requireAllowed(String slot) {
  if (slot == null || LEGACY.rule(slot) == null) throw new SecurityException("Invalid credential slot");
  if (SecureSlotPolicy.within(slot, SecureSlotPolicy.DELEGATION_NAMESPACE)) return slot;
  if (!admitted(LEGACY, slot, SlotRequest.ReadRequest)) throw new SecurityException("Native-only credential slot");
  return slot;
 }

 /** Whether the app view may compare-and-exchange the earlier slot `slot`: local drafts, kept records and pending device actions only. */
 static boolean compareExchangeAllowed(String slot) {
  if (slot != null && LEGACY_DELEGATION.matcher(slot).matches()) return true;
  return admitted(LEGACY, slot, SlotRequest.ExchangeRequest) && !credentialSlot(slot);
 }

 /** Whether `slot` holds a Cloud sign-in credential. */
 static boolean credentialSlot(String slot) { return CREDENTIAL_SLOTS.contains(slot); }

 /** Whether `slot` names one of the earlier AlphaConnection draft or record slots, which ElizaSecureStore adopts under the same name. */
 static boolean legacySlot(String slot) {
  return slot != null && !LEGACY_DELEGATION.matcher(slot).matches() && admitted(LEGACY, slot, SlotRequest.ExchangeRequest);
 }

 /** Whether the app view may make `request` of the ElizaSecureStore slot `slot`, named as it is stored. */
 static boolean appAdmits(String slot, SlotRequest request) { return !credentialSlot(slot) && admitted(APP, slot, request); }
}
