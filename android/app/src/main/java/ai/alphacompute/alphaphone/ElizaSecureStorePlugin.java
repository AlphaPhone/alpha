package ai.alphacompute.alphaphone;

import ai.eliza.plugins.securestore.nativeonly.SecureSlotPolicy.Caller;
import ai.eliza.plugins.securestore.nativeonly.SecureSlotPolicy.ExchangeOutcome;
import ai.eliza.plugins.securestore.nativeonly.SecureSlotPolicy.SlotRequest;
import ai.eliza.plugins.securestore.nativeonly.SecureSlots;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * ElizaSecureStore: the upstream encrypted slot store (@elizaos/os secure-store SecureSlots, names
 * hashed, one hardware-backed Keystore key, no backup) for the renderer's named slots, under Alpha's
 * slot policy (RendererCredentialSlots.APP): a native-only, delegation or Cloud credential slot is
 * refused, and compare-and-exchange is open only to the slots the policy marks exchangeable. Cloud
 * slots are namespaced by the deployment.
 *
 * <p>An earlier AlphaConnection draft or record slot (Notes' folders, origins and Trash, the Inbox's
 * drafts, shelves and operation records, and the rest of RendererCredentialSlots.LEGACY) is moved
 * here under the same name before the first call that names it, and Notes' fixed slots at load:
 * copied only into an empty slot, recorded as moved, and only then cleared from the earlier store,
 * so a newer value is never replaced and a moved value is never copied back after it was removed.
 */
@CapacitorPlugin(name = "ElizaSecureStore")
public final class ElizaSecureStorePlugin extends Plugin {
 static final String DIRECTORY = "alpha-secure-slots";
 static final String KEY_ALIAS = "ai.alphacompute.alphaphone.secure-slots.v1";
 /** Native-only record of the earlier slots already moved here. */
 static final String MOVED_SLOT = "alpha-legacy-slots:v1";
 /** Earlier AlphaConnection slots this version's renderer reads from ElizaSecureStore under the same name. */
 static final String[] ADOPTED = { AlphaCredentialStore.NOTES_FOLDERS, AlphaCredentialStore.NOTE_ORIGINS, AlphaCredentialStore.NOTES_TRASH };
 private static final int NAME_LIMIT = 512;
 private final ExecutorService worker = Executors.newSingleThreadExecutor();
 private SecureSlots slots;

 /** Alpha's slot store over `context`, under the app policy. */
 static SecureSlots open(android.content.Context context) {
  return new SecureSlots(new File(context.getApplicationContext().getNoBackupFilesDir(), DIRECTORY), KEY_ALIAS, RendererCredentialSlots.APP);
 }

 private AlphaCredentialStore legacy;

 @Override public void load() {
  slots = open(getContext());
  legacy = new AlphaCredentialStore(getContext());
  worker.execute(() -> { for (String name : ADOPTED) try { adopt(slots, legacy, name); } catch (Exception kept) { /* Left in the earlier store for a later call. */ } });
 }

 /** Moves the earlier slot `name` from `legacy` into `slots`, as the class comment says; a slot that could not be moved stays for a later call. */
 static void adopt(SecureSlots slots, AlphaCredentialStore legacy, String name) throws Exception {
  if (!RendererCredentialSlots.legacySlot(name)) return;
  String kept = legacy.readCredentialSlot(name);
  if (kept == null) return;
  Set<String> moved = movedSlots(slots);
  if (!moved.contains(name)) {
   SecureSlots.Reading now = slots.read(Caller.NativeCaller, name);
   if (now instanceof SecureSlots.Absent) {
    if (slots.compareAndExchange(Caller.NativeCaller, name, null, kept) != ExchangeOutcome.Written) return;
   } else if (!(now instanceof SecureSlots.Present)) return;
   Set<String> next = new LinkedHashSet<>(moved);
   next.add(name);
   if (slots.write(Caller.NativeCaller, MOVED_SLOT, new JSONArray(next).toString()) != ExchangeOutcome.Written) return;
  }
  legacy.compareExchangeCredentialSlot(name, kept, null);
 }

 private static Set<String> movedSlots(SecureSlots slots) throws Exception {
  SecureSlots.Reading reading = slots.read(Caller.NativeCaller, MOVED_SLOT);
  Set<String> moved = new LinkedHashSet<>();
  if (reading instanceof SecureSlots.Absent) return moved;
  if (!(reading instanceof SecureSlots.Present)) throw new IllegalStateException("Moved-slot record is unreadable");
  JSONArray names = new JSONArray(((SecureSlots.Present) reading).value());
  for (int i = 0; i < names.length(); i++) moved.add(names.getString(i));
  return moved;
 }

