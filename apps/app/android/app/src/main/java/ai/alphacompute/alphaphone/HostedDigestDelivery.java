// spec/app/digests/index.md
package ai.alphacompute.alphaphone;

import ai.eliza.os.agent.AgentService;
import ai.eliza.plugins.signin.CredentialPolicy.Account;
import ai.eliza.plugins.signin.CredentialPolicy.Custody;
import ai.eliza.plugins.signin.CredentialPolicy.Notice;
import ai.eliza.plugins.signin.CredentialReader;
import ai.eliza.plugins.signin.DeviceCredentialStore;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import java.io.IOException;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;
import org.json.JSONObject;

/** Owns the sole Android digest inbox writer for both WorkManager and Workflows. */
final class HostedDigestDelivery {
 private static final String TAG = "AlphaHostedDigests";
 private static volatile HostedDigestDelivery process;

 static HostedDigestDelivery start(Context context, CredentialReader credentials) {
  if (process != null) return process;
  HostedDigestDelivery delivery = new HostedDigestDelivery(context, credentials);
  process = delivery;
  AgentService.onReady(() -> delivery.onReady());
  return delivery;
 }

 static HostedDigestDelivery running() { return process; }

 static HostedDigestDelivery get() {
  return Objects.requireNonNull(process, "Digest delivery is unavailable in this process");
 }

 private final Context context;
 private final CredentialReader credentials;
 private final AtomicLong ownerGeneration = new AtomicLong();
 private final ResidentDigestChannel channel;
 private final HostedDigestStore store;
 private final HostedDigestNotices notices;
 private final HostedInbox inbox;
 private final ExecutorService io = Executors.newSingleThreadExecutor();
 private final ExecutorService reads = Executors.newSingleThreadExecutor();
 private final CopyOnWriteArrayList<Runnable> changed = new CopyOnWriteArrayList<>();
 private record View(ResidentDigestChannel.Session session, String lease) {}

 private View verified;
 private Account observedAccount;

 private HostedDigestDelivery(Context context, CredentialReader credentials) {
  this.context = context.getApplicationContext();
  this.credentials = credentials;
  channel = new ResidentDigestChannel(credentials, ownerGeneration::get);
  store = HostedDigestStore.of(this.context);
  notices = new HostedDigestNotices(this.context, store);
  inbox = new HostedInbox(store, notices::publish);
 }

 AutoCloseable subscribe(Runnable observer) {
  changed.add(observer);
  return () -> changed.remove(observer);
 }

 private void publishChange() {
  for (Runnable observer : changed) {
   try { observer.run(); }
   catch (RuntimeException unavailable) { Log.w(TAG, "A digest observer is unavailable"); }
  }
 }

 /** Called under credential custody callbacks. Retire admissions before enqueuing I/O. */
 void custodyChanged(Notice notice) {
  if (!(notice instanceof Notice.Announce || notice instanceof Notice.SignedOutNotice || notice instanceof Notice.ExpiredNotice)) return;
  ownerGeneration.incrementAndGet();
  reads.execute(this::publishChange);
  io.execute(() -> {
   Account next = activeAccount();
   if (next == null || observedAccount != null && !observedAccount.equals(next)) {
    try {
     store.setActivation(null);
     notices.authorise(null);
     HostedDigestWorker.cancel(context);
    } catch (Exception unavailable) {
     Log.w(TAG, "Digest retirement needs reconciliation");
    }
   }
   observedAccount = next;
  });
 }

 private Account activeAccount() {
  if (!(credentials instanceof DeviceCredentialStore reader)) return null;
  var state = reader.state();
  return state.custody() instanceof Custody.Active active && active.keyExpiresAt() > state.now() ? active.account() : null;
 }

 private void onReady() {
  io.execute(() -> {
   try {
    var session = view().session();
    observedAccount = activeAccount();
    notices.authorise(session.scope());
    activate(session, store.enabled(session.scope()));
   } catch (Exception unavailable) {
    Log.w(TAG, "Digest delivery is waiting for a verified resident");
   }
   publishChange();
  });
 }

