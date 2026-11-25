// spec/app/platform/index.md, "Story: Reach the phone's native capabilities"; spec/app/shell/index.md, "Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it"
package ai.alphacompute.alphaphone;

import android.app.ActivityManager;
import android.app.role.RoleManager;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.ViewGroup;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.CapConfig;
import com.getcapacitor.WebViewListener;
import java.lang.ref.WeakReference;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

public class MainActivity extends BridgeActivity {
 private static final String BACK = "window.dispatchEvent(new Event('alpha-back'))";
 private static final String HOME = "window.dispatchEvent(new Event('launcher-home'))";
 private static final String TAG = "AlphaLauncher";
 private static final String HOME_TASK = "alpha.homeTask";
 private static final String FRONT_START = "alpha.frontStart";
 private static final String FRONT_TOKEN = UUID.randomUUID().toString();
 private static final int MAX_UNANSWERED_FRONT_STARTS = 3;
 private static WeakReference<MainActivity> livePage = new WeakReference<>(null);
 private static boolean handoffUnavailable;
 private static int unansweredFrontStarts;
 private boolean homeTask;
 private boolean handingOff;
 private boolean telephonyAdmitted;
 private volatile boolean resumed;
 private volatile boolean windowFocused;
 private volatile boolean tornDown;
 private final AtomicLong composerVisit = new AtomicLong();
 private InsetsState insets;

 private record InsetsState(int top, int bottom, boolean keyboard) {
  void publish(WebView page) {
   page.evaluateJavascript("(() => { const root = document.documentElement; if (!root) return;"
     + " const detail = { top:" + top + ", bottom:" + bottom + ", keyboard:" + keyboard + " };"
     + " root.style.setProperty('--alpha-native-inset-top', detail.top + 'px');"
     + " root.style.setProperty('--alpha-native-inset-bottom', detail.bottom + 'px');"
     + " root.dataset.alphaNativeKeyboard = String(detail.keyboard);"
     + " window.dispatchEvent(new CustomEvent('alpha-insets', { detail })); })()", null);
  }
 }

