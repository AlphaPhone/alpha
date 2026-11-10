package ai.elizaresearch.alphaphone;

import java.io.IOException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;

/**
 * Host-JVM checks of small native policies: one renderer death counted once across activities, the
 * single deletion-window comparison, per-bridge SMS send listeners, coalesced SMS reconciliation and
 * the SMS journal's separate retired-state storage. Not Android evidence.
 */
public final class NativeRestPoliciesTest {
 private static void check(boolean value, String message) { if (!value) throw new AssertionError(message); }
 private static void refused(Runnable action, String message) { try { action.run(); } catch (RuntimeException expected) { return; } throw new AssertionError(message); }

 /** In-memory storage that counts writes, logs their order and can fail on demand. */
 private static final class Memory implements SmsSendJournal.Storage {
  final String name; final List<String> log; String value; int writes; boolean failing;
  Memory(String name, List<String> log) { this.name = name; this.log = log; }
  public String read() { return value; }
  public void write(String next) throws IOException { if (failing) throw new IOException("fixture"); value = next; writes++; log.add(name); }
 }

 private static void renderer() {
  final RendererRecoveryBudget.Action NOW = RendererRecoveryBudget.Action.RECREATE_NOW, LATER = RendererRecoveryBudget.Action.RECREATE_AFTER_BACKOFF, ESCAPE = RendererRecoveryBudget.Action.SHOW_ESCAPE;
  // The launcher surface (HOME) and the assistant surface share the renderer: both report each death.
  RendererRecoveryBudget budget = new RendererRecoveryBudget();
  long t = 10_000L;
  for (int death = 1; death <= 3; death++) {
   long launcher = budget.deaths(), assistant = budget.deaths();
   check(budget.onLoss(t + death, true, launcher) == NOW, "death " + death + " recreates the launcher at once");
   check(budget.deaths() == death, "the first report counts the death");
   check(budget.onLoss(t + death, false, assistant) == NOW, "the assistant's report of the same death recreates it at once");
   check(budget.deaths() == death, "death " + death + " is counted once, not once per activity");
  }
  // Only the fourth death in the window is past the budget; with double counting the second was.
  long launcher = budget.deaths(), assistant = budget.deaths();
  check(budget.onLoss(t + 4, false, assistant) == LATER, "the fourth death backs the assistant off");
  check(budget.onLoss(t + 4, true, launcher) == ESCAPE, "and the same death shows the launcher's escape view from its own HOME flag");
  check(budget.deaths() == 4, "four deaths, four counts");
  // The reports can arrive in either order, and after the first activity was already recreated.
  RendererRecoveryBudget order = new RendererRecoveryBudget();
  long first = order.deaths(), second = order.deaths();
  check(order.onLoss(1, false, second) == NOW && order.deaths() == 1, "the assistant may report first");
  long recreated = order.deaths();
  check(order.onLoss(2, true, first) == NOW && order.deaths() == 1, "the launcher's late report of that death spends nothing");
  check(order.onLoss(3, false, recreated) == NOW && order.deaths() == 2, "a WebView created after the death counts its own loss");
  // A lone activity: every loss is its own death, exactly as onLoss(now, home).
  RendererRecoveryBudget alone = new RendererRecoveryBudget();
  for (int loss = 1; loss <= 3; loss++) check(alone.onLoss(loss, true, alone.deaths()) == NOW, "a lone activity recovers three times");
  check(alone.onLoss(4, true, alone.deaths()) == ESCAPE, "then reaches the escape view");
 }

 private static void deadline() {
  DeletionDeadline d = new DeletionDeadline("boot:1", 100, 100000);
  long[] clocks = { 0, 99, 100, 10099, 10100, 20000 };
  for (String boot : new String[] { "boot:1", "boot:2" }) for (long elapsed : clocks)
   check(d.state(boot, elapsed) == DeletionDeadline.state(d.continuity, d.createdElapsed, d.expiresElapsed, boot, elapsed), "stored and live deadlines agree at " + boot + " " + elapsed);
  check(DeletionDeadline.state("boot:1", 100, 10100, "boot:1", 10099) == DeletionDeadline.State.OPEN, "open until expiry");
  check(DeletionDeadline.state("boot:1", 100, 10100, "boot:1", 10100) == DeletionDeadline.State.EXPIRED, "expired at the exact boundary");
  check(DeletionDeadline.state("boot:1", 100, 10100, "boot:1", 99) == DeletionDeadline.State.CLOCK_CHANGED, "a clock before creation is a changed clock");
  check(DeletionDeadline.state("boot:1", 100, 10100, "boot:2", 20000) == DeletionDeadline.State.CLOCK_CHANGED, "a reboot is a changed clock");
  check(DeletionDeadline.state(null, 100, 10100, "boot:1", 200) == DeletionDeadline.State.CLOCK_CHANGED, "a row without continuity never expires into a delete");
  check("open".equals(DeletionDeadline.window(DeletionDeadline.State.OPEN)) && "expired".equals(DeletionDeadline.window(DeletionDeadline.State.EXPIRED))
   && "clock-changed".equals(DeletionDeadline.window(DeletionDeadline.State.CLOCK_CHANGED)), "window names");
 }

