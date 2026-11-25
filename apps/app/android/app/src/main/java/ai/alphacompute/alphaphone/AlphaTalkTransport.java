// spec/app/voice/index.md, "On-device Talk audio stays in the current owner's native capture and resident recognizer"
package ai.alphacompute.alphaphone;

import ai.eliza.os.agent.AgentChannel;
import ai.eliza.os.agent.AgentCredentials.Account;
import ai.eliza.os.agent.AgentCredentials.Active;
import ai.eliza.os.agent.AgentService;
import ai.eliza.os.agent.ChannelPolicy.CallerKind;
import ai.eliza.os.agent.ChannelPolicy.Outcome;
import ai.eliza.os.agent.ChannelPolicy.OutcomeKind;
import ai.eliza.plugins.passwords.PasswordSurfaces;
import ai.eliza.voice.LiveSegmentPipe;
import android.content.Context;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;

final class AlphaTalkTransport implements LiveSegmentPipe.Transport {
 private static final String SCOPE = "/api/alpha-speech/scope";
 private static final String LIVE_ASR = "/api/asr/local-inference/live";
 private static final long REPLY_LIMIT_MS = 8_000L;

 private final AlphaAgentCredentials credentials;
 private final AgentChannel channel;
 private final Account account;
 private final long epoch;
 private final String owner = "talk-" + UUID.randomUUID();
 private AgentChannel.Call active;
 private boolean discarded;

 private AlphaTalkTransport(AlphaAgentCredentials credentials, AgentChannel channel, Account account, long epoch) {
  this.credentials = credentials;
  this.channel = channel;
  this.account = account;
  this.epoch = epoch;
 }

 static boolean available() {
  return AlphaAgentService.localSpeechHostReady() && AgentService.channel().policy().servingEpoch() > 0 && !PasswordSurfaces.visible();
 }

 static AlphaTalkTransport open(Context context) throws Exception {
  var credentials = new AlphaAgentCredentials(context.getApplicationContext());
  var channel = AgentService.channel();
  long epoch = channel.policy().servingEpoch();
  if (epoch <= 0) throw new IOException("Resident recognizer unavailable");
  var lease = new AlphaTalkTransport(credentials, channel, accountOf(credentials), epoch);
  AgentChannel.Response answer = lease.request("GET", SCOPE, null, false);
  if (answer.status() != 200) throw new IOException("Resident recognizer unavailable");
  JSONObject scope = new JSONObject(new String(answer.body(), StandardCharsets.UTF_8));
  if (scope.getLong("epoch") != epoch || !lease.account.userId().equals(scope.getString("userId"))
    || !lease.account.organizationId().equals(scope.getString("organizationId"))) {
   throw new SecurityException("Resident speech owner changed");
  }
  lease.check();
  return lease;
 }

 static Account signedInAccount(AlphaAgentCredentials credentials) {
  Active active = credentials.current();
  return active == null || active.expiresAt() <= System.currentTimeMillis() ? null : active.account();
 }

 private static Account accountOf(AlphaAgentCredentials credentials) throws IOException {
  Account account = signedInAccount(credentials);
  if (account == null) throw new IOException("Voice owner unavailable");
  return account;
 }

 @Override public void check() throws IOException {
  if (!available() || channel.policy().servingEpoch() != epoch || !account.equals(accountOf(credentials))) {
   throw new SecurityException("Resident speech authority changed");
  }
 }

 @Override public JSONObject post(JSONObject body) throws Exception {
  AgentChannel.Response answer = request("POST", LIVE_ASR, body.toString().getBytes(StandardCharsets.UTF_8), body.optBoolean("close"));
  return new JSONObject().put("status", answer.status()).put("body", new String(answer.body(), StandardCharsets.UTF_8));
 }

 @Override public void cancelInFlight() {
  AgentChannel.Call call;
  synchronized (this) {
   discarded = true;
   call = active;
  }
  if (call != null) call.close();
 }

 private AgentChannel.Response request(String method, String path, byte[] body, boolean closing) throws Exception {
  var answer = new CompletableFuture<AgentChannel.Response>();
  var id = UUID.randomUUID().toString();
  var call = new AgentChannel.Call(channel, owner, id);
  synchronized (this) {
   check();
   if (active != null || (discarded && !closing)) throw new IOException("Voice capture retired");
   synchronized (channel.policy()) {
    if (channel.policy().servingEpoch() != epoch) throw new SecurityException("Resident speech epoch changed");
    var refused = channel.ask(CallerKind.NATIVE, owner, id, method, path, false, body, Map.of(), new AgentChannel.Listener() {
     @Override public void head(String id, long index, int status, Map<String, String> headers) {}
     @Override public void chunk(String id, long index, byte[] bytes) {}
     @Override public void event(String id, long index, JSONObject event) {}
     @Override public void settled(String id, Outcome outcome, byte[] bytes) {
      if (outcome.kind() == OutcomeKind.RESPONSE && bytes != null) {
       answer.complete(new AgentChannel.Response((int) outcome.status(), bytes));
      } else {
       answer.completeExceptionally(new IOException("Resident speech request ended"));
      }
     }
    });
    if (refused != null) throw new IOException("Resident speech route refused");
    active = call;
   }
  }
  try {
   AgentChannel.Response response = answer.get(REPLY_LIMIT_MS, TimeUnit.MILLISECONDS);
   check();
   synchronized (this) {
    if (discarded && !closing) throw new IOException("Voice capture retired");
   }
   return response;
  } finally {
   if (!answer.isDone()) call.close();
   synchronized (this) {
    if (active == call) active = null;
   }
  }
 }
}
