// spec/app/messages/index.md, "Story: Start a new message"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.SmsSendJournal;
import android.content.Intent;
import android.net.Uri;
import android.os.SystemClock;
import java.lang.ref.WeakReference;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

final class SmsDraftOpenRequest {
 static final String ACTION = "ai.alphacompute.alphaphone.action.OPEN_SMS_DRAFT";
 static final String TOKEN = "alpha.smsDraft";
 private static final long MAX_AGE_MS = 60_000;
 private static Pending pending;

 record Draft(List<String> recipients, String body) {}
 record Offer(String token, Draft draft, long deadline) {}
 private record Pending(Offer offer, WeakReference<MainActivity> owner) {}

 private SmsDraftOpenRequest() {}

 static Draft parse(Intent intent, String action) {
  if (intent == null || !action.equals(intent.getAction())) return null;
  try {
   Uri data = intent.getData();
   if (data == null || !data.isOpaque() || data.getEncodedFragment() != null
     || (!"sms".equalsIgnoreCase(data.getScheme()) && !"smsto".equalsIgnoreCase(data.getScheme()))) return null;
   String target = data.getEncodedSchemeSpecificPart();
   if (target == null || target.length() > 1024) return null;
   int query = target.indexOf('?');
   String[] fields = Uri.decode(query < 0 ? target : target.substring(0, query)).split("[,;]", -1);
   if (fields.length > SmsSendJournal.MAX_RECIPIENTS) return null;
   LinkedHashSet<String> recipients = new LinkedHashSet<>();
   for (String field : fields) {
    String number = field.replaceAll("[\\s().-]", "");
    if (!SmsSendJournal.NUMBER.matcher(number).matches() || !recipients.add(number)) return null;
   }
   String body = intent.getStringExtra("sms_body");
   if (body == null) body = intent.getStringExtra(Intent.EXTRA_TEXT);
   if (body == null) body = "";
   if (body.length() > SmsSendJournal.MAX_BODY || body.indexOf('\0') >= 0) return null;
   return new Draft(List.copyOf(recipients), body);
  } catch (RuntimeException invalid) { return null; }
 }

 static synchronized Offer offer(Draft draft) {
  Offer offer = new Offer(UUID.randomUUID().toString(), draft, SystemClock.elapsedRealtime() + MAX_AGE_MS);
  pending = new Pending(offer, null);
  return offer;
 }

 static synchronized boolean bind(MainActivity activity, String token) {
  Pending held = fresh();
  if (held == null || held.owner() != null || !held.offer().token().equals(token)) return false;
  pending = new Pending(held.offer(), new WeakReference<>(activity));
  return true;
 }

 static synchronized Offer current(MainActivity activity) {
  Pending held = fresh();
  return held != null && held.owner() != null && held.owner().get() == activity ? held.offer() : null;
 }

 static synchronized void acknowledge(MainActivity activity, String token) {
  Offer held = current(activity);
  if (held != null && held.token().equals(token)) pending = null;
 }

 static synchronized void retire(MainActivity activity) {
  Pending held = fresh();
  if (held != null && held.owner() != null && held.owner().get() == activity) pending = null;
 }

 static synchronized void retireUnbound(String token) {
  Pending held = fresh();
  if (held != null && held.owner() == null && held.offer().token().equals(token)) pending = null;
 }

 private static Pending fresh() {
  if (pending != null && (SystemClock.elapsedRealtime() >= pending.offer().deadline()
    || (pending.owner() != null && pending.owner().get() == null))) pending = null;
  return pending;
 }
}