 private static void listeners() {
  SmsSendListeners all = new SmsSendListeners();
  List<String> launcher = new ArrayList<>(), assistant = new ArrayList<>();
  SmsSendListeners.Listener first = id -> launcher.add(id), second = id -> assistant.add(id);
  all.add(first);
  all.updated("a");
  // The assistant's bridge loads: the launcher keeps its subscription.
  all.add(second);
  all.updated("b");
  check(launcher.equals(List.of("a", "b")) && assistant.equals(List.of("b")), "both live bridges are told");
  // The assistant closes: only its own listener goes.
  all.remove(second);
  all.updated("c");
  check(launcher.equals(List.of("a", "b", "c")) && assistant.equals(List.of("b")), "closing one bridge leaves the other subscribed");
  check(all.size() == 1, "one listener left");
  all.add(first);
  check(all.size() == 1, "a listener registers once");
  all.remove(second);
  check(all.size() == 1, "removing an absent listener changes nothing");
  SmsSendListeners.Listener broken = id -> { throw new IllegalStateException("closing"); };
  all.remove(first); all.add(broken); all.add(first);
  all.updated("d");
  check(launcher.get(launcher.size() - 1).equals("d"), "a listener that throws does not stop the notice");
 }

 private static void reconcileBatch() {
  SmsReconcileBatch batch = new SmsReconcileBatch();
  check(batch.request() && !batch.request() && !batch.request(), "one reconcile waits at a time");
  batch.begin();
  check(batch.request(), "evidence recorded after a reconcile started queues the next");
  batch.begin();
  // A 5 recipient x 10 part send: 100 callbacks already queued on the single worker.
  ArrayDeque<Runnable> worker = new ArrayDeque<>();
  int[] recorded = { 0 }, reconciles = { 0 }, seen = { 0 };
  Runnable callback = () -> { recorded[0]++; if (batch.request()) worker.add(() -> { batch.begin(); reconciles[0]++; seen[0] = recorded[0]; }); };
  for (int i = 0; i < 100; i++) worker.add(callback);
  while (!worker.isEmpty()) worker.poll().run();
  check(reconciles[0] == 1, "a queued burst is reconciled once, not " + reconciles[0] + " times");
  check(seen[0] == 100, "and that reconcile sees every callback of the burst");
  // Callbacks that trickle in one by one are each followed by a reconcile.
  for (int i = 0; i < 5; i++) { worker.add(callback); while (!worker.isEmpty()) worker.poll().run(); check(seen[0] == recorded[0], "no evidence is left unreconciled"); }
  check(reconciles[0] == 6, "one reconcile per separate callback");
 }

