package ai.alphacompute.alphaphone;

import ai.eliza.plugins.passwords.PasswordVaultAccess;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
import android.provider.Settings;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.inspector.WindowInspector;
import android.widget.EditText;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.runner.lifecycle.ActivityLifecycleMonitorRegistry;
import androidx.test.runner.lifecycle.Stage;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

/** Alpha's native password editor (PasswordEditor) over MainActivity, whose AlphaPasswordsPlugin
 * closes it when the activity stops. Synthetic UI grants only: real native views, the locked and
 * overlapping refusals, protected draft fields, and clearing on stop. Never opens a vault key and
 * changes no device setting. Ported from plugin-native-passwords' consumer-host test. */
@RunWith(AndroidJUnit4.class)
public final class PasswordEditorInstrumentedTest {
 private static void fields(View view, List<EditText> found) {
  if (view instanceof EditText) found.add((EditText) view);
  if (view instanceof ViewGroup) {
   ViewGroup group = (ViewGroup) view;
   for (int i = 0; i < group.getChildCount(); i++) fields(group.getChildAt(i), found);
  }
 }
 private static boolean mainIn(Stage stage) throws Exception {
  AtomicBoolean found = new AtomicBoolean();
  BoundedActivityScenario.main(() -> { for (Activity activity : ActivityLifecycleMonitorRegistry.getInstance().getActivitiesInStage(stage)) if (activity instanceof MainActivity) found.set(true); });
  return found.get();
 }

 @Test public void editorProtectsDraftsRejectsOverlapAndClearsOnStop() throws Exception {
  Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
  PasswordVaultAccess access = PasswordVaultAccess.get(context);
  AtomicInteger cancellations = new AtomicInteger();
  List<EditText> drafts = new ArrayList<>();
  try (BoundedActivityScenario<MainActivity> scenario = BoundedActivityScenario.launch(MainActivity.class)) {
   WebViewTestDriver.withActivity(MainActivity.class, activity -> {
    try {
     access.lock();
     PasswordEditor.Result result = new PasswordEditor.Result() {
      public void saved(String id, long revision) { fail("No save requested"); }
      public void cancelled() { cancellations.incrementAndGet(); }
     };
     try { PasswordEditor.open(activity, access, access.ticket(), result); fail("Locked editor admitted"); }
     catch (PasswordVaultGate.Locked expected) {}
     long ticket = access.begin(); assertTrue(access.complete(ticket, true));
     PasswordEditor.open(activity, access, ticket, result);
     try { PasswordEditor.open(activity, access, ticket, result); fail("Overlapping editor admitted"); }
     catch (PasswordEditor.Busy expected) {}
     assertTrue("The editor is a secret surface", PasswordSurfaces.visible());
     for (View root : WindowInspector.getGlobalWindowViews()) {
      List<EditText> candidate = new ArrayList<>(); fields(root, candidate);
      if (candidate.size() != 4) continue;
      WindowManager.LayoutParams layout = (WindowManager.LayoutParams) root.getLayoutParams();
      assertTrue((layout.flags & WindowManager.LayoutParams.FLAG_SECURE) != 0);
      drafts.addAll(candidate);
     }
     assertEquals(4, drafts.size());
     for (EditText draft : drafts) {
      assertFalse(draft.isSaveEnabled());
      assertFalse(draft.isSaveFromParentEnabled());
      assertTrue(draft.getFilterTouchesWhenObscured());
      assertEquals(View.IMPORTANT_FOR_AUTOFILL_NO, draft.getImportantForAutofill());
      draft.setText("synthetic-editor-canary");
     }
     EditText secret = drafts.get(3);
     assertEquals("Alpha's field label", activity.getString(R.string.alpha_passwords_editor_password), secret.getContentDescription().toString());
     assertTrue("Password remains masked after single-line configuration", secret.getTransformationMethod() instanceof android.text.method.PasswordTransformationMethod);
     secret.getText().replace(0, secret.length(), "x".repeat(16385));
     assertEquals("An oversize replacement never truncates or changes the original", "synthetic-editor-canary", secret.getText().toString());
     secret.selectAll();
     assertFalse("Secret copy is unavailable", secret.onTextContextMenuItem(android.R.id.copy));
     assertFalse("Secret cut is unavailable", secret.onTextContextMenuItem(android.R.id.cut));
    } catch (Exception failure) { throw new AssertionError(failure); }
   });
   // Runs after the field's own posted error.
   BoundedActivityScenario.main(() -> assertNotNull("Oversize edit shows an error", drafts.get(3).getError()));

   // Covering MainActivity stops it: the plugin closes the editor once and clears every draft.
   BoundedActivityScenario.main(() -> context.startActivity(new Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)));
   for (int i = 0; i < 100 && !mainIn(Stage.STOPPED); i++) SystemClock.sleep(100);
   assertTrue("MainActivity stopped", mainIn(Stage.STOPPED));
   assertEquals(1, cancellations.get());
   BoundedActivityScenario.main(() -> {
    for (EditText draft : drafts) assertEquals("", draft.getText().toString());
    assertFalse("No secret surface remains", PasswordSurfaces.visible());
   });
   BoundedActivityScenario.main(() -> context.startActivity(new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)));
   for (int i = 0; i < 100 && !mainIn(Stage.RESUMED); i++) SystemClock.sleep(100);
   assertTrue("MainActivity resumed", mainIn(Stage.RESUMED));
   assertEquals("Resuming does not reopen or cancel again", 1, cancellations.get());
  } finally { access.lock(); }
 }
}
