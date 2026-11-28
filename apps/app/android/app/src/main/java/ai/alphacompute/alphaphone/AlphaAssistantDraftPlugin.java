// spec/app/assistant/composer.md
package ai.alphacompute.alphaphone;

import ai.eliza.os.agent.AgentService;
import ai.eliza.plugins.securestore.nativeonly.SecureSlotPolicy.Caller;
import ai.eliza.plugins.securestore.nativeonly.SecureSlots;
import ai.eliza.plugins.signin.DeviceCredentialStore;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;
import org.json.JSONArray;

/** The renderer may name a conversation and assert its current seat. Native custody derives the key. */
@CapacitorPlugin(name = "AlphaAssistantDraft")
public final class AlphaAssistantDraftPlugin extends Plugin {
 private static final Pattern ID = Pattern.compile("[A-Za-z0-9][A-Za-z0-9_-]{0,127}");
 private static final int RAW_LIMIT = 256 * 1024;
 private final ExecutorService drafts = Executors.newSingleThreadExecutor();

 @PluginMethod public void read(PluginCall call) { drafts.execute(() -> perform(call, false)); }

 @PluginMethod public void exchange(PluginCall call) { drafts.execute(() -> perform(call, true)); }

 @Override protected void handleOnDestroy() {
  drafts.shutdown();
  super.handleOnDestroy();
 }

 private void perform(PluginCall call, boolean exchange) {
  try {
   var reader = new AlphaAgentCredentials(getContext()).reader();
   if (!(reader instanceof DeviceCredentialStore store)) {
    call.resolve(result("unavailable"));
    return;
   }
   var session = new ResidentDigestChannel(store, store::generation).openAccount();
   if (session.epoch() != call.getLong("epoch", 0L)
     || !session.scope().ownerId().equals(call.getString("owner"))
     || !session.scope().agentId().equals(call.getString("agent"))) {
    call.resolve(result("denied"));
    return;
   }

   String conversation = call.getString("conversation");
   String room = call.getString("room");
   if (call.getData().has("conversation") != (conversation != null)
     || call.getData().has("room") != (room != null)
     || (conversation == null) != (room == null)
     || conversation != null && (!ID.matcher(conversation).matches() || !ID.matcher(room).matches())) {
    call.resolve(result("denied"));
    return;
   }
   String slot = slot(session, conversation, room);
   synchronized (AgentService.channel().policy()) {
    session.check();
    SecureSlots slots = SecureSlots.forHost(getContext());
    JSObject answer = exchange ? exchange(slots, slot, call) : read(slots, slot);
    session.check();
    call.resolve(answer);
   }
  } catch (SecurityException denied) {
   call.resolve(result("denied"));
  } catch (Exception unavailable) {
   call.resolve(result(exchange ? "failure" : "unavailable"));
  }
 }

 private static String slot(ResidentDigestChannel.Session session, String conversation, String room) throws Exception {
  byte[] identity = new JSONArray().put(session.scope().ownerId()).put(session.organizationId())
   .put(session.scope().agentId()).put(conversation).put(room).toString().getBytes(StandardCharsets.UTF_8);
  StringBuilder key = new StringBuilder("assistant-draft:v2:");
  for (byte value : MessageDigest.getInstance("SHA-256").digest(identity)) {
   key.append(Character.forDigit((value >> 4) & 15, 16)).append(Character.forDigit(value & 15, 16));
  }
  return key.toString();
 }

 private static JSObject read(SecureSlots slots, String slot) {
  return switch (slots.read(Caller.NativeCaller, slot)) {
   case SecureSlots.Present present -> result("read").put("raw", present.value());
   case SecureSlots.Absent ignored -> result("read");
   case SecureSlots.Unreadable ignored -> result("failure");
   case SecureSlots.Refused ignored -> result("denied");
  };
 }

 private static JSObject exchange(SecureSlots slots, String slot, PluginCall call) throws Exception {
  String expected = call.getString("expected");
  String next = call.getString("next");
  if (call.getData().has("expected") != (expected != null)
    || call.getData().has("next") != (next != null)) return result("denied");
  if (expected != null && expected.getBytes(StandardCharsets.UTF_8).length > RAW_LIMIT) return result("denied");
  if (next != null && (next.getBytes(StandardCharsets.UTF_8).length > RAW_LIMIT || !AlphaDraftRow.admits(next))) return result("denied");
  return switch (slots.compareAndExchange(Caller.NativeCaller, slot, expected, next)) {
   case Written, Removed -> result("landed");
   case Conflict -> result("conflict");
   case Refused -> result("denied");
   case CapacityRefused, Failed, Unconfirmed -> result("failure");
  };
 }

 private static JSObject result(String status) { return new JSObject().put("status", status); }
}
