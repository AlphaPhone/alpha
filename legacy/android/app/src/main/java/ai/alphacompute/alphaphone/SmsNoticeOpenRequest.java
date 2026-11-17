package ai.alphacompute.alphaphone;

import android.os.SystemClock;

/** Process-local handoff from the private notification Activity to the foreground launcher. */
final class SmsNoticeOpenRequest {
 static final String ACTION = "ai.alphacompute.alphaphone.action.OPEN_SMS_NOTICE";
 private static final long MAX_AGE_MS = 60_000;
 private static long sequence;
 private static Tap pending;
 private static long deadline;

 static final class Tap {
  final String threadId;
  final String token;
  Tap(String threadId, String token) { this.threadId = threadId; this.token = token; }
 }

 private SmsNoticeOpenRequest() {}

 static synchronized void offer(String threadId) {
  pending = new Tap(threadId, Long.toString(++sequence));
  deadline = SystemClock.elapsedRealtime() + MAX_AGE_MS;
 }

 static synchronized Tap current() {
  if (SystemClock.elapsedRealtime() >= deadline) pending = null;
  return pending;
 }

 static synchronized void acknowledge(String token) {
  Tap tap = current();
  if (tap != null && tap.token.equals(token)) pending = null;
 }

 static synchronized void clear() { pending = null; }
}