 @Override public void onCreate(Bundle state) {
  SplashScreen.installSplashScreen(this);
  HostedDigestDelivery.get().capture(getIntent());
  MainActivity live = livePage.get();
  boolean frontStart = isFrontStart(getIntent());
  if (live != null && live != this && !live.isFinishing() && !live.isDestroyed()
      && (!handoffUnavailable || frontStart)) {
   handingOff = true;
   super.onCreate(null);
   discardUnusedWebView();
   handoffTo(live, frontStart);
   return;
  }
  homeTask = state == null ? isHomeTaskStart(getIntent()) : state.getBoolean(HOME_TASK, isHomeTaskStart(getIntent()));
  if (isHome(getIntent())) SmsNoticeOpenRequest.clear();
  registerPlugin(ai.eliza.os.agent.AgentPlugin.class);
  registerPlugin(ai.eliza.plugins.signin.ElizaSignInPlugin.class);
  registerPlugin(ai.eliza.plugins.signin.ElizaCloudPlugin.class);
  registerPlugin(ai.eliza.plugins.securestore.SecureStorePlugin.class);
  registerPlugin(AlphaSystemPlugin.class);
  registerPlugin(AlphaFilesPlugin.class);
  registerPlugin(AlphaSelectedDocumentsPlugin.class);
  registerPlugin(AlphaNotesPlugin.class);
  registerPlugin(AlphaAssistantDraftPlugin.class);
  registerPlugin(AlphaNoteDocumentsPlugin.class);
  AlphaNoteRecordingService.offerFromIntent(this, getIntent());
  registerPlugin(ai.eliza.plugins.camera.CameraPlugin.class);
  registerPlugin(AlphaPhotosPlugin.class);
  registerPlugin(AlphaPhotoLibraryPlugin.class);
  registerPlugin(AlphaMediaEnrollmentPlugin.class);
  registerPlugin(AlphaScanPlugin.class);
  registerPlugin(ai.eliza.plugins.location.LocationPlugin.class);
  registerPlugin(ai.eliza.plugins.wifi.WiFiPlugin.class);
  registerPlugin(ai.eliza.plugins.passwords.PasswordsPlugin.class);
  registerPlugin(AlphaBrowserPlugin.class);
  registerPlugin(AlphaCalendarPlugin.class);
  registerPlugin(AlphaNotificationsPlugin.class);
  registerPlugin(AlphaHostedDigestDeliveryPlugin.class);
  registerPlugin(AlphaPhotosPermissionsPlugin.class);
  registerPlugin(AlphaResetPlugin.class);
  registerPlugin(AlphaActionJournalPlugin.class);
  registerPlugin(AlphaDevicePlugin.class);
  registerPlugin(AlphaCarrierSetupPlugin.class);
  registerPlugin(AlphaCallStatePlugin.class);
  registerPlugin(AlphaLocalSpeechPlugin.class);
  registerPlugin(AlphaCloudSpeechPlugin.class);
  boolean image = AlphaImageCapability.verified(this);
  telephonyAdmitted = image;
  if (image) {
   registerPlugin(AlphaTelephonyPlugin.class);
   registerPlugin(AlphaContactsPlugin.class);
  }
  AlphaLauncher.register(this, image);
  super.onCreate(state);
  if (getBridge() == null) return;
  WebView page = getBridge().getWebView();
  if (page == null) return;
  livePage = new WeakReference<>(this);
  WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
  page.setFilterTouchesWhenObscured(true);
  page.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(page, false);
  AlphaDevicePlugin.applyTextScale(this);
  followWindowInsets();
  getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
   @Override public void handleOnBackPressed() {
    var bridge = getBridge();
    WebView view = bridge == null ? null : bridge.getWebView();
    if (view == null) return;
    boolean staysHome = holdsHomeRole();
    String script = "(() => { if (document.documentElement?.dataset.alphaCanGoBack === 'true') { "
      + BACK + "; return true; } " + (staysHome ? HOME + "; return true;" : "return false;") + " })()";
    view.evaluateJavascript(script, handled -> {
     if (!staysHome && !"true".equals(handled) && !isFinishing() && !isDestroyed()) moveTaskToBack(true);
    });
   }
  });
 }

 private void followWindowInsets() {
  var bridge = getBridge();
  if (bridge == null) return;
  bridge.addWebViewListener(new WebViewListener() {
   @Override public void onPageStarted(WebView page) { composerVisit.incrementAndGet(); }

   @Override public void onPageLoaded(WebView page) {
    if (insets != null) insets.publish(page);
   }
  });
  var decor = getWindow().getDecorView();
  ViewCompat.setOnApplyWindowInsetsListener(decor, (view, incoming) -> {
   var bars = incoming.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
   float density = getResources().getDisplayMetrics().density;
   var measured = new InsetsState(Math.round(bars.top / density), Math.round(bars.bottom / density),
     incoming.isVisible(WindowInsetsCompat.Type.ime()));
   if (!measured.equals(insets)) {
    insets = measured;
    var currentBridge = getBridge();
    WebView webView = currentBridge == null ? null : currentBridge.getWebView();
    if (webView != null) measured.publish(webView);
   }
   return ViewCompat.onApplyWindowInsets(view, incoming);
  });
  ViewCompat.requestApplyInsets(decor);
 }

 @Override protected void load() {
  if (handingOff) return;
  WebView page = findViewById(com.getcapacitor.android.R.id.webview);
  if (page != null) page.setFilterTouchesWhenObscured(true);
  if (telephonyAdmitted && !isAssistantSurface()) {
   if (config == null) config = CapConfig.loadDefault(this);
   if (page != null && config.getServerUrl() == null) {
    AlphaMessagesComposerPort.install(this, page);
   }
  }
  super.load();
 }

 @Override public void onSaveInstanceState(Bundle state) {
  super.onSaveInstanceState(state);
  state.putBoolean(HOME_TASK, homeTask);
 }

 @Override public void onResume() {
  composerVisit.incrementAndGet();
  super.onResume();
  resumed = true;
  windowFocused = hasWindowFocus();
  HostedDigestDelivery.get().refreshNotices();
  if (livePage.get() == this) unansweredFrontStarts = 0;
 }

 @Override public void onPause() {
  resumed = false;
  composerVisit.incrementAndGet();
  super.onPause();
 }

 @Override public void onDestroy() {
  resumed = false;
  windowFocused = false;
  tornDown = true;
  composerVisit.incrementAndGet();
  if (livePage.get() == this) livePage.clear();
  super.onDestroy();
 }

 @Override public void onWindowFocusChanged(boolean focused) {
  windowFocused = focused;
  composerVisit.incrementAndGet();
  super.onWindowFocusChanged(focused);
  var bridge = getBridge();
  WebView view = bridge == null ? null : bridge.getWebView();
  if (focused && view != null) {
   view.evaluateJavascript("window.dispatchEvent(new Event('focus'))", null);
  }
 }

 boolean isForegroundFocused() {
  return resumed && windowFocused && !tornDown && !isFinishing() && !isDestroyed();
 }

 boolean isResumedActive() {
  return resumed && !tornDown && !isFinishing() && !isDestroyed();
 }

 private boolean volumeShutter;

 boolean isAssistantSurface() { return false; }
 long composerVisit() { return composerVisit.get(); }

 void setVolumeShutter(boolean enabled) { volumeShutter = enabled; }

 @Override public void onStop() {
  volumeShutter = false;
  super.onStop();
 }

 @Override public boolean dispatchKeyEvent(android.view.KeyEvent event) {
  int key = event.getKeyCode();
  var bridge = getBridge();
  WebView view = bridge == null ? null : bridge.getWebView();
  if (volumeShutter && (key == android.view.KeyEvent.KEYCODE_VOLUME_UP || key == android.view.KeyEvent.KEYCODE_VOLUME_DOWN) && view != null) {
   if (event.getAction() == android.view.KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0)
    view.evaluateJavascript("window.dispatchEvent(new Event('alpha:volume-shutter'))", null);
   return true;
  }
  return super.dispatchKeyEvent(event);
 }

 @Override protected void onNewIntent(Intent intent) {
  HostedDigestDelivery.get().capture(intent);
  if (isFrontStart(intent)) {
   if (!handingOff) unansweredFrontStarts = 0;
   return;
  }
  boolean home = isHome(intent);
  if (home) {
   composerVisit.incrementAndGet();
   SmsNoticeOpenRequest.clear();
  }
  super.onNewIntent(intent);
  var bridge = getBridge();
  WebView view = bridge == null ? null : bridge.getWebView();
  if (view != null && home) view.evaluateJavascript(HOME, null);
 }

 private static boolean isHome(Intent intent) {
  return intent != null && Intent.ACTION_MAIN.equals(intent.getAction()) && intent.hasCategory(Intent.CATEGORY_HOME);
 }

 private static boolean isHomeTaskStart(Intent intent) {
  return isHome(intent) && intent.getCategories().size() == 1 && intent.getData() == null && intent.getType() == null;
 }

 private boolean holdsHomeRole() {
  try {
   RoleManager roles = getSystemService(RoleManager.class);
   return roles != null && roles.isRoleAvailable(RoleManager.ROLE_HOME) ? roles.isRoleHeld(RoleManager.ROLE_HOME) : homeTask;
  } catch (RuntimeException unavailable) {
   Log.w(TAG, "HOME role unavailable", unavailable);
   return homeTask;
  }
 }

 private static boolean isFrontStart(Intent intent) {
  if (intent == null) return false;
  try {
   return FRONT_TOKEN.equals(intent.getStringExtra(FRONT_START));
  } catch (RuntimeException foreignExtras) {
   return false;
  }
 }

 private void discardUnusedWebView() {
  WebView unused = findViewById(com.getcapacitor.android.R.id.webview);
  if (unused == null) return;
  if (unused.getParent() instanceof ViewGroup parent) parent.removeView(unused);
  unused.destroy();
 }

 private void handoffTo(MainActivity live, boolean frontStart) {
  Intent request = getIntent();
  boolean sameTask = getTaskId() == live.getTaskId();
  if (frontStart) {
   handoffUnavailable = true;
  } else {
   if (request != null) live.onNewIntent(new Intent(request));
   if (!sameTask && (!bringToFront(live) || ++unansweredFrontStarts >= MAX_UNANSWERED_FRONT_STARTS)) {
    handoffUnavailable = true;
   }
  }
  if (sameTask || isHome(request)) finish();
  else finishAndRemoveTask();
  overridePendingTransition(0, 0);
 }

 private boolean bringToFront(MainActivity live) {
  if (!live.homeTask && moveOwnTaskToFront(live.getTaskId())) return true;
  Intent front = live.homeTask
    ? new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).setPackage(getPackageName())
    : new Intent(this, MainActivity.class);
  front.putExtra(FRONT_START, FRONT_TOKEN).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_ANIMATION);
  try {
   startActivity(front);
   return true;
  } catch (RuntimeException unavailable) {
   Log.w(TAG, "Live launcher task could not be started", unavailable);
   return false;
  }
 }

 private boolean moveOwnTaskToFront(int taskId) {
  try {
   ActivityManager manager = getSystemService(ActivityManager.class);
   if (manager == null || taskId == -1) return false;
   for (ActivityManager.AppTask task : manager.getAppTasks()) {
    if (task.getTaskInfo().taskId != taskId) continue;
    task.moveToFront();
    return true;
   }
  } catch (RuntimeException unavailable) {
   Log.w(TAG, "Live launcher task could not be raised", unavailable);
  }
  return false;
 }
}