 private static void journal() throws Exception {
  String[] one = { "+15555550100" };
  List<String> log = new ArrayList<>();
  Memory records = new Memory("records", log), retired = new Memory("retired", log);
  SmsSendJournal journal = new SmsSendJournal(records, retired);
  journal.beginDispatch("send-0", one, "hello", 1, new int[] { 3 }, 1000, 7);
  journal.endDispatch("send-0", true);
  for (int part = 0; part < 3; part++) { journal.sentResult("send-0", part, true); journal.deliveryReported("send-0", part); }
  check(records.writes == 8, "each change writes the records");
  check(retired.writes == 0 && retired.value == null, "callbacks never rewrite retired state");
  check(!records.value.contains("x1|"), "no retired generation is relied on before any exists");
  // Fill the journal: the bound drops the oldest closed record into a tombstone.
  for (int i = 1; i < SmsSendJournal.MAX_RECORDS; i++) journal.decide("fill-" + i, one, "x", 1, "cancelled", 2000 + i, 7);
  check(retired.writes == 0, "nothing retired while the journal has room");
  log.clear();
  journal.decide("over-1", one, "x", 1, "cancelled", 5000, 7);
  check(log.equals(List.of("retired", "records")), "retired state is written first, then the records without the dropped one: " + log);
  check(retired.value.startsWith("g1|1\n") && retired.value.contains("t1|"), "the tombstone lives in the retired storage");
  check(records.value.startsWith("x1|1\n") && !records.value.contains("t1|") && !records.value.contains("w1|"), "the records name the generation they rely on and hold no retired lines");
  int before = retired.writes;
  journal.beginDispatch("send-1", one, "again", 1, new int[] { 1 }, 6000, 7);
  int afterCreate = retired.writes;
  journal.endDispatch("send-1", true); journal.sentResult("send-1", 0, true); journal.deliveryReported("send-1", 0);
  check(retired.writes == afterCreate && afterCreate <= before + 1, "evidence for a send leaves the retired storage alone");
  // A restart reads both parts; the dropped IDs stay refused.
  // The oldest closed record went first; the send still waiting for delivery evidence was kept.
  String cancelledBinding = SmsSendJournal.sha256(SmsSendJournal.bindingText(one, "x", 1));
  check(retired.value.contains("t1|fill-1|") && journal.get("send-0") != null, "the oldest closed record was dropped");
  SmsSendJournal reopened = new SmsSendJournal(records, retired);
  refused(() -> reopened.existing("fill-1", cancelledBinding), "a dropped ID is refused after a restart");
  check(reopened.get("send-1") != null && "sent".equals(reopened.get("send-1").status()), "records survive the restart");
  // Losing the retired storage is an error, never an empty history.
  Memory lost = new Memory("lost", log);
  refused(() -> { try { new SmsSendJournal(records, lost); } catch (IOException e) { throw new IllegalStateException(e); } }, "records that rely on missing retired state do not load");
  Memory stale = new Memory("stale", log); stale.value = "g1|0\n";
  refused(() -> { try { new SmsSendJournal(records, stale); } catch (IOException e) { throw new IllegalStateException(e); } }, "an invalid retired generation does not load");
  refused(() -> { try { new SmsSendJournal(records); } catch (IOException e) { throw new IllegalStateException(e); } }, "split records do not load as a whole journal");

  // An interrupted save: the retired state landed, the records did not. Nothing is forgotten.
  Memory r2 = new Memory("records", log), t2 = new Memory("retired", log);
  SmsSendJournal cut = new SmsSendJournal(r2, t2);
  for (int i = 0; i < SmsSendJournal.MAX_RECORDS; i++) cut.decide("cut-" + i, one, "x", 1, "cancelled", 1000 + i, 7);
  r2.failing = true;
  refused(() -> { try { cut.decide("cut-over", one, "x", 1, "cancelled", 9000, 7); } catch (IOException e) { throw new IllegalStateException(e); } }, "the failed save is reported");
  r2.failing = false;
  check(t2.value != null && t2.value.contains("t1|cut-0|") && r2.value.contains("|cut-0|"), "the dropped ID is in both parts, never in neither");
  SmsSendJournal recovered = new SmsSendJournal(r2, t2);
  check(recovered.existing("cut-0", cancelledBinding) != null, "the record still reads back");
  refused(() -> { try { recovered.decide("cut-0", one, "x", 1, "cancelled", 9500, 7); } catch (IOException e) { throw new IllegalStateException(e); } }, "and its ID is never used again");
  check(recovered.get("cut-over") == null, "the record that was never durable is not reported");

  // A journal written whole by an earlier build is read, then moved on the next save.
  Memory whole = new Memory("whole", log);
  SmsSendJournal earlier = new SmsSendJournal(whole);
  for (int i = 0; i <= SmsSendJournal.MAX_RECORDS; i++) earlier.decide("old-" + i, one, "x", 1, "cancelled", 1000 + i, 7);
  check(whole.value.contains("t1|old-0|"), "the earlier layout keeps tombstones beside the records");
  Memory moved = new Memory("moved", log);
  SmsSendJournal migrated = new SmsSendJournal(whole, moved);
  refused(() -> migrated.existing("old-0", cancelledBinding), "an earlier tombstone is honoured before it moves");
  check(moved.writes == 0, "loading alone writes nothing");
  migrated.beginDispatch("new-1", one, "fresh", 1, new int[] { 1 }, 9000, 7);
  check(moved.value.contains("t1|old-0|") && !whole.value.contains("t1|") && whole.value.startsWith("x1|"), "the next save moves the retired state out of the records");
  refused(() -> { try { new SmsSendJournal(whole, moved).existing("old-0", cancelledBinding); } catch (IOException e) { throw new IllegalStateException(e); } }, "and the moved tombstone is still honoured");

  // Compaction: the 128 KiB filter is written with the retired state only, never with the records.
  Memory r3 = new Memory("records", log), t3 = new Memory("retired", log);
  SmsSendJournal many = new SmsSendJournal(r3, t3);
  int total = SmsSendJournal.MAX_RECORDS + SmsSendJournal.MAX_TOMBSTONES + 5;
  for (int i = 0; i < total; i++) many.decide("many-" + i, one, "x", 1, "cancelled", 1000 + i, 7);
  check(many.retiredCount() > 0 && t3.value.contains("r1|"), "old tombstones are folded into the filter");
  check(!r3.value.contains("r1|") && r3.value.length() < 200_000, "the records stay small: " + r3.value.length());
  SmsSendJournal filtered = new SmsSendJournal(r3, t3);
  check(filtered.isRetired("many-0") && filtered.retiredCount() == many.retiredCount(), "the filter survives a restart");
  refused(() -> filtered.existing("many-0", cancelledBinding), "a compacted ID is refused");
 }

 public static void main(String[] args) throws Exception {
  renderer();
  deadline();
  listeners();
  reconcileBatch();
  journal();
  System.out.println("PASS native rest policies");
 }
}