 <T> Future<T> submit(Callable<T> task) { return io.submit(task); }

 void execute(Runnable task) { io.execute(task); }

 void executeRead(Runnable task) { reads.execute(task); }

 void refreshNotices() { reads.execute(this::publishChange); }

 private synchronized View view() throws Exception {
  if (verified != null) {
   try {
    verified.session().check();
    return verified;
   } catch (IOException | SecurityException retired) {
    verified = null;
   }
  }
  verified = new View(channel.open(), UUID.randomUUID().toString());
  return verified;
 }

 JSONObject read() throws Exception {
  View shown;
  try { shown = view(); }
  catch (IOException | SecurityException unavailable) { return null; }
  var session = shown.session();
  var scope = session.scope();
  var rows = inbox.history(scope, session::check);
  boolean enabled = store.enabled(scope);
  boolean noticesAllowed = notices.allowed();
  session.check();
  return new JSONObject().put("rows", rows).put("backgroundEnabled", enabled)
   .put("support", "nativeScheduled").put("lease", shown.lease()).put("noticesAllowed", noticesAllowed);
 }

 ResidentDigestChannel.Session admitted(String expectedView) throws Exception {
  View current = view();
  if (!Objects.equals(expectedView, current.lease())) throw new SecurityException("Digest view changed");
  return current.session();
 }

 void syncManual(String expectedView) throws Exception {
  var session = admitted(expectedView);
  session.check();
  notices.authorise(session.scope());
  try { inbox.sync(session, session::check); }
  finally { publishChange(); }
 }

 void setBackground(boolean enabled, String expectedView) throws Exception {
  var session = admitted(expectedView);
  session.check();
  store.setEnabled(session.scope(), enabled);
  try { activate(session, enabled); }
  finally { publishChange(); }
 }

 private void activate(ResidentDigestChannel.Session session, boolean enabled) throws Exception {
  session.check();
  if (!enabled) {
   store.setActivation(null);
   HostedDigestWorker.cancel(context);
   return;
  }
  var current = store.activation();
  if (current == null || !current.scopeDigest().equals(session.scope().digest())) {
   current = new HostedDigestStore.Activation(UUID.randomUUID().toString(), session.scope().digest());
   store.setActivation(current);
  }
  session.check();
  HostedDigestWorker.schedule(context, current.id());
 }

 void syncScheduled(String activation) throws Exception {
  var active = store.activation();
  if (active == null || !active.id().equals(activation)) return;
  var session = view().session();
  var scope = session.scope();
  if (!active.scopeDigest().equals(scope.digest()) || !store.enabled(scope)) return;
  session.check();
  notices.authorise(scope);
  try { inbox.sync(session, session::check); }
  finally { publishChange(); }
 }

 void capture(Intent intent) {
  if (!HostedDigestNotices.accepts(intent)) return;
  Intent exact = new Intent(intent);
  execute(() -> {
   try {
    if (notices.capture(exact)) publishChange();
   } catch (Exception unavailable) {
    Log.w(TAG, "Digest notice tap could not be retained");
   }
  });
 }

 void captureQuestion(Intent intent, Consumer<Boolean> complete) {
  Intent exact = new Intent(intent);
  execute(() -> {
   boolean captured = false;
   try {
    captured = notices.captureQuestion(exact);
    if (captured) publishChange();
   } catch (Exception unavailable) {
    Log.w(TAG, "Digest question tap could not be retained");
   }
   complete.accept(captured);
  });
 }

 JSONObject peekNotice() throws Exception {
  ResidentDigestChannel.Session session;
  try { session = view().session(); }
  catch (IOException | SecurityException unavailable) { return null; }
  session.check();
  JSONObject notice = notices.peek(session.scope(), inbox, session::check);
  session.check();
  return notice;
 }

 void settleNotice(String token, String questionLease) throws Exception {
  var session = questionLease == null ? view().session() : admitted(questionLease);
  session.check();
  if (!notices.consume(session.scope(), token, questionLease != null, inbox, session::check)) {
   throw new SecurityException("Digest notice changed");
  }
  publishChange();
 }
}
