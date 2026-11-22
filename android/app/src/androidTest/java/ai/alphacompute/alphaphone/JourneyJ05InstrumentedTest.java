package ai.alphacompute.alphaphone;

import androidx.test.platform.app.InstrumentationRegistry;
import java.util.UUID;
import org.json.JSONObject;
import org.junit.Assume;
import org.junit.Test;

/**
 * Journey J05 composed in one app process on a flag-off build: a page in the native browser -> a
 * typed question in the composer -> Send with no agent connected (nothing is dispatched and the
 * draft is kept) -> a note whose web source is that same page, stored in the encrypted Notes store,
 * survives a recreation and reopens that address.
 *
 * The page is served from memory by BrowserPageTextInstrumentedTest's fixture; no public host is
 * contacted. The agent's answer and the "Review summary note" save that follows it are not covered:
 * a flag-off build on an emulator has no connected agent, so the note is stored in the shape that
 * save writes. Emulator evidence for the native boundary only; not a real page, agent or device.
 *
 * Preconditions this emulator does not meet, so the method skips with the reason: the WebView provider
 * must support isolated-world injection (the emulator's WebView 133 does not; no page text can be
 * read), and since P-43 a signed-out flag-off phone opens a sign-in dialog that cannot be
 * dismissed and withdraws the native page. On a signed-in phone with a packaged resident agent, Send
 * reaches that agent, so the "nothing is dispatched" step needs re-scoping before that run.
 *
 *   bun run test:android:instrumentation -- --owned-emulator --avd NAME --serial emulator-NNNN --classes JourneyJ05
 */
public final class JourneyJ05InstrumentedTest {
 @Test public void pageTurnReachesSendAndItsSourceNoteReopensThePage() throws Exception {
  Assume.assumeTrue("Explicit J05 journey campaign", "1".equals(InstrumentationRegistry.getArguments().getString("journeyJ05")));
  BrowserPageTextInstrumentedTest.assumeIsolatedReading();
  AppNavigation.assumeNoRequiredSignIn("J05 (page turn to note)");
  BrowserPageTextInstrumentedTest steps = new BrowserPageTextInstrumentedTest();
  String page = BrowserPageTextInstrumentedTest.BASE + "/journey-" + UUID.randomUUID().toString().substring(0, 8), note = "journey-j05-" + UUID.randomUUID();
  try (BoundedActivityScenario<MainActivity> scenario = BoundedActivityScenario.launch(MainActivity.class)) {
   BrowserPageTextInstrumentedTest.Pages pages = null; Throwable primary = null;
   try {
    pages = steps.openBrowser();
    String question = steps.sendOnPageWithoutInference(pages, page);
    // Send dispatched nothing: neither the page text nor the question left through any native call.
    org.junit.Assert.assertEquals(0, steps.leaks(question).length());
    org.junit.Assert.assertEquals(0, steps.leaks(BrowserPageTextInstrumentedTest.ARTICLE).length());
    steps.cleanup(pages, null); pages = null;
    // The same page, as the summary note's web source.
    steps.sourceNoteSurvivesRecreationAndReopens(scenario, note, page);
   } catch (Exception | AssertionError failure) { primary = failure; throw failure; } finally {
    try {
     if (pages != null) steps.cleanup(pages, primary);
     steps.restoreNativeCalls();
     NotesSecureFixture.replaceRecords("records=>records.filter(n=>n.id!==" + JSONObject.quote(note) + ")");
    } catch (Exception | AssertionError failure) { if (primary != null) primary.addSuppressed(failure); else throw failure; }
   }
  }
 }
}
