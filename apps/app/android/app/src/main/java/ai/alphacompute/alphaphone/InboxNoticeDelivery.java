// spec/app/inbox/notices.md, "Story: Hear about new mail"; spec/app/inbox/notices.md, "Story: Open my message from a notice"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.notifications.MailBackgroundDelivery;
import ai.eliza.plugins.notifications.MailHistoryReconciliation;
import ai.eliza.plugins.notifications.MailNoticePoster;
import ai.eliza.plugins.signin.CloudRequests;
import ai.eliza.plugins.signin.DeviceCustody;
import android.content.Context;
import android.content.Intent;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

final class InboxNoticeDelivery {
 static final String SLOT = "gmail-background:v1";
 static final String CHANNEL = "alpha-gmail";
 private static final String ORIGIN = BuildConfig.CLOUD_API_ORIGIN;
 private static InboxNoticeDelivery process;

 static synchronized InboxNoticeDelivery get(Context context) {
  if (process == null) process = new InboxNoticeDelivery(context.getApplicationContext());
  return process;
 }

 final MailBackgroundDelivery delivery;
 private final MailNoticePoster poster;
 private final ExecutorService io = Executors.newSingleThreadExecutor();
 private final CopyOnWriteArrayList<Runnable> signals = new CopyOnWriteArrayList<>();
 private final CloudRequests.Custody custody;
 private final CloudRequests requests;

 private InboxNoticeDelivery(Context context) {
  custody = DeviceCustody.cloud(context, ORIGIN);
  requests = CloudRequests.forMailReads(context.getCacheDir());
  AlphaSecureSlots slots = AlphaSecureSlots.of(context);
  poster = new MailNoticePoster(context, new MailNoticePoster.Config(
   CHANNEL, context.getString(R.string.alpha_gmail_channel_name), context.getString(R.string.alpha_gmail_channel_description),
   "ai.alphacompute.alphaphone.OPEN_GMAIL_NOTICE", "alpha-gmail:", "alpha-gmail-ask:", "alpha-gmail-",
   R.drawable.notification_icon, context.getString(R.string.alpha_gmail_title), context.getString(R.string.alpha_gmail_text),
   context.getString(R.string.alpha_gmail_public_title), context.getString(R.string.alpha_gmail_public_text),
   context.getString(R.string.alpha_gmail_ask), MainActivity.class));
  delivery = MailBackgroundDelivery.withLease(new MailBackgroundDelivery.LocalState() {
   public Object lock() { return custody.mailCommitLock(); }
   public String readState() throws Exception { return slots.read(SLOT); }
   public void writeState(String value) throws Exception { slots.write(SLOT, value); }
   public void removeState() throws Exception { slots.write(SLOT, null); }
   public boolean resetPending() { return AlphaResetPlugin.RESET.pending(context); }
  }, new MailBackgroundDelivery.LeaseAccess() {
   public MailBackgroundDelivery.LeaseBinding current() throws Exception { return binding(custody.mailAuthority()); }
   public MailBackgroundDelivery.LeaseReply read(MailBackgroundDelivery.LeaseBinding expected, String path) throws Exception {
    CloudRequests.MailAuthority authority;
    synchronized (custody.mailCommitLock()) {
     authority = custody.mailAuthority();
     if (!expected.equals(binding(authority))) throw new SecurityException("Mail lease changed");
    }
    var result = requests.readMail(ORIGIN, custody, authority, path, Map.of("Accept", "application/json"));
    if (result instanceof CloudRequests.Answered answer) return new MailBackgroundDelivery.LeaseReply(answer.status(), answer.body());
    var failure = ((CloudRequests.Failed) result).failure();
    return switch (failure) {
     case SIGN_IN_REQUIRED, MAIL_LEASE_UPGRADE_REQUIRED, REAUTH_REQUIRED -> throw new SecurityException("Mail lease unavailable");
     case NOT_LISTED -> new MailBackgroundDelivery.LeaseReply(404, null);
     default -> throw new IOException("Gmail history unavailable");
    };
   }
  }, new MailBackgroundDelivery.Scheduler() {
   public void schedule(String generation) { GmailDeliveryWorker.schedule(context, generation); }
   public void cancel() { GmailDeliveryWorker.cancel(context); }
  }, poster, new MailBackgroundDelivery.Config(ORIGIN, "production", "google.gmail.triage", 4));
 }

 private MailBackgroundDelivery.LeaseBinding binding(CloudRequests.MailAuthority authority) throws Exception {
  if (authority == null || !authority.account().complete()) return null;
  var credential = custody.credentials().current();
  if (credential == null || credential.version() != authority.version() || !authority.account().equals(credential.account())) return null;
  String fingerprint = MailHistoryReconciliation.hash(ORIGIN + "\n" + credential.credentialId() + "\n" + authority.version());
  return new MailBackgroundDelivery.LeaseBinding(credential.credentialId(), fingerprint, authority.account().userId(), authority.account().organizationId());
 }

 void execute(Runnable operation) { io.execute(operation); }

 AutoCloseable subscribe(Runnable signal) {
  signals.add(signal);
  return () -> signals.remove(signal);
 }

 void changed() { for (Runnable signal : signals) signal.run(); }

 boolean allowed() { return poster.allowed(); }

 void resume() { execute(() -> { delivery.resume(); changed(); }); }

 void capture(Intent intent) {
  var tap = poster.tap(intent);
  if (tap == null) return;
  execute(() -> {
   try { delivery.capture(tap.key, tap.question); intent.setData(null); changed(); }
   catch (Exception stale) { return; }
  });
 }
}
