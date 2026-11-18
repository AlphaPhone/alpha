package ai.alphacompute.alphaphone;

import android.os.SystemClock;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.json.JSONObject;
import java.util.UUID;
import static org.junit.Assert.*;

/** Executes the bundled React renderer in the real Android WebView; no mocked bridge. */
@RunWith(AndroidJUnit4.class)
public class FlowInstrumentedTest {
 private String eval(String js) throws Exception {
  return NotesSecureFixture.evaluate(js);
 }
 private void waitFor(String condition) throws Exception {
  for (int i=0;i<100;i++) { if ("true".equals(eval("Boolean("+condition+")"))) return; SystemClock.sleep(100); }
  fail("Rendered condition did not become true: "+condition+"; navigation="+eval("JSON.stringify(window.__alphaTestNavigation||null)")+"; body="+eval("document.body.innerText"));
 }
 private void ready() throws Exception {
  waitFor("document.querySelector('[data-screen]') && document.documentElement.dataset.activeView");
 }
 private void navigate(String view) throws Exception {
  eval(AppNavigation.request(view));
  waitFor(AppNavigation.selected(view)+" && window.__alphaTestNavigation?.status==='complete'");
 }
 private void input(String selector, String value) throws Exception {
  waitFor("document.querySelector("+JSONObject.quote(selector)+")");
  // Native setter plus bubbling input exercises React's normal controlled-field path.
  eval("(()=>{const e=document.querySelector("+JSONObject.quote(selector)+");const p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,"+JSONObject.quote(value)+");e.dispatchEvent(new Event('input',{bubbles:true}));})()");
  waitFor("document.querySelector("+JSONObject.quote(selector)+").value==="+JSONObject.quote(value));
 }
 private void label(String label) throws Exception {
  String target="[...document.querySelectorAll('[data-screen] button')].find(e=>e.getAttribute('aria-label')==="+JSONObject.quote(label)+")";
  waitFor(target); eval("("+target+").click()");
 }
 private String saved(String title) {
  return "__notesEnvelope.records.find(n=>n.title==="+JSONObject.quote(title)+")";
 }
 @Test public void allPrototypeAppsAndNotesSurviveRealActivityLifecycle() throws Exception {
  String title="Flow test "+UUID.randomUUID();
  // This is the granted-camera navigation/lifecycle fixture. The separate permission
  // campaign proves denial and retry; an unanswered OS prompt would keep recreation paused.
  androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().getUiAutomation().grantRuntimePermission(
   androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().getTargetContext().getPackageName(),android.Manifest.permission.CAMERA);
  try(BoundedActivityScenario<MainActivity> scenario=BoundedActivityScenario.launch(MainActivity.class)) {
   ready();
   Throwable primaryFailure=null;
   try {
    String[] views={"Inbox","Calendar","Browser","Camera","Photos","Maps","Notes","Files","Workflows","Settings"};
    for(String view:views) {
     navigate(view);
     assertEquals("Prototype app surface must remain mounted: "+view,"true",eval("!!document.querySelector('[data-screen]')"));
    }
    navigate("Notes"); label("New note");
    input("input[aria-label='Title']",title);
    input("textarea[aria-label='Note']","Original note");
    waitFor("("+saved(title)+")?.body==='Original note'");
    input("textarea[aria-label='Note']","Edited note");
    label("Back to notes"); label("Open "+title);
    waitFor("document.querySelector('textarea[aria-label=Note]')?.value==='Edited note'");
    scenario.recreate(); ready(); navigate("Notes"); label("Open "+title);
    waitFor("document.querySelector('textarea[aria-label=Note]')?.value==='Edited note'");
    label("Delete note"); waitFor("!("+saved(title)+")");
   } catch(Exception|AssertionError failure) {primaryFailure=failure;throw failure;} finally {
    try { NotesSecureFixture.replaceRecords("records=>records.filter(n=>n.title!=="+JSONObject.quote(title)+")"); } catch(Exception|AssertionError cleanup) {if(primaryFailure!=null)primaryFailure.addSuppressed(cleanup);else throw cleanup;}
   }
  }
 }
}
