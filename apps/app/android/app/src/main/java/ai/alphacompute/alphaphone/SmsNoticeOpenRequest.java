// spec/app/messages/index.md, "Story: Read a conversation"
package ai.alphacompute.alphaphone;

import android.os.SystemClock;

/** Latest private notification tap, kept while the launcher and its renderer are starting. */
final class SmsNoticeOpenRequest {
 static final String ACTION = "ai.alphacompute.alphaphone.action.OPEN_SMS_NOTICE";
 private static final long MAX_AGE_MS = 60_000;
 private static long sequence;
 private static Tap pending;

 record Tap(String threadId, String token, long deadline) {}

 private SmsNoticeOpenRequest() {}

 static synchronized void offer(String threadId) {
  pending = new Tap(threadId, Long.toString(++sequence), SystemClock.elapsedRealtime() + MAX_AGE_MS);
 }

 static synchronized Tap current() {
  if (pending != null && SystemClock.elapsedRealtime() >= pending.deadline()) pending = null;
  return pending;
 }

 static synchronized void acknowledge(String token) {
  Tap tap = current();
  if (tap != null && tap.token().equals(token)) pending = null;
 }

 static synchronized void clear() { pending = null; }
}
