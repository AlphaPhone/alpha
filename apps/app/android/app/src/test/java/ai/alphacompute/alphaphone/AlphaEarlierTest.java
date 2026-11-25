// spec/app/platform/adoption.md, "The page reads the earlier Alpha's encrypted store where it is and never writes it: it may only read one of the earlier page's own slots, or clear it while it still holds what was read"; spec/app/platform/adoption.md, "A journal of the phone that keeps its earlier slot's name is moved into this Alpha's store the first time it is read, and one held only in the earlier store that cannot be moved is never read as empty"
package ai.alphacompute.alphaphone;

import static org.junit.Assert.assertEquals;

import java.util.List;
import java.util.regex.Pattern;
import org.junit.Test;

public final class AlphaEarlierTest {
 private static final String DIGEST = "a".repeat(64);

 private static List<String> matched(Pattern slots, List<String> names) {
  return names.stream().filter(name -> slots.matcher(name).matches()).toList();
 }

 @Test public void thePageReachesOnlyTheEarlierPagesOwnDraftsAndPendingRecords() {
  List<String> drafts = List.of("inbox-drafts:v1:[\"production\",\"u\",\"o\",\"g\"]", "inbox-operation:v1:" + DIGEST, "sms-draft:v1:new",
   "sms-draft:v1:thread:42", "assistant-draft:v1:" + DIGEST, "workflow-draft:v1:" + DIGEST, "alpha-proposal:v1", "stage-session:v1",
   "clock-handoff:v1:device", "reminder-creations:v1:device", "reminder-deletions:v1:device", "calendar-linked-sync:v1:" + DIGEST,
   "notes-draft:v1:device", "note-origins:v1:device", "notes-audio-deletions:v1:device");
  List<String> refused = List.of("cloud:production", "cloud:staging", "local-agent-provider:v1", "cloud-delegation:v1:" + DIGEST,
   "device:" + DIGEST, "sms-send-ledger:v1:device", "action-journal:v1:alpha-phone:index", "native-delete-journal:v1",
   "gmail-background:v1", "connected-read-cache:v1:" + DIGEST, "sms-draft:v1:thread:0", "assistant-draft:v1:short", "notes-records:v1:device");
  assertEquals(drafts, matched(AlphaEarlier.PAGE_SLOTS, drafts));
  assertEquals(List.of(), matched(AlphaEarlier.PAGE_SLOTS, refused));
 }

 @Test public void onlyThePhonesJournalsAreMovedWhenRead() {
  List<String> journals = List.of("action-journal:v1:alpha-phone:index", "action-journal:v1:alpha-phone:entry:1", "sms-send-ledger:v1:device",
   "alpha-sms-operation:v1:" + DIGEST, "workflow-notice-delivery:v1", "workflow-approval-notices:v1", "workflow-notice-taps:v1",
   "workflow-notice-owner:v1");
  List<String> others = List.of("device:" + DIGEST, "device-execution:v1", "native-delete-journal:v1", "alpha-sms-operation:claim:v1:" + DIGEST,
   "cloud:production", "sms-draft:v1:new");
  assertEquals(journals, matched(AlphaEarlier.JOURNALS, journals));
  assertEquals(List.of(), matched(AlphaEarlier.JOURNALS, others));
 }
}