 private interface Work { void run() throws Exception; }

 private void off(PluginCall call, Work work) {
  worker.execute(() -> { try { work.run(); } catch (SecurityException refused) { call.reject("This slot is not open to the app", "denied"); } catch (Exception error) { call.reject("Secure storage is unavailable", "unavailable"); } });
 }

 /** The stored name of the call's slot when the app view may make `request` of it. */
 private static String slot(PluginCall call, SlotRequest request) {
  String key = call.getString("key");
  if (key == null || key.isEmpty() || key.length() > NAME_LIMIT) throw new IllegalArgumentException("A slot name is required");
  String stored = CloudDeployment.storageSlot(key);
  if (!RendererCredentialSlots.appAdmits(stored, request)) throw new SecurityException("Secure slot is not open to the app");
  return stored;
 }

 /** The call's slot as {@link #slot} names it, with its earlier value moved here first when it still has one. */
 private String adopted(PluginCall call, SlotRequest request) throws Exception {
  String name = slot(call, request);
  try { adopt(slots, legacy, name); } catch (Exception kept) { /* The earlier value stays until a later call moves it. */ }
  return name;
 }

 private static void settle(PluginCall call, ExchangeOutcome outcome, Runnable done) {
  switch (outcome) {
   case Written: case Removed: done.run(); break;
   case CapacityRefused: call.reject(AlphaConnectionPlugin.STORAGE_FULL_MESSAGE, AlphaConnectionPlugin.STORAGE_FULL); break;
   case Refused: call.reject("This slot is not open to the app", "denied"); break;
   case Unconfirmed: call.reject("Secure storage could not confirm the change", "unconfirmed"); break;
   default: call.reject("Secure storage is unavailable", "unavailable");
  }
 }

 @PluginMethod public void get(PluginCall call) {
  off(call, () -> {
   SecureSlots.Reading reading = slots.read(Caller.RendererCaller, adopted(call, SlotRequest.ReadRequest));
   if (reading instanceof SecureSlots.Refused) { call.reject("This slot is not open to the app", "denied"); return; }
   if (reading instanceof SecureSlots.Unreadable) { call.reject("Secure storage could not read this slot", "unreadable"); return; }
   JSObject out = new JSObject();
   out.put("value", reading instanceof SecureSlots.Present ? ((SecureSlots.Present) reading).value() : JSONObject.NULL);
   call.resolve(out);
  });
 }

 @PluginMethod public void set(PluginCall call) {
  off(call, () -> {
   String value = call.getString("value");
   if (value == null || value.isEmpty()) { call.reject("A value is required"); return; }
   settle(call, slots.write(Caller.RendererCaller, adopted(call, SlotRequest.WriteRequest), value), call::resolve);
  });
 }

 @PluginMethod public void remove(PluginCall call) {
  off(call, () -> {
   String key = adopted(call, SlotRequest.RemoveRequest);
   synchronized (ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots.LOCK) {
    boolean existed = !(slots.read(Caller.RendererCaller, key) instanceof SecureSlots.Absent);
    settle(call, slots.remove(Caller.RendererCaller, key), () -> { JSObject out = new JSObject(); out.put("removed", existed); call.resolve(out); });
   }
  });
 }

 @PluginMethod public void compareAndExchange(PluginCall call) {
  off(call, () -> {
   String key = adopted(call, SlotRequest.ExchangeRequest);
   String expected = call.getData().isNull("expected") ? null : call.getString("expected");
   String next = call.getData().isNull("value") ? null : call.getString("value");
   ExchangeOutcome outcome = slots.compareAndExchange(Caller.RendererCaller, key, expected, next);
   if (outcome == ExchangeOutcome.Conflict) { JSObject out = new JSObject(); out.put("exchanged", false); call.resolve(out); return; }
   settle(call, outcome, () -> { JSObject out = new JSObject(); out.put("exchanged", true); call.resolve(out); });
  });
 }

 @PluginMethod public void status(PluginCall call) {
  off(call, () -> {
   JSObject out = new JSObject();
   try { slots.ensureAvailable(); out.put("available", true); } catch (Exception unavailable) { out.put("available", false); }
   call.resolve(out);
  });
 }

 @Override protected void handleOnDestroy() { worker.shutdown(); super.handleOnDestroy(); }
}
