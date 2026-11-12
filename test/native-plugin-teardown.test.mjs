// Source-shape guard (class S). It shows nothing about Android's behaviour.
//
// Capacitor can deliver a plugin call the page made just before the activity was destroyed after
// handleOnDestroy has run. A plugin that hands that call to a worker it has already stopped gets a
// RejectedExecutionException on Capacitor's bridge thread, and Capacitor rethrows it: the process
// dies. Round 8 saw this once on the API 36 emulator (AlphaDevicePlugin.crashLog) and fixed that
// plugin; this guard covers every Java source the app ships.
//
// Rule: work is handed to an executor only where a stopped executor is answered, not thrown. That
// means the hand-off goes through PluginWorkers.submit, or sits in a try block that catches
// RejectedExecutionException (or a wider type) with no lambda or anonymous class body between the
// two, because code in such a body runs later, outside that try.
import assert from "node:assert/strict";
import test from "node:test";

test("an attachments instance's teardown removes only its own viewer copies", async () => {
  // Main surface and assistant each register AlphaMailAttachments over one cache folder.
  const { nativeSource, fixture, runJvm } = await import("./fixtures/jvm-tools.mjs");
  assert.match(runJvm([nativeSource("ReviewedCopies.java"), fixture("ReviewedCopiesTest.java")], "ai.alphacompute.alphaphone.ReviewedCopiesTest"), /^PASS reviewed copies/);
});
