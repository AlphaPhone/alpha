// spec/app/platform/index.md, "Story: Reach the phone's native capabilities"; spec/app/shell/index.md, "Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it"
package ai.alphacompute.alphaphone;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
 private static final String CAN_GO_BACK = "document.documentElement && document.documentElement.dataset.alphaCanGoBack === 'true'";
 private static final String BACK = "window.dispatchEvent(new Event('alpha-back'))";
 private static final String HOME = "window.dispatchEvent(new Event('launcher-home'))";

 @Override public void onCreate(Bundle state) {
  SplashScreen.installSplashScreen(this);
  registerPlugin(ai.eliza.os.agent.AgentPlugin.class);
  registerPlugin(ai.eliza.plugins.signin.ElizaSignInPlugin.class);
  registerPlugin(ai.eliza.plugins.signin.ElizaCloudPlugin.class);
  registerPlugin(ai.eliza.plugins.securestore.SecureStorePlugin.class);
  registerPlugin(ai.eliza.plugins.system.SystemPlugin.class);
  registerPlugin(ai.eliza.plugins.filesystem.FilesPlugin.class);
  registerPlugin(ai.eliza.plugins.location.LocationPlugin.class);
  registerPlugin(ai.eliza.plugins.wifi.WiFiPlugin.class);
  registerPlugin(ai.eliza.plugins.passwords.PasswordsPlugin.class);
  registerPlugin(AlphaBrowserPlugin.class);
  registerPlugin(AlphaCalendarPlugin.class);
  registerPlugin(AlphaResetPlugin.class);
  registerPlugin(AlphaActionJournalPlugin.class);
  registerPlugin(AlphaDevicePlugin.class);
  registerPlugin(AlphaCarrierSetupPlugin.class);
  registerPlugin(AlphaCallStatePlugin.class);
  registerPlugin(AlphaCloudSpeechPlugin.class);
  boolean image = AlphaImageCapability.verified(this);
  if (image) registerPlugin(AlphaTelephonyPlugin.class);
  if (AlphaImageCapabilities.aospImage(this)) registerPlugin(ai.eliza.plugins.contacts.ContactsPlugin.class);
  AlphaLauncher.register(this, image);
  super.onCreate(state);
  if (getBridge() == null) return;
  WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
  getBridge().getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(getBridge().getWebView(), false);
  getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
   @Override public void handleOnBackPressed() {
    if (getBridge() == null) return;
    WebView page = getBridge().getWebView();
    page.evaluateJavascript(CAN_GO_BACK, answer -> page.evaluateJavascript("true".equals(answer) ? BACK : HOME, null));
   }
  });
 }

 private boolean volumeShutter;

 boolean isAssistantSurface() { return false; }

 void setVolumeShutter(boolean enabled) { volumeShutter = enabled; }

 @Override public void onStop() {
  volumeShutter = false;
  super.onStop();
 }

 @Override public boolean dispatchKeyEvent(android.view.KeyEvent event) {
  int key = event.getKeyCode();
  if (volumeShutter && (key == android.view.KeyEvent.KEYCODE_VOLUME_UP || key == android.view.KeyEvent.KEYCODE_VOLUME_DOWN) && getBridge() != null) {
   if (event.getAction() == android.view.KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0)
    getBridge().getWebView().evaluateJavascript("window.dispatchEvent(new Event('alpha:volume-shutter'))", null);
   return true;
  }
  return super.dispatchKeyEvent(event);
 }

 @Override protected void onNewIntent(Intent intent) {
  super.onNewIntent(intent);
  if (getBridge() != null && intent != null && intent.hasCategory(Intent.CATEGORY_HOME)) getBridge().getWebView().evaluateJavascript(HOME, null);
 }
}
