package ai.alphacompute.alphaphone;

import ai.alphacompute.alphaphone.browser.AlphaBrowserCopy;
import ai.alphacompute.alphaphone.browser.LinkHandoff;
import ai.alphacompute.alphaphone.browser.AlphaPageContext;
import ai.eliza.plugins.browsersurface.BrowserPageReading;
import ai.alphacompute.alphaphone.browser.AlphaBrowserDownloads;
import ai.alphacompute.alphaphone.browser.AlphaReviewedReading;
import ai.alphacompute.alphaphone.browser.AlphaSignInFields;
import ai.alphacompute.alphaphone.browser.HostRect;
import ai.alphacompute.alphaphone.browser.TabFrame;
import ai.alphacompute.alphaphone.browser.TabInputRouter;
import ai.alphacompute.alphaphone.browser.TabLayer;
import ai.alphacompute.alphaphone.browser.TabNavigation;
import ai.eliza.plugins.browsersurface.BrowserAutofillEligibility;
import ai.eliza.plugins.browsersurface.BrowserBlobCapture;
import ai.eliza.plugins.browsersurface.BrowserBookmarkStore;
import ai.eliza.plugins.browsersurface.BrowserExternalHandoff;
import ai.eliza.plugins.browsersurface.BrowserExternalLinkPolicy;
import ai.eliza.plugins.browsersurface.BrowserExternalPage;
import ai.eliza.plugins.browsersurface.BrowserFieldOrigin;
import ai.eliza.plugins.browsersurface.BrowserHttpAuthOrigin;
import ai.eliza.plugins.browsersurface.BrowserLoginFields;
import ai.eliza.plugins.browsersurface.BrowserReadingWorld;
import ai.eliza.plugins.browsersurface.BrowserSessionStore;
import ai.eliza.plugins.browsersurface.BrowserSitePrompt;
import ai.eliza.plugins.browsersurface.BrowserTabHostConfig;
import ai.eliza.plugins.browsersurface.BrowserWebOrigin;
import android.graphics.Bitmap;
import android.os.Build;
import androidx.annotation.RequiresApi;
import android.net.Uri;
import android.net.http.SslError;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewStructure;
import android.view.autofill.AutofillManager;
import android.view.autofill.AutofillValue;
import android.util.SparseArray;
import android.webkit.*;
import android.widget.FrameLayout;
import android.widget.TextView;
import androidx.webkit.ProfileStore;
import androidx.webkit.WebStorageCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import android.content.Intent;
import android.app.AlertDialog;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import java.util.*;

/**
 * Alpha's Browser: the native tab host behind the renderer's Browser app, a tab model of child
 * WebViews drawn above or below Alpha's WebView and presented one at a time at renderer-supplied
 * geometry. Alpha owns its native windows: the site permission, website sign-in and photo prompts,
 * the tab frame's loading and failure message, the file, share and other-browser choosers,
 * fullscreen video, the download review and list ({@link AlphaBrowserDownloads}) and the reviewed
 * page reading ({@link AlphaReviewedReading}). This is Alpha's fork of the shared
 * plugin-native-browser-surface tab host; the stores, profile rules, link, origin, download and
 * reading policies, attested login fields and blob capture stay shared at the reviewed pin.
 *
 * <p>Public navigation only. Child WebViews deliberately have no app JavaScript interface and are
 * never Alpha's Default profile. Normal tabs share one persistent browser-only profile (P-04), so
 * sign-ins, cookies and site storage survive tab close and app restart like a normal browser;
 * third-party cookies are accepted there only. Private tabs use ephemeral profiles that are purged
 * once no tab (for example their pop-up) still uses them, and again at the next start.
 *
 * <p>The host owns pop-ups (a tapped {@code target=_blank} or {@code window.open} becomes a tab in
 * the opener's profile), app links ({@code tel:}, {@code mailto:}, {@code sms:}, {@code geo:}, {@code intent:}, {@code market:}
 * handed to Android once per tap), confirmed clearing of all or one site's data, find in page,
 * site permission and HTTP sign-in prompts, engine-attested login fields, downloads, fullscreen
 * video, sharing and the reviewed page excerpt read in an isolated world.
 *
 * <p>Refusals, notices and page errors reach the renderer as the shared host's fixed sentences,
 * which apps/app/src/browser/messages.ts words for the screen; keep them unchanged.
 * Profile, preference and Keystore names are installed identifiers ({@link AlphaBrowserStores}).
 *
 * <p>Requires Android 10, like the download list it saves through.
 */
@RequiresApi(Build.VERSION_CODES.Q)
@CapacitorPlugin(name = "AlphaBrowser")
public class AlphaBrowserPlugin extends Plugin {
 /** Durable profile shared by every normal tab. Never "Default" (the host's). */
 static final String PERSISTENT_PROFILE = AlphaBrowserStores.PERSISTENT_PROFILE;
 static final String PRIVATE_PREFIX = AlphaBrowserStores.PRIVATE_PREFIX;
 static boolean ephemeralProfile(String name) { return AlphaBrowserStores.IDENTITY.ephemeral(name); }
 /** Alpha's installed identity and the product names its notices use. */
 private static BrowserTabHostConfig config() { return AlphaBrowserStores.IDENTITY; }
 /** A reviewed reading ended: stop its speech request, which only Alpha's voice plugin holds. */
 private void cancelReadingSpeech(String requestId) {
  com.getcapacitor.PluginHandle handle=getBridge().getPlugin("AlphaVoiceCloud");
  if(handle!=null&&handle.getInstance() instanceof AlphaVoiceCloudPlugin)((AlphaVoiceCloudPlugin)handle.getInstance()).cancelBrowserSpeech(requestId);
 }
 private String freshNamespace() { return config().newPrivateNamespace(UUID.randomUUID().toString()); }
 private final Map<String, Tab> tabs = new HashMap<>();
 private String namespace;
 private final WebViewListener hostNavigation = new WebViewListener() {
  @Override public void onPageStarted(WebView view) {
   // This callback belongs only to the privileged host document, not child pages.
   if(view==getBridge().getWebView())resetHostDocument();
  }
 };
 private void resetHostDocument() {
  selectPresentation(null);cancelFile();if(reading!=null)reading.cancel();
  if(downloads!=null)downloads.dismissDialogs();
  dismissSiteDialogs();exitFullscreen(true);
  ArrayList<Tab> all=new ArrayList<>(tabs.values());tabs.clear();
  // Private profiles are purged; the persistent profile keeps its sign-ins.
  for(Tab tab:all)dispose(tab);
  session=null;
  // A failed deletion must never make the next document reuse an old private profile.
  namespace=freshNamespace();
 }
 private String session;
 private long sequence;
 private String presentedId;
 private long presentationRevision;
 private void selectPresentation(String id) {
  if(!Objects.equals(presentedId,id)){
   presentedId=id;
   presentationRevision++;
  }
 }
 private boolean paused;
 private boolean destroyed;
 private AlphaBrowserDownloads downloads;
 private AlphaReviewedReading reading;
 private BrowserBookmarkStore bookmarks;
 private BrowserSessionStore sessionStore;
 private boolean clearing;
 private final AutofillManager.AutofillCallback autofillCallback=new AutofillManager.AutofillCallback() {
  @Override public void onAutofillEvent(View view,int virtualId,int event) { autofillEvent(view,virtualId,event); }
  @Override public void onAutofillEvent(View view,int event) { autofillEvent(view,View.NO_ID,event); }
 };
 private void autofillEvent(View view,int virtualId,int event) {
  if(event!=AutofillManager.AutofillCallback.EVENT_INPUT_SHOWN)return;
  for(Tab tab:tabs.values())if(tab.web==view||(tab.fields!=null&&tab.fields.anchor==view)){
   if(tab.web==view)tab.autofillVirtualId=virtualId;
   // A dataset can arrive after the overlay/navigation cancellation. Revoke
   // that late presentation too, using the framework's real virtual-field ID.
   if(!paused && !canAutofill(tab))cancelAutofill(tab);
   break;
  }
 }
 private final android.os.Handler navigationHandler = new android.os.Handler(android.os.Looper.getMainLooper());
 /** Hosts (by private prefix) whose leftover ephemeral profiles this process already purged. One
  * flag per identity, so a second host subclass in the same process still purges its own. */
 private static final Set<String> cleanedProfiles=Collections.synchronizedSet(new HashSet<>());
 private final Map<String,String> retiredProfiles=new LinkedHashMap<>();
 private android.content.SharedPreferences profileRetirement;
 private ActivityResultLauncher<Intent> filePicker;
 private ActivityResultLauncher<Intent> pageShare;
 private boolean shareOutstanding;
 private ValueCallback<Uri[]> fileCallback;
 private Tab fileTab;
 private long fileNavigation;
 private boolean pickerOutstanding;
 private ActivityResultLauncher<String[]> runtimePermissions;
 private java.util.function.Consumer<Map<String,Boolean>> runtimeResult;
 private ActivityResultLauncher<Uri> takePicture;
 private Uri pictureUri;
 /** One site prompt at a time: permission, HTTP authentication or camera choice. */
 private AlertDialog siteDialog;
 private Tab siteDialogTab;
 private Runnable siteDialogCancel;
 private View customView;
 private FrameLayout fullscreen;
 private Tab fullscreenTab;
 private WebChromeClient.CustomViewCallback customCallback;
 private OnBackPressedCallback fullscreenBack;
 private void cancelFile() { ValueCallback<Uri[]> callback=fileCallback;fileCallback=null;fileTab=null;if(callback!=null)callback.onReceiveValue(null); }
 @Override public void load() {
  BrowserTabHostConfig identity=config();namespace=freshNamespace();
  reading=new AlphaReviewedReading(getActivity(),this::cancelReadingSpeech,identity.allowLoopback);
  pageShare=getActivity().getActivityResultRegistry().register(identity.registryKey("share"),new ActivityResultContracts.StartActivityForResult(),result->{shareOutstanding=false;});
  downloads=new AlphaBrowserDownloads(getActivity(),new AlphaBrowserDownloads.Config(identity.downloadPreferences,identity.allowLoopback));
  downloads.purgeStaleCaptures();
  runtimePermissions=getActivity().getActivityResultRegistry().register(identity.registryKey("site-permission"),new ActivityResultContracts.RequestMultiplePermissions(),result->{
   java.util.function.Consumer<Map<String,Boolean>> callback=runtimeResult;runtimeResult=null;if(callback!=null)callback.accept(result);
  });
  takePicture=getActivity().getActivityResultRegistry().register(identity.registryKey("take-picture"),new ActivityResultContracts.TakePicture(),this::pictureTaken);
  bookmarks=AlphaBrowserStores.bookmarks(getActivity());
  sessionStore=AlphaBrowserStores.session(getActivity());
  profileRetirement=getContext().getSharedPreferences(identity.retiredProfilePreferences,0);
  // Capacitor constructs plugins before Builder.create replaces its listener
  // list. Register on the next main-loop turn so that replacement cannot erase
  // this callback. No renderer/native browser requests run during construction.
  navigationHandler.post(()->{if(!destroyed)getBridge().addWebViewListener(hostNavigation);});
  filePicker=getActivity().getActivityResultRegistry().register(identity.registryKey("file"),new ActivityResultContracts.StartActivityForResult(),result->{
   pickerOutstanding=false;ValueCallback<Uri[]> callback=fileCallback;Tab tab=fileTab;fileCallback=null;fileTab=null;
   if(callback==null)return;
   if(result.getResultCode()!=android.app.Activity.RESULT_OK||tab==null||tab.dead||tabs.get(tab.id)!=tab||tab.navigation!=fileNavigation){callback.onReceiveValue(null);return;}
   Intent data=result.getData();LinkedHashSet<Uri> selected=new LinkedHashSet<>();
   if(data!=null){if(data.getData()!=null)selected.add(data.getData());if(data.getClipData()!=null)for(int i=0;i<data.getClipData().getItemCount();i++)selected.add(data.getClipData().getItemAt(i).getUri());}
   if(selected.isEmpty()||selected.size()>16||selected.stream().anyMatch(uri->uri==null||!"content".equals(uri.getScheme()))){callback.onReceiveValue(null);return;}
   callback.onReceiveValue(selected.toArray(new Uri[0]));
  });
  getActivity().runOnUiThread(() -> {
  // The privileged local renderer is never a credential destination.
  getBridge().getWebView().setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
  AutofillManager autofill=getActivity().getSystemService(AutofillManager.class);
  if(autofill!=null)autofill.registerCallback(autofillCallback);
  if (!WebViewFeature.isFeatureSupported(WebViewFeature.MULTI_PROFILE) || !cleanedProfiles.add(config().privatePrefix)) return;
  // Chromium keeps loaded profile instances until process exit. Delete retired
  // shells before this process loads any child profile; one failure must not
  // prevent cleanup of other independently retired profiles.
  // Only private per-tab profiles are ephemeral. The persistent
  // normal-tab profile is retained across restarts by product decision.
  for(String name:ProfileStore.getInstance().getAllProfileNames()) if(ephemeralProfile(name)) {
   try { ProfileStore.getInstance().deleteProfile(name);
    if(!ProfileStore.getInstance().getAllProfileNames().contains(name))profileRetirement.edit().remove(name).apply();
   } catch(Exception unavailable) { profileRetirement.edit().putString(name,"pending").apply(); }
  }
 }); }

 /** Kept separate from dispatch so resolver changes cannot bypass page/owner checks. */
 private java.util.function.Function<Intent,java.util.List<android.content.pm.ResolveInfo>> externalBrowserResolver =
  intent->getContext().getPackageManager().queryIntentActivities(intent,android.content.pm.PackageManager.MATCH_DEFAULT_ONLY|android.content.pm.PackageManager.GET_RESOLVED_FILTER);
 private static class Tab { BrowserReadingWorld readingWorld; BrowserBlobCapture capture; String findQuery; /** Latest main-frame request or redirect target (any thread). */ volatile String pendingMain; /** Main-frame start address before any document history updates. */ String startedMain; /** Origin of a submitted HTTP sign-in whose result is pending; Save waits for it. */ String authSaveOrigin; int authAttempts; boolean passkeys; String id, profile, opener, url = "", error = "", finishedUrl = "", lastCommittedUrl = ""; WebView web; TabFrame frame; TextView message; /** Engine-attested login fields (null when the WebView cannot attest field origins). */ BrowserLoginFields fields; boolean priv, handedOff, loading, dead, committed, autofillEnabled; /** The engine started a new document for the current load. */ boolean documentStarted; /** The host this load moved from HTTP to HTTPS, so a redirect back to HTTP fails instead of looping. */ String upgradedHost = ""; /** The address another browser may open after this page failed, or "". */ String elsewhereUrl = ""; int httpStatus, autofillVirtualId=View.NO_ID; long navigation; Runnable timeout; }
 /** Credentials stay in the framework/provider and the remote document. No bridge API
  * reads fields or replaces Chromium's frame-specific webDomain metadata. The only addition
  * is the committed top-level origin, which the password provider requires to equal the
  * field origin so cross-origin frames are never filled. */
 private boolean canAutofill(Tab t) {
  BrowserAutofillEligibility.TabState state=autofillState(t);
  return BrowserAutofillEligibility.eligible(state);
 }
 private BrowserAutofillEligibility.TabState autofillState(Tab t) {
  BrowserAutofillEligibility.TabState state=new BrowserAutofillEligibility.TabState();
  state.paused=paused;state.closed=t.dead;state.committed=t.committed;state.loading=t.loading;state.loadError=t.error;
  state.selected=Objects.equals(presentedId,t.id);state.shown=t.web.isShown();
  // A site prompt (HTTP sign-in, permission, camera choice) is an overlay: no tab is fillable
  // while it is open, so the prompt's own fields are the only login structure in the window.
  state.overlay=siteDialog!=null;
  state.documentUrl=t.url;state.engineUrl=t.dead?null:t.web.getUrl();
  return state;
 }
 /** What BrowserFieldOrigin.bind needs about this tab: eligibility, committed address and navigation. */
 private BrowserFieldOrigin.TabSnapshot fieldSnapshot(Tab t) {
  BrowserFieldOrigin.TabSnapshot snapshot=new BrowserFieldOrigin.TabSnapshot();
  snapshot.supported=t.fields!=null&&!destroyed&&tabs.get(t.id)==t;
  snapshot.state=autofillState(t);snapshot.navigation=t.navigation;
  return snapshot;
 }

 private void cancelAutofill(Tab t) {
  t.autofillEnabled=false;
  // End engine-attested fields first: exiting closes their popup, and cancel() below ends the
  // session without a Save offer (they are never reported invisible).
  if(t.fields!=null)t.fields.revoke(true);
  AutofillManager manager=getActivity().getSystemService(AutofillManager.class);
  if(manager!=null) {
   // AOSP keeps the popup anchor in the active session's fillable IDs.
   // Visibility=false hides that popup synchronously. Do this BEFORE clearFocus
   // or cancel can reset those IDs; notifyViewExited alone is asynchronous.
   if(t.autofillVirtualId!=View.NO_ID) {
    manager.notifyViewVisibilityChanged(t.web,t.autofillVirtualId,false);
    manager.notifyViewExited(t.web,t.autofillVirtualId);
   }else {
    manager.notifyViewVisibilityChanged(t.web,false);
    manager.notifyViewExited(t.web);
   }
  }
  t.web.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
  t.web.clearFocus();
  if(manager!=null)manager.cancel();
  t.autofillVirtualId=View.NO_ID;
 }
 /** A page-initiated main-frame navigation (a sign-in form submission usually navigates)
  * ends the selected tab's framework session with commit() instead of cancel(), so the
  * selected provider can offer Save for the values the user typed. The provider still asks
  * the user; nothing is stored here. Overlays, pause, tab switch, close and user-entered
  * addresses keep cancelling. */
 private void commitAutofill(Tab t) {
  t.autofillEnabled=false;
  AutofillManager manager=getActivity().getSystemService(AutofillManager.class);
  if(manager!=null)manager.commit();
  // The committed session already holds the submitted values; the binding ends with the page.
  if(t.fields!=null)t.fields.revoke(false);
  t.web.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
  t.autofillVirtualId=View.NO_ID;
 }
 private void disableAutofill(Tab t) {
  if(t.autofillEnabled)cancelAutofill(t);
  else {if(t.fields!=null)t.fields.revoke(true);t.web.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);}
 }
 private void syncAutofill(Tab t) {
  // Provider authentication can pause this Activity. Keep the same-document
  // session, but never provide/fill fields until this selected tab resumes.
  if(paused) { t.web.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS); return; }
  // With engine-attested fields the WebView's own structure (no per-field origins) is never
  // offered; the attested anchor is the tab's only Autofill surface.
  if(canAutofill(t)) { t.autofillEnabled=true; t.web.setImportantForAutofill(t.fields==null?View.IMPORTANT_FOR_AUTOFILL_YES:View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS); if(t.fields!=null)t.fields.retry(); }
  else disableAutofill(t);
 }
 private final class CredentialWebView extends WebView {
  private final Tab tab;
  CredentialWebView(Tab tab) { super(getActivity());this.tab=tab; }
  @Override public void onProvideAutofillVirtualStructure(ViewStructure structure,int flags) {
   if(canAutofill(tab)&&tab.fields==null) {
    super.onProvideAutofillVirtualStructure(structure,flags);
    String origin=topOrigin(tab.url);
    if(origin!=null && structure.getExtras()!=null)structure.getExtras().putString(config().autofillExtras.topOrigin,origin);
   }
   else structure.setChildCount(0);
  }
  @Override public void onProvideAutofillStructure(ViewStructure structure,int flags) {
   if(canAutofill(tab)&&tab.fields==null)super.onProvideAutofillStructure(structure,flags);
   else structure.setChildCount(0);
  }
  @Override public void autofill(SparseArray<AutofillValue> values) {
   if(canAutofill(tab)&&tab.fields==null)super.autofill(values);
  }
 }
 /** Exact https://host[:port] of the committed document, or null. */
 static String topOrigin(String url) {
  Uri uri=Uri.parse(url==null?"":url);
  String host=uri.getHost();
  if(!"https".equalsIgnoreCase(uri.getScheme()) || host==null || host.isEmpty() || uri.getUserInfo()!=null)return null;
  int port=uri.getPort();
  return "https://"+host.toLowerCase(java.util.Locale.ROOT)+(port==-1||port==443?"":":"+port);
 }
 private void clearTimeout(Tab t) { if(t.timeout!=null) navigationHandler.removeCallbacks(t.timeout); t.timeout=null; }
 private void loading(Tab t) { loading(t,false); }
 private void loading(Tab t,boolean startedCallback) {
  if(reading!=null)reading.cancelFor(t.id);
  if(startedCallback&&t.autofillEnabled&&!paused&&Objects.equals(presentedId,t.id))commitAutofill(t);
  else disableAutofill(t);
  if(downloads!=null)downloads.cancelReview(t.id);
  if(t.capture!=null)t.capture.cancel();
  clearFind(t);
  // A submitted HTTP sign-in stays open ("Signing in") until its navigation resolves.
  if(siteDialogTab==t&&!(startedCallback&&t.authSaveOrigin!=null))dismissSiteDialogs();
  if(fullscreenTab==t)exitFullscreen(true);
  if(!startedCallback)t.authAttempts=0;
  if(t.readingWorld!=null&&!startedCallback)t.readingWorld.invalidate();
  t.navigation++;if(fileTab==t)cancelFile();
  t.loading=true; t.committed=false; t.error=""; t.httpStatus=0; t.finishedUrl=""; t.elsewhereUrl="";
  t.documentStarted=startedCallback;if(!startedCallback)t.upgradedHost="";
  t.startedMain=startedCallback?t.url:null;
  t.web.setVisibility(View.INVISIBLE); t.message.setText(AlphaBrowserCopy.LOADING); t.message.setVisibility(View.VISIBLE);
  armTimeout(t);
 }
 /** A load gets 30 seconds while its tab is on screen. A hidden or paused tab cannot draw its first frame, so its timer stops and starts again when it shows. */
 private void armTimeout(Tab t) {
  clearTimeout(t);
  t.timeout=()->{t.timeout=null;if(!t.loading||t.dead||!t.error.isEmpty())return;if(paused||!t.frame.isShown())return;fail(t,"This page is taking too long. Check your connection, then reload from the menu.",t.url);};
  navigationHandler.postDelayed(t.timeout,30000);
 }
 private void resumeTimeout(Tab t) { if(t.loading&&!t.dead&&t.error.isEmpty()&&t.timeout==null)armTimeout(t); }
 /** Shows the tab's committed page again when the engine still shows it, after a load that left no new document. */
 private boolean restoreCommitted(Tab t) {
  if(t.lastCommittedUrl.isEmpty()||!Objects.equals(t.lastCommittedUrl,t.web.getUrl()))return false;
  clearTimeout(t);t.loading=false;t.committed=true;t.url=t.lastCommittedUrl;t.message.setVisibility(View.GONE);t.web.setVisibility(View.VISIBLE);syncAutofill(t);emit(t);
  return true;
 }
 private void dispose(Tab t) {
  if(t.readingWorld!=null)t.readingWorld.close();
  if(t.capture!=null)t.capture.close();
  if(reading!=null)reading.cancelFor(t.id);
  disableAutofill(t);
  if(downloads!=null){downloads.cancelReview(t.id);if(t.priv)downloads.forgetPrivate(t.id);}
  if(siteDialogTab==t)dismissSiteDialogs();
  if(fullscreenTab==t)exitFullscreen(true);
  if(fileTab==t)cancelFile();
  clearTimeout(t);
  if(t.frame != null && t.frame.getParent() != null) ((ViewGroup)t.frame.getParent()).removeView(t.frame);
  releaseTabInputRouter();
  // Normal tabs keep the shared persistent profile. A private profile is purged
  // only once no live tab (for example its pop-up) still uses it.
  boolean purge=t.priv&&ephemeralProfile(t.profile)&&tabs.values().stream().noneMatch(other->other!=t&&Objects.equals(other.profile,t.profile));
  if(purge) {
   // Retirement is durable even if the asynchronous purge or process stops.
   profileRetirement.edit().putString(t.profile,"pending").commit();
   retiredProfiles.put(t.profile,"pending");
   while(retiredProfiles.size()>256)retiredProfiles.remove(retiredProfiles.keySet().iterator().next());
  }
  android.webkit.WebStorage storage=null;
  if(purge) try {
   androidx.webkit.Profile profile=t.dead?ProfileStore.getInstance().getProfile(t.profile):WebViewCompat.getProfile(t.web);
   if(profile!=null&&ephemeralProfile(profile.getName())&&t.profile.equals(profile.getName()))storage=profile.getWebStorage();
  } catch(Exception unavailable) { /* Pending startup cleanup remains. */ }
  if(t.fields!=null){t.fields.close();if(t.fields.anchor.getParent()!=null)((ViewGroup)t.fields.anchor.getParent()).removeView(t.fields.anchor);}
  if(!t.dead) {
   t.web.stopLoading();t.web.setWebViewClient(new WebViewClient());t.web.setWebChromeClient(null);
   t.web.destroy();t.dead=true;
  }
  final android.webkit.WebStorage retiredStorage=storage;
  final String retiredName=t.profile;
  // WebView.destroy posts Chromium native destruction. Retire only that
  // profile's data after that task; never clear the host/default profile.
  if(retiredName!=null&&retiredStorage!=null&&WebViewFeature.isFeatureSupported(WebViewFeature.DELETE_BROWSING_DATA))navigationHandler.post(()->{
   try { WebStorageCompat.deleteBrowsingData(retiredStorage,()->{
    retiredProfiles.put(retiredName,"purged");
    profileRetirement.edit().putString(retiredName,"purged-awaiting-process-cleanup").apply();
   }); } catch(Exception unavailable) { retiredProfiles.put(retiredName,"pending"); }
  });
 }
 private static boolean currentDocumentUrl(Tab t,String visible) {
  return t.startedMain!=null && t.startedMain.equals(t.pendingMain)
      && BrowserWebOrigin.sameOrigin(t.startedMain,visible);
 }
 private boolean safe(String value) {
  try { Uri u = Uri.parse(value); return ("https".equalsIgnoreCase(u.getScheme()) || "http".equalsIgnoreCase(u.getScheme())) && u.getHost() != null && u.getUserInfo() == null && !value.contains("\n") && !value.contains("\r"); } catch (Exception e) { return false; }
 }
 private void fail(Tab t, String message) { fail(t,message,""); }
 /** {@code elsewhere} is the address another browser may try for a normal tab, when the failure is the network's or this WebView's and not a refusal. */
 private void fail(Tab t, String message, String elsewhere) { finishAuthSave(t,null); disableAutofill(t); clearTimeout(t); t.error = message; t.loading = false; t.committed = false; t.web.stopLoading(); t.web.setVisibility(View.INVISIBLE); t.message.setText(AlphaBrowserCopy.pageError(message)); t.message.setVisibility(View.VISIBLE); t.elsewhereUrl=!t.priv&&elsewhere!=null&&safe(elsewhere)?elsewhere:""; emit(t); }
 private JSObject state(Tab t) { JSObject s = new JSObject(); s.put("session", session); s.put("id", t.id); s.put("sequence", ++sequence); s.put("navigation", String.valueOf(t.navigation)); s.put("url", t.url); s.put("title", t.dead ? "" : t.web.getTitle()); s.put("loading", t.loading); s.put("committed", t.committed); s.put("httpStatus", t.httpStatus); s.put("progress", t.dead ? 0 : t.web.getProgress()); s.put("canBack", !t.dead && t.web.canGoBack()); s.put("canForward", !t.dead && t.web.canGoForward()); s.put("error", t.error); s.put("private", t.priv); if(!t.elsewhereUrl.isEmpty())s.put("elsewhereUrl", t.elsewhereUrl); return s; }
 private void emit(Tab t) { if (tabs.get(t.id) == t) notifyListeners("stateChanged", state(t)); }
 /**
  * Capacitor can deliver a call the page made just before the activity was destroyed after
  * handleOnDestroy. Nothing may then create a WebView or show a dialog on the dead activity (a
  * dialog would throw on the main thread and end the process); every such call is rejected.
  */
 private boolean closed(PluginCall call){if(!destroyed)return false;call.reject("Browser closed");return true;}
 private void run(PluginCall call, java.util.function.Consumer<Tab> action) { getActivity().runOnUiThread(() -> {if(closed(call))return; if (!Objects.equals(session, call.getString("session"))) { call.reject("Expired browser session"); return; } Tab t = tabs.get(call.getString("id")); if (t == null || t.dead) { call.reject("Browser tab is unavailable"); return; } try { action.accept(t); call.resolve(state(t)); } catch (Exception e) { call.reject("Browser operation failed"); } }); }
 @PluginMethod public void create(PluginCall call) { getActivity().runOnUiThread(() -> {if(closed(call))return;
  String requested = call.getString("session"), id = call.getString("id");
  if (requested == null || !BrowserTabHostConfig.validTabId(id)) { call.reject("Invalid browser identity"); return; }
  if (session != null && !session.equals(requested)) { call.reject("Expired browser session"); return; }
  session = requested;
  boolean priv = Boolean.TRUE.equals(call.getBoolean("private", false));
  if (tabs.containsKey(id)) { Tab existing = tabs.get(id); if (existing.priv != priv) { call.reject("Browser tab identity changed"); return; } call.resolve(state(existing)); return; }
  if (tabs.size() >= config().maxTabs) { call.reject("Close a tab before opening another"); return; }
  if (clearing && !priv) { call.reject("Browsing data is being cleared. Try again in a moment."); return; }
  if (!WebViewFeature.isFeatureSupported(WebViewFeature.MULTI_PROFILE) || !WebViewFeature.isFeatureSupported(WebViewFeature.GET_WEB_VIEW_RENDERER)) { call.reject("This Android WebView does not support isolated browser profiles"); return; }
  // Normal tabs keep their data by decision P-04, so only private tabs depend on
  // secure profile-scoped deletion when they close.
  if (priv && !WebViewFeature.isFeatureSupported(WebViewFeature.DELETE_BROWSING_DATA)) { call.reject("Private tabs need an Android System WebView that can securely delete their data. Update Android System WebView to use private tabs."); return; }
  try { Tab created=build(id, priv, priv ? config().privateProfile(namespace, id) : config().persistentProfile); passkeyNotice(created); call.resolve(state(created)); }
  catch (Exception e) { call.reject("Could not create an isolated browser tab"); }
 }); }
 /** One child WebView in the given browser-only profile. Pop-ups pass their
  * opener's profile so a site's sign-in window shares its session. */
 private Tab build(String id, boolean priv, String profileName) throws Exception {
  Tab t = new Tab(); t.id = id; t.priv = priv; t.web = new CredentialWebView(t);
  try {
   // setProfile creates a missing profile. Chromium retains loaded profile
   // shells until process exit; private retirement purges data before startup deletion.
   if (!config().admits(profileName, priv)) throw new IllegalStateException();
   t.profile = profileName; WebViewCompat.setProfile(t.web, t.profile);
   // Check mode before loading any remote page; inspect its renderer after a
   // navigation has committed rather than rejecting an unstarted WebView.
   if (!WebViewFeature.isFeatureSupported(WebViewFeature.MULTI_PROCESS) || !WebViewCompat.isMultiProcessEnabled()) throw new IllegalStateException();
   WebSettings settings = t.web.getSettings(); settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true); settings.setAllowFileAccess(false); settings.setAllowContentAccess(false); settings.setAllowFileAccessFromFileURLs(false); settings.setAllowUniversalAccessFromFileURLs(false); settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW); settings.setJavaScriptCanOpenWindowsAutomatically(false); settings.setSupportMultipleWindows(true); settings.setSaveFormData(false); settings.setSafeBrowsingEnabled(true); t.web.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
   // Lay pages out and zoom them as Chrome does: a page's viewport tag decides its width (980 CSS px without one), it opens fitted to the screen with readable text, and it pinches unless it forbids that.
   settings.setUseWideViewPort(true); settings.setLoadWithOverviewMode(true); settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.TEXT_AUTOSIZING); settings.setSupportZoom(true); settings.setBuiltInZoomControls(true); settings.setDisplayZoomControls(false);
   // P-19: embedded sign-ins may use third-party cookies in normal tabs only.
   // Apply through the isolated profile and refuse a provider that ignores it.
   CookieManager tabCookies=WebViewCompat.getProfile(t.web).getCookieManager();
   tabCookies.setAcceptThirdPartyCookies(t.web, !priv);
   if(tabCookies.acceptThirdPartyCookies(t.web)!=!priv)throw new IllegalStateException("Browser cookie isolation is unavailable");
   // Approved MVP policy: passwords remain enabled; passkeys require separate provider qualification.
   t.passkeys=false;
   // A fresh WebView defaults to WebAuthn NONE; this app never enables it.
   // Avoid the redundant compat settings conversion here: it can stall tab creation.
   // https://developer.android.com/reference/androidx/webkit/WebSettingsCompat#WEB_AUTHENTICATION_SUPPORT_NONE
   t.readingWorld=new BrowserReadingWorld(t.web);
   t.capture=new BrowserBlobCapture(t.web,downloads.captureDirectory());
   t.web.setFindListener((ordinal,count,done)->findResult(t,ordinal,count,done));
   t.frame = new TabFrame(getActivity(),TabLayer.ABOVE_HOST); t.frame.setClipChildren(true); t.frame.setVisibility(View.GONE); t.frame.addView(t.web, new FrameLayout.LayoutParams(-1,-1));
   // Before any document loads: WebView applies the listener and script only to later documents.
   t.fields=BrowserLoginFields.install(t.web,()->fieldSnapshot(t),config().autofillExtras);
   if(t.fields!=null)t.frame.addView(t.fields.anchor, new FrameLayout.LayoutParams(-1,-1));
   t.message = new TextView(getActivity()); t.message.setPadding(24,24,24,24); t.message.setBackgroundColor(0xfffafafa); t.message.setTextColor(0xff222222); t.message.setVisibility(View.GONE); t.frame.addView(t.message, new FrameLayout.LayoutParams(-1,-1));
   t.web.setWebViewClient(new WebViewClient() {
    @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
     String target = r.getUrl().toString();
     // mailto/tel/sms/geo/intent/market belong to other apps. The current page stays.
     if (BrowserExternalHandoff.external(target)) { if (r.isForMainFrame()) handoff(t, target, r.hasGesture()); return true; }
     // A page that already shows keeps showing: only a tap gets a notice, a script's scheme probe stays silent.
     if (!safe(target)) { if (r.isForMainFrame()) { if (t.committed && t.error.isEmpty()) { if (r.hasGesture()) notice(t,"This address type is not supported."); } else fail(t,"This address type is not supported."); } return true; }
     if (r.isForMainFrame()) {
      String secure=upgradedAddress(target);
      if (secure!=null) {
       // A plain-HTTP link or redirect could only fail here, so it goes to HTTPS once per host; HTTPS sending it back to HTTP fails.
       if (Objects.equals(TabNavigation.httpHost(target),t.upgradedHost)) fail(t,"This site has no secure (HTTPS) connection.",target);
       else load(t,target);
       return true;
      }
      t.pendingMain=target;
     }
     return false;
    }
    @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) { if (r.isForMainFrame()) t.pendingMain=r.getUrl().toString(); if (r.isForMainFrame() && !safe(r.getUrl().toString())) return new WebResourceResponse("text/plain","UTF-8",new java.io.ByteArrayInputStream(new byte[0])); return null; }
    @Override public void onPageStarted(WebView v, String url, Bitmap icon) { if (!safe(url)) { fail(t,"This address type is not supported."); return; } t.url=url; if(t.readingWorld!=null)t.readingWorld.pageStarted(url); loading(t,true); emit(t); }
    @Override public void onPageCommitVisible(WebView v, String url) {
     String visible=v.getUrl();
     if (!t.error.isEmpty()) return;
     // The page can change its own address before this callback. The original main-frame
     // request must still own the tab before the host adopts the engine's new address.
     if (!url.equals(visible) && (!t.loading || t.committed || !url.equals(t.startedMain)
        || !currentDocumentUrl(t,visible))) return;
     if (WebViewCompat.getWebViewRenderProcess(v) == null) { fail(t,"Isolated browser renderer is unavailable."); return; }
     clearTimeout(t); t.upgradedHost=""; t.lastCommittedUrl=visible; t.committed=true; t.loading=!(visible.equals(t.finishedUrl) || v.getProgress()==100); t.url=visible; t.message.setVisibility(View.GONE); t.web.setVisibility(View.VISIBLE); finishAuthSave(t,visible); syncAutofill(t); emit(t);
    }
    @Override public void onPageFinished(WebView v, String url) {
     if (!t.error.isEmpty() || !safe(url)) return;
     boolean changed=!url.equals(t.url);
     if (changed && (!url.equals(v.getUrl()) || !currentDocumentUrl(t,url))) return;
     t.finishedUrl=url;
     if (!t.committed) return;
     if (changed) {
      // A later history update retires bindings to the earlier address.
      disableAutofill(t); t.navigation++; t.url=url; t.lastCommittedUrl=url;
     }
     clearTimeout(t); t.loading=false; syncAutofill(t); emit(t);
    }
    @Override public void doUpdateVisitedHistory(WebView v, String url, boolean isReload) {
     if (url==null || !safe(url) || !t.error.isEmpty()) return;
     // A new document's start follows its history update, and it moves the tab's navigation on; the update is read one turn later so only a move that stayed in the shown document counts.
     long navigation=t.navigation;
     navigationHandler.post(() -> {
      if (t.dead || tabs.get(t.id)!=t || t.navigation!=navigation || !t.error.isEmpty() || !url.equals(t.web.getUrl())) return;
      if (t.committed) {
       // pushState, replaceState and fragment moves change the address without a page load; Share, page context and the address bar follow it.
       if (url.equals(t.url)) return;
       disableAutofill(t); t.navigation++; t.url=url; t.lastCommittedUrl=url; syncAutofill(t); emit(t);
       return;
      }
      // Back, Forward or an address that stayed inside the shown document reports no page start and no first paint.
      if (!TabNavigation.settlesInDocument(t.loading,t.documentStarted,t.lastCommittedUrl,BrowserWebOrigin.sameOrigin(url,t.lastCommittedUrl))) return;
      clearTimeout(t); t.committed=true; t.loading=t.web.getProgress()<100; t.url=url; t.lastCommittedUrl=url; t.message.setVisibility(View.GONE); t.web.setVisibility(View.VISIBLE); syncAutofill(t); emit(t);
     });
    }
    @Override public void onFormResubmission(WebView v, android.os.Message dontResend, android.os.Message resend) { resubmission(t,dontResend,resend); }
    @Override public void onReceivedHttpAuthRequest(WebView v, HttpAuthHandler handler, String host, String realm) { httpAuth(t,handler,host,realm); }
    @Override public void onReceivedSslError(WebView v, SslErrorHandler handler, SslError error) { handler.cancel(); fail(t,"Secure connection failed. The certificate was not accepted."); }
    @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) { if (r.isForMainFrame()) { if (config().debugLogging) android.util.Log.w(config().logTag, "Main-frame network failure code=" + e.getErrorCode()); String failed=r.getUrl().toString(); if (TabNavigation.httpHost(failed)!=null) fail(t,"This site has no secure (HTTPS) connection.",failed); else fail(t,"Page could not load. Check the address and connection, then reload.",safe(failed)?failed:t.url); } }
    @Override public void onReceivedHttpError(WebView v, WebResourceRequest r, WebResourceResponse response) {
     // An HTTP response is still a document: preserve the site's explanation,
     // retry links and traffic challenges. Transport/TLS failures remain fatal.
     if (r.isForMainFrame()) { t.httpStatus=response.getStatusCode(); emit(t); }
    }
    @Override public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail detail) { finishAuthSave(t,null); if(t.readingWorld!=null)t.readingWorld.close(); if(reading!=null)reading.cancelFor(t.id);disableAutofill(t); if(t.fields!=null)t.fields.close(); clearTimeout(t); t.dead=true; if(siteDialogTab==t)dismissSiteDialogs(); if(fullscreenTab==t)exitFullscreen(true); t.loading=false; t.committed=false; t.error="Browser renderer stopped. Close this tab and open a new one."; t.frame.removeView(v); v.destroy(); t.message.setText(AlphaBrowserCopy.pageError(t.error)); t.message.setVisibility(View.VISIBLE); JSObject event=new JSObject(); event.put("session",session); event.put("id",t.id); event.put("sequence",++sequence); event.put("error",t.error); event.put("loading",false); notifyListeners("stateChanged",event); return true; }
   });
   t.web.setWebChromeClient(new WebChromeClient() {
    @Override public void onProgressChanged(WebView v,int p) { if(p==100 && t.committed && t.error.isEmpty()) t.loading=false; syncAutofill(t); emit(t); }
    @Override public void onReceivedTitle(WebView v,String title) { emit(t); }
    @Override public void onPermissionRequest(PermissionRequest request) { mediaPermission(t,request); }
    @Override public void onPermissionRequestCanceled(PermissionRequest request) { if(siteDialogTab==t)dismissSiteDialogs(); }
    @Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback cb) { locationPermission(t,origin,cb); }
    @Override public void onGeolocationPermissionsHidePrompt() { if(siteDialogTab==t)dismissSiteDialogs(); }
    @Override public void onShowCustomView(View view,CustomViewCallback callback) { enterFullscreen(t,view,callback); }
    @Override public void onHideCustomView() { if(fullscreenTab==t)exitFullscreen(false); }
    @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams params) {
     if(paused||t.dead||tabs.get(t.id)!=t||!Objects.equals(presentedId,t.id)||!v.isShown()||pickerOutstanding||!t.committed||t.loading||!t.error.isEmpty()||!safe(t.url)||params.getMode()==FileChooserParams.MODE_SAVE){cb.onReceiveValue(null);return true;}
     cancelFile();fileCallback=cb;fileTab=t;fileNavigation=t.navigation;pickerOutstanding=true;
     if(params.isCaptureEnabled()&&captureType(params.getAcceptTypes())){offerCamera(t,params);return true;}
     openPicker(t,params);
     return true;
    }
    private void openPicker(Tab t,FileChooserParams params) {
     Intent picker=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
     ArrayList<String> types=new ArrayList<>();for(String type:params.getAcceptTypes())if(type!=null&&type.matches("[A-Za-z0-9!#$&^_.+-]+/[A-Za-z0-9!#$&^_.+*\\-]+"))types.add(type);
     if(!types.isEmpty())picker.putExtra(Intent.EXTRA_MIME_TYPES,types.toArray(new String[0]));
     picker.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,params.getMode()==FileChooserParams.MODE_OPEN_MULTIPLE);
     try{filePicker.launch(Intent.createChooser(picker,AlphaBrowserCopy.chooseFiles(Uri.parse(t.url).getHost())));}
     catch(Exception unavailable){pickerOutstanding=false;cancelFile();}
    }
    /** A capture-enabled image input offers the camera only after an explicit choice. */
    private void offerCamera(Tab t,FileChooserParams params) {
     AlertDialog dialog=new AlertDialog.Builder(getActivity()).setTitle(AlphaBrowserCopy.PHOTO_TITLE).setMessage(AlphaBrowserCopy.photoMessage(Uri.parse(t.url).getHost()))
      .setPositiveButton(AlphaBrowserCopy.USE_CAMERA,(d,w)->{siteDialogCancel=null;cameraForFile(t);})
      .setNeutralButton(AlphaBrowserCopy.CHOOSE_FILE,(d,w)->{siteDialogCancel=null;if(fileTab==t&&t.navigation==fileNavigation)openPicker(t,params);else{pickerOutstanding=false;cancelFile();}})
      .setNegativeButton(AlphaBrowserCopy.CANCEL,null).create();
     showSiteDialog(t,dialog,()->{pickerOutstanding=false;cancelFile();});
    }
    @Override public boolean onCreateWindow(WebView v,boolean dialog,boolean gesture,android.os.Message message) { return popup(t,gesture,message); }
    @Override public void onCloseWindow(WebView window) {
     // Only a pop-up this browser opened may close itself (window.close()).
     if(t.opener==null||tabs.get(t.id)!=t)return;
     tabs.remove(t.id);dispose(t);tabClosed(t.id);
    }
   });
   t.web.setDownloadListener((url,agent,disposition,mime,length) -> {
    if(paused||t.dead||!Objects.equals(presentedId,t.id)||tabs.get(t.id)!=t)return;
    finishAuthSave(t,null);disableAutofill(t);clearTimeout(t);t.loading=false;
    if(!t.lastCommittedUrl.isEmpty()&&Objects.equals(t.lastCommittedUrl,t.web.getUrl())){
     t.url=t.lastCommittedUrl;t.committed=true;t.web.setVisibility(View.VISIBLE);t.message.setVisibility(View.GONE);
    }else {t.committed=false;t.web.setVisibility(View.INVISIBLE);t.message.setText(AlphaBrowserCopy.DOWNLOAD_REQUESTED);t.message.setVisibility(View.VISIBLE);}
    long revision=t.navigation;
    java.util.function.BooleanSupplier current=()->!paused&&!t.dead&&tabs.get(t.id)==t&&t.navigation==revision&&Objects.equals(presentedId,t.id);
    // The cookie is read at confirmation from this tab's own profile, and only for its exact page origin.
    AlphaBrowserDownloads.Source source=new AlphaBrowserDownloads.Source(t.id,t.priv,BrowserWebOrigin.of(t.lastCommittedUrl),()->{
     if(t.dead||tabs.get(t.id)!=t)return null;
     try{return WebViewCompat.getProfile(t.web).getCookieManager().getCookie(url);}catch(Exception unavailable){return null;}
    },agent);
    // An ignored tab's blob: files are not prepared at all, so a flood writes nothing to disk.
    if(url!=null&&url.regionMatches(true,0,"blob:",0,5)){if(!downloads.ignoring(t.id))t.capture.capture(url,(file,type)->{
     if(current.getAsBoolean())downloads.reviewCaptured(source,file,AlphaBrowserDownloads.safeName("download",disposition,AlphaBrowserDownloads.validMime(mime)?mime:type),AlphaBrowserDownloads.validMime(mime)?mime:type,current);else file.delete();
    },reason->notice(t,reason));}
    else downloads.request(source,url,disposition,mime,length,current);
    emit(t);
   });
   ((ViewGroup)getActivity().findViewById(android.R.id.content)).addView(t.frame); tabs.put(id,t); return t;
  } catch (Exception e) { dispose(t); throw e; }
 }

 // ---- Site prompts: permissions, HTTP authentication, camera choice -------------
 private boolean promptable(Tab t){return !paused&&!destroyed&&!t.dead&&tabs.get(t.id)==t&&Objects.equals(presentedId,t.id)&&t.error.isEmpty();}
 private void showSiteDialog(Tab t,AlertDialog dialog,Runnable cancel){
  dismissSiteDialogs();siteDialog=dialog;siteDialogTab=t;siteDialogCancel=cancel;siteDialogAutofill=false;siteDialogRevoke=null;
  for(Tab tab:tabs.values())disableAutofill(tab);
  dialog.setOnDismissListener(d->{
   if(siteDialog==dialog){revokeSiteDialogAutofill();Runnable pending=siteDialogCancel;siteDialog=null;siteDialogTab=null;siteDialogCancel=null;siteDialogAutofill=false;if(pending!=null)pending.run();}
   // The overlay is gone (unless a newer prompt replaced it): the presented tab may become fillable again.
   if(siteDialog!=null)return;Tab shown=presentedId==null?null:tabs.get(presentedId);if(shown!=null&&!shown.dead)syncAutofill(shown);});
  dialog.show();
 }
 /** Dismiss the open site prompt; its request is denied or cancelled exactly once, here and
  * now, since the dismiss callback arrives later, possibly after a newer prompt took its place.
  * A prompt with Autofill fields ends its framework session with cancel() first, so neither the
  * dismissal (a provider may save when all fields become invisible) nor a later commit can
  * offer Save for values the site never accepted. */
 private void dismissSiteDialogs(){
  AlertDialog dialog=siteDialog;if(dialog==null)return;
  revokeSiteDialogAutofill();
  if(siteDialogAutofill){siteDialogAutofill=false;AutofillManager manager=getActivity().getSystemService(AutofillManager.class);if(manager!=null)manager.cancel();}
  Runnable pending=siteDialogCancel;siteDialog=null;siteDialogTab=null;siteDialogCancel=null;
  dialog.dismiss();
  if(pending!=null)pending.run();
 }
 private void revokeSiteDialogAutofill(){Runnable revoke=siteDialogRevoke;siteDialogRevoke=null;if(revoke!=null)revoke.run();}
 /** Whether the open site prompt has Autofill-bound fields (the HTTP sign-in prompt). */
 private boolean siteDialogAutofill;
 /** Revokes the open HTTP sign-in prompt's Autofill binding; runs before any dismissal. */
 private Runnable siteDialogRevoke;
 /** Android's standard WebView reports no authenticated challenge origin (see BrowserHttpAuthOrigin). */
 private final BrowserHttpAuthOrigin.EngineChallengeSource authEngine=BrowserHttpAuthOrigin.STANDARD_WEBVIEW;
 /** What the browser host sees of tab {@code t} when it receives an HTTP sign-in challenge. */
 private BrowserHttpAuthOrigin.TabSnapshot authSnapshot(Tab t,String host,String realm){
  BrowserHttpAuthOrigin.TabSnapshot s=new BrowserHttpAuthOrigin.TabSnapshot();
  s.reportedHost=host;s.reportedRealm=realm;s.pendingMain=t.pendingMain;s.error=t.error;s.navigation=t.navigation;
  s.closed=destroyed||t.dead||tabs.get(t.id)!=t;s.paused=paused;s.selected=Objects.equals(presentedId,t.id);s.shown=t.frame.isShown();s.otherPrompt=siteDialog!=null;
  return s;
 }
 /** Resolve a submitted HTTP sign-in. Save is offered (commit) only when the main frame then
  * commits at the bound origin without an authentication error; every other outcome, including
  * a repeated challenge after a wrong password, cancels the session first. */
 private void finishAuthSave(Tab t,String committedUrl){
  String origin=t.authSaveOrigin;if(origin==null)return;t.authSaveOrigin=null;
  if(siteDialogTab!=t||!siteDialogAutofill)return;
  boolean accepted=committedUrl!=null&&origin.equals(BrowserHttpAuthOrigin.exactHttps(committedUrl))&&t.httpStatus!=401&&t.httpStatus!=407;
  if(accepted){siteDialogAutofill=false;AutofillManager manager=getActivity().getSystemService(AutofillManager.class);if(manager!=null)manager.commit();}
  dismissSiteDialogs();
 }
 static String[] androidPermissions(String kind){return BrowserSitePrompt.androidPermissions(kind);}
 private boolean declared(String permission){
  try{String[] requested=getContext().getPackageManager().getPackageInfo(getContext().getPackageName(),android.content.pm.PackageManager.GET_PERMISSIONS).requestedPermissions;
   if(requested!=null)for(String name:requested)if(permission.equals(name))return true;}catch(Exception unavailable){}
  return false;
 }
 private boolean granted(String permission){return androidx.core.content.ContextCompat.checkSelfPermission(getContext(),permission)==android.content.pm.PackageManager.PERMISSION_GRANTED;}
 /** A site permission kind the app itself may hold: declared, and (for location) any of fine/coarse. */
 private boolean grantable(String kind){for(String permission:androidPermissions(kind))if(declared(permission))return true;return false;}
 private boolean androidGranted(String kind){for(String permission:androidPermissions(kind))if(declared(permission)&&granted(permission))return true;return false;}
 /** Only a secure top-level page may be asked, and only for its own origin (BrowserSitePrompt). */
 private String permissionOrigin(Tab t,String requested){
  return BrowserSitePrompt.origin(t.lastCommittedUrl,t.web.getUrl(),requested,config().allowLoopback);
 }
 /** Ask (or reuse a stored per-origin decision for normal tabs), then chain to Android's runtime permission.
  * BrowserSitePrompt plans the request: only the selected, shown page may use a device sensor, even
  * with a stored Allow; private tabs never read or store decisions. The result lists the kinds granted. */
 private void sitePermission(Tab t,String origin,List<String> kinds,java.util.function.Consumer<Set<String>> result){
  long revision=t.navigation, selection=presentationRevision;
  // Android's permission dialog can pause the host without changing its selected presentation.
  // An explicit withdrawal or tab switch retires the request even if this tab returns.
  java.util.function.BooleanSupplier current=()->!destroyed&&!t.dead&&tabs.get(t.id)==t&&t.navigation==revision
   &&presentationRevision==selection&&Objects.equals(presentedId,t.id)&&Objects.equals(origin,BrowserWebOrigin.of(t.web.getUrl()));
  BrowserSitePrompt.Plan plan=BrowserSitePrompt.plan(origin,kinds,promptable(t),t.priv,this::grantable,sessionStore::permission);
  for(String kind:plan.unavailable)notice(t,BrowserSitePrompt.unavailableNotice(kind));
  java.util.function.Consumer<Set<String>> runtime=decided->{
   if(decided.isEmpty()||!current.getAsBoolean()){result.accept(Collections.emptySet());return;}
   ArrayList<String> missing=new ArrayList<>();for(String kind:decided)if(!androidGranted(kind))for(String permission:androidPermissions(kind))if(declared(permission))missing.add(permission);
   if(missing.isEmpty()){result.accept(decided);return;}
   if(runtimeResult!=null){result.accept(Collections.emptySet());return;}
   runtimeResult=answers->{
    if(!current.getAsBoolean()){result.accept(Collections.emptySet());return;}
    LinkedHashSet<String> final_=new LinkedHashSet<>();for(String kind:decided)if(androidGranted(kind))final_.add(kind);else notice(t,"Android has not allowed "+config().appName+" to use your "+kind+". You can allow it in Android Settings.");
    result.accept(current.getAsBoolean()?final_:Collections.emptySet());
   };
   try{runtimePermissions.launch(missing.toArray(new String[0]));}catch(RuntimeException unavailable){runtimeResult=null;result.accept(Collections.emptySet());}
  };
  if(plan.asked.isEmpty()){runtime.accept(plan.granted(false));return;}
  boolean[] answered={false};
  AlertDialog dialog=new AlertDialog.Builder(getActivity()).setTitle(AlphaBrowserCopy.permissionTitle(plan.asked)).setMessage(AlphaBrowserCopy.permissionMessage(Uri.parse(origin).getHost(),plan.asked,t.priv))
   .setPositiveButton(AlphaBrowserCopy.ALLOW,(d,w)->{if(answered[0]||siteDialog!=d)return;answered[0]=true;siteDialogCancel=null;
    if(!current.getAsBoolean()){result.accept(Collections.emptySet());return;}
    if(!t.priv)for(String kind:plan.asked)try{sessionStore.setPermission(origin,kind,true);}catch(Exception unavailable){}
    runtime.accept(plan.granted(true));})
   .setNegativeButton(AlphaBrowserCopy.DONT_ALLOW,(d,w)->{if(answered[0]||siteDialog!=d)return;answered[0]=true;siteDialogCancel=null;
    if(!current.getAsBoolean()){result.accept(Collections.emptySet());return;}
    if(!t.priv)for(String kind:plan.asked)try{sessionStore.setPermission(origin,kind,false);}catch(Exception unavailable){}
    runtime.accept(plan.granted(false));})
   .create();
  // Dismissed without an answer (Back, navigation, tab change): deny this request only; nothing is stored.
  showSiteDialog(t,dialog,()->{if(!answered[0])result.accept(Collections.emptySet());});
 }
 private void mediaPermission(Tab t,PermissionRequest request){
  String origin=permissionOrigin(t,request.getOrigin()==null?null:request.getOrigin().toString());
  if(origin==null){request.deny();if(request.getOrigin()!=null&&!Objects.equals(BrowserWebOrigin.of(request.getOrigin().toString()),BrowserWebOrigin.of(t.lastCommittedUrl)))notice(t,"Blocked a camera or microphone request from an embedded site.");return;}
  ArrayList<String> kinds=new ArrayList<>();
  for(String resource:request.getResources()){if(PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource))kinds.add("camera");else if(PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource))kinds.add("microphone");}
  if(kinds.isEmpty()){request.deny();return;}
  boolean[] done={false};
  sitePermission(t,origin,kinds,granted->{
   if(done[0])return;done[0]=true;
   ArrayList<String> resources=new ArrayList<>();
   if(granted.contains("camera"))resources.add(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
   if(granted.contains("microphone"))resources.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
   try{if(resources.isEmpty())request.deny();else request.grant(resources.toArray(new String[0]));}catch(RuntimeException stale){/* Request already cancelled by the page. */}
  });
 }
 private void locationPermission(Tab t,String requested,GeolocationPermissions.Callback callback){
  String origin=permissionOrigin(t,requested);
  if(origin==null){callback.invoke(requested,false,false);return;}
  boolean[] done={false};
  // Never let WebView retain the grant: decisions live only in the host's per-profile store.
  sitePermission(t,origin,Collections.singletonList("location"),granted->{if(done[0])return;done[0]=true;callback.invoke(requested,granted.contains("location"),false);});
 }
 private boolean secureAuthPage(Uri page){return config().passwordPage(page.getScheme(),page.getHost());}
 private void httpAuth(Tab t,HttpAuthHandler handler,String host,String realm){
  // WebView may report host[:port]; the prompt is allowed only for the page's own host.
  String asked=host==null?null:host.replaceFirst(":\\d+$","");
  // The challenge carries no URL. While a page-initiated load is pending, t.url can still be the
  // shown page; pendingMain is the latest main-frame request or redirect. Mixed content is never loaded,
  // so an insecure challenge can only come from a main-frame load. Any candidate for this
  // host that is not secure refuses the prompt, so a password is never sent in cleartext.
  boolean matched=false;
  for(String candidate:new String[]{t.url,t.pendingMain}){
   if(candidate==null||asked==null)continue;Uri page=Uri.parse(candidate);
   if(page.getHost()==null||!asked.equalsIgnoreCase(page.getHost()))continue;
   matched=true;
   if(!secureAuthPage(page)){handler.cancel();fail(t,"This site asks for a password over an insecure connection. It was not sent.");return;}
  }
  if(!matched){handler.cancel();notice(t,"Blocked a sign-in prompt from a different site.");return;}
  // A repeated challenge means the previous answer was not accepted: never offer to save it.
  finishAuthSave(t,null);
  if(!promptable(t)){handler.cancel();fail(t,"Sign-in was cancelled. Reload to try again.");return;}
  if(++t.authAttempts>3){handler.cancel();fail(t,"Sign-in failed. Reload to try again.");return;}
  float density=getContext().getResources().getDisplayMetrics().density;int pad=Math.round(20*density);
  android.widget.LinearLayout form=new android.widget.LinearLayout(getActivity());form.setOrientation(android.widget.LinearLayout.VERTICAL);form.setPadding(pad,pad/2,pad,0);
  // Provider fill/save needs the engine's own report of this challenge (exact request origin
  // after redirects, realm, top-level, validated TLS, this navigation) for the selected, shown
  // tab. Standard WebView reports none, so the prompt says why fill is off and stays manual.
  BrowserHttpAuthOrigin.Decision authDecision=BrowserHttpAuthOrigin.bind(authEngine.challenge(host,realm),authSnapshot(t,host,realm));
  String authOrigin=authDecision.origin;
  BrowserHttpAuthOrigin.Binding authBinding=authOrigin==null?null:new BrowserHttpAuthOrigin.Binding(authOrigin,t.navigation);
  java.util.function.BooleanSupplier bound=()->authBinding!=null&&authBinding.admits(authSnapshot(t,host,realm))&&siteDialogTab==t;
  android.widget.EditText user=AlphaSignInFields.field(getActivity(),authOrigin,bound,false,config().autofillExtras);
  android.widget.EditText pass=AlphaSignInFields.field(getActivity(),authOrigin,bound,true,config().autofillExtras);
  form.addView(user);form.addView(pass);
  String label=BrowserTabHostConfig.realmLabel(realm);
  // Name the password manager only when Android has one enabled for this app. Whether a third-party
  // provider fills a browser prompt is its own policy, so that case is stated conditionally.
  AutofillManager autofillState=getActivity().getSystemService(AutofillManager.class);
  boolean autofillOn=authOrigin!=null&&autofillState!=null&&autofillState.isEnabled();
  // A refused binding has one reason sentence (BrowserHttpAuthOrigin.REFUSAL), which Alpha words itself.
  AlphaBrowserCopy.Manager manager=authOrigin==null?AlphaBrowserCopy.Manager.REFUSED:!autofillOn?AlphaBrowserCopy.Manager.OFF:autofillState.hasEnabledAutofillServices()?AlphaBrowserCopy.Manager.ALPHA:AlphaBrowserCopy.Manager.OTHER;
  String message=AlphaBrowserCopy.signInMessage(asked,label,manager,authOrigin,t.authAttempts>1);
  boolean[] answered={false};
  // The buttons are wired after show() so Sign in can keep the prompt open while the site
  // answers, and Cancel ends the Autofill session before the fields disappear.
  AlertDialog dialog=new AlertDialog.Builder(getActivity()).setTitle(AlphaBrowserCopy.SIGN_IN).setMessage(message).setView(form)
   .setPositiveButton(AlphaBrowserCopy.SIGN_IN,null).setNegativeButton(AlphaBrowserCopy.CANCEL,null).create();
  // Back would dismiss before any listener could cancel the session; Cancel is the way out.
  dialog.setCancelable(authOrigin==null);dialog.setCanceledOnTouchOutside(false);
  // Cancelling the page's own sign-in stops the load; for a resource of an already shown page it only notes it.
  showSiteDialog(t,dialog,()->{if(answered[0])return;handler.cancel();if(tabs.get(t.id)!=t||t.dead)return;if(t.committed)notice(t,"Sign-in was cancelled.");else fail(t,"Sign-in was cancelled. Reload to try again.");});
  siteDialogAutofill=authOrigin!=null;
  siteDialogRevoke=()->{if(authBinding!=null)authBinding.revoke();AlphaSignInFields.exclude(user,pass);};
  dialog.getButton(AlertDialog.BUTTON_NEGATIVE).setOnClickListener(v->{if(siteDialog==dialog)dismissSiteDialogs();else dialog.dismiss();});
  dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
   if(answered[0]||siteDialog!=dialog)return;answered[0]=true;siteDialogCancel=null;
   String u=user.getText().toString(),p=pass.getText().toString();
   if(tabs.get(t.id)!=t||t.dead){handler.cancel();dismissSiteDialogs();return;}
   if(authOrigin==null){user.setText("");pass.setText("");dismissSiteDialogs();handler.proceed(u,p);return;}
   // Keep the fields (and the provider's view of them) until the site answers: Save is offered
   // only after this load commits at authOrigin; a repeated challenge or failure cancels.
   t.authSaveOrigin=authOrigin;authBinding.submitted();
   v.setEnabled(false);dialog.setMessage(message+AlphaBrowserCopy.SIGNING_IN);
   handler.proceed(u,p);
  });
 }
 // ---- Camera for capture-enabled file inputs ---------------------------------------
 static boolean captureType(String[] accept){return BrowserTabHostConfig.captureType(accept);}
 private void cameraForFile(Tab t){
  long revision=fileNavigation;
  java.util.function.Consumer<Boolean> launch=ok->{
   if(!ok||fileTab!=t||t.dead||t.navigation!=revision){pickerOutstanding=false;cancelFile();if(!ok)notice(t,"Android has not allowed "+config().appName+" to use the camera. You can allow it in Android Settings.");return;}
   try{
    android.content.ContentValues values=new android.content.ContentValues();
    values.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME,config().storagePrefix+"-"+UUID.randomUUID().toString().substring(0,8)+".jpg");
    values.put(android.provider.MediaStore.MediaColumns.MIME_TYPE,"image/jpeg");
    values.put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH,android.os.Environment.DIRECTORY_PICTURES);
    pictureUri=getContext().getContentResolver().insert(android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI,values);
    if(pictureUri==null)throw new IllegalStateException();
    takePicture.launch(pictureUri);
   }catch(Exception unavailable){if(pictureUri!=null)try{getContext().getContentResolver().delete(pictureUri,null,null);}catch(Exception ignored){}pictureUri=null;pickerOutstanding=false;cancelFile();notice(t,"The camera is unavailable.");}
  };
  if(granted(android.Manifest.permission.CAMERA)){launch.accept(true);return;}
  if(runtimeResult!=null){pickerOutstanding=false;cancelFile();return;}
  runtimeResult=answers->launch.accept(granted(android.Manifest.permission.CAMERA));
  try{runtimePermissions.launch(androidPermissions("camera"));}catch(RuntimeException unavailable){runtimeResult=null;pickerOutstanding=false;cancelFile();}
 }
 private void pictureTaken(Boolean saved){
  pickerOutstanding=false;Uri photo=pictureUri;pictureUri=null;ValueCallback<Uri[]> callback=fileCallback;Tab tab=fileTab;fileCallback=null;fileTab=null;
  boolean ok=Boolean.TRUE.equals(saved)&&photo!=null&&callback!=null&&tab!=null&&!tab.dead&&tabs.get(tab.id)==tab&&tab.navigation==fileNavigation;
  if(!ok&&photo!=null)try{getContext().getContentResolver().delete(photo,null,null);}catch(Exception ignored){}
  if(callback!=null)callback.onReceiveValue(ok?new Uri[]{photo}:null);
 }
 // ---- Fullscreen video and other custom views --------------------------------------
 private void enterFullscreen(Tab t,View view,WebChromeClient.CustomViewCallback callback){
  if(customView!=null||!promptable(t)){callback.onCustomViewHidden();return;}
  customView=view;customCallback=callback;fullscreenTab=t;
  fullscreen=new FrameLayout(getActivity());fullscreen.setBackgroundColor(0xff000000);
  fullscreen.addView(view,new FrameLayout.LayoutParams(-1,-1));
  ((ViewGroup)getActivity().findViewById(android.R.id.content)).addView(fullscreen,new FrameLayout.LayoutParams(-1,-1));
  WindowInsetsControllerCompat bars=WindowCompat.getInsetsController(getActivity().getWindow(),getActivity().getWindow().getDecorView());
  bars.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);bars.hide(WindowInsetsCompat.Type.systemBars());
  // Back leaves fullscreen first. Added last, so it runs before Capacitor's own Back handling.
  fullscreenBack=new OnBackPressedCallback(true){@Override public void handleOnBackPressed(){exitFullscreen(true);}};
  getActivity().getOnBackPressedDispatcher().addCallback(fullscreenBack);
  JSObject event=new JSObject();event.put("session",session);event.put("id",t.id);event.put("active",true);notifyListeners("fullscreen",event);
 }
 /** Leave fullscreen. tellPage=true when the host, not the page, ends it. */
 private void exitFullscreen(boolean tellPage){
  if(customView==null)return;
  View view=customView;WebChromeClient.CustomViewCallback callback=customCallback;Tab t=fullscreenTab;
  customView=null;customCallback=null;fullscreenTab=null;
  if(fullscreenBack!=null){fullscreenBack.remove();fullscreenBack=null;}
  if(fullscreen!=null){fullscreen.removeView(view);if(fullscreen.getParent()!=null)((ViewGroup)fullscreen.getParent()).removeView(fullscreen);fullscreen=null;}
  WindowCompat.getInsetsController(getActivity().getWindow(),getActivity().getWindow().getDecorView()).show(WindowInsetsCompat.Type.systemBars());
  if(tellPage&&callback!=null)try{callback.onCustomViewHidden();}catch(RuntimeException ignored){}
  if(t!=null){JSObject event=new JSObject();event.put("session",session);event.put("id",t.id);event.put("active",false);notifyListeners("fullscreen",event);}
 }
 // ---- Find in page -----------------------------------------------------------------
 private void findResult(Tab t,int ordinal,int count,boolean done){
  if(t.findQuery==null||tabs.get(t.id)!=t)return;
  JSObject event=new JSObject();event.put("session",session);event.put("id",t.id);event.put("navigation",String.valueOf(t.navigation));
  event.put("index",count==0?0:ordinal+1);event.put("count",count);event.put("done",done);notifyListeners("findResult",event);
 }
 /** Navigation, tab change and close clear the highlights and tell the renderer. */
 private void clearFind(Tab t){
  if(t.findQuery==null)return;t.findQuery=null;
  if(!t.dead)t.web.clearMatches();
  if(tabs.get(t.id)!=t)return;
  JSObject event=new JSObject();event.put("session",session);event.put("id",t.id);event.put("cleared",true);event.put("index",0);event.put("count",0);event.put("done",true);notifyListeners("findResult",event);
 }
 @PluginMethod public void find(PluginCall call) { run(call,t->{
  String query=call.getString("query","");
  if(!BrowserTabHostConfig.validFindQuery(query))throw new IllegalArgumentException();
  // An emptied search box removes the highlights but keeps the find bar open.
  if(query.isEmpty()){if(t.findQuery!=null){t.findQuery=null;t.web.clearMatches();}return;}
  if(!t.committed||!t.error.isEmpty())throw new IllegalStateException();
  t.findQuery=query;t.web.findAllAsync(query);
 }); }
 @PluginMethod public void findNext(PluginCall call) { run(call,t->{ if(t.findQuery!=null)t.web.findNext(!Boolean.FALSE.equals(call.getBoolean("forward",true))); }); }
 @PluginMethod public void clearFind(PluginCall call) { run(call,this::clearFind); }
 /** Once per install, when the first tab opens: say plainly that passkeys are unsupported and
  * what to use instead. Informational only; it does not detect a passkey sign-in. */
 private void passkeyNotice(Tab t){
  android.content.SharedPreferences notices=getContext().getSharedPreferences(config().noticePreferences,0);
  if(notices.getBoolean("passkeys-unavailable",false))return;
  notices.edit().putBoolean("passkeys-unavailable",true).apply();
  notice(t,"Passkeys are not supported in "+config().browserName+". Use a password or open the page in another browser from the menu.");
 }
 private void notice(Tab t,String message) { if(tabs.get(t.id)!=t)return; JSObject event=new JSObject(); event.put("session",session); event.put("id",t.id); event.put("message",message); notifyListeners("notice",event); }
 /** target=_blank links and window.open open a new tab in the opener's profile.
  * Only a user gesture in the selected, committed tab may open one; the opener
  * is untrusted, so the new tab gets the same policy and no app bridge. */
 private boolean popup(Tab opener,boolean gesture,android.os.Message message) {
  if(paused||destroyed||opener.dead||tabs.get(opener.id)!=opener||!Objects.equals(presentedId,opener.id)||!opener.committed||!opener.error.isEmpty()){return false;}
  if(!gesture){notice(opener,"Blocked a pop-up that opened without a tap.");return false;}
  if(tabs.size()>=config().maxTabs){notice(opener,"Close a tab to open this link in a new tab.");return false;}
  if(!(message.obj instanceof WebView.WebViewTransport))return false;
  String id="p"+UUID.randomUUID().toString().replace("-","");
  Tab child;
  try{child=build(id,opener.priv,opener.profile);}catch(Exception unavailable){notice(opener,"This link could not open in a new tab.");return false;}
  child.opener=opener.id;
  loading(child);
  ((WebView.WebViewTransport)message.obj).setWebView(child.web);message.sendToTarget();
  JSObject event=new JSObject();event.put("session",session);event.put("id",id);event.put("opener",opener.id);event.put("private",child.priv);
  notifyListeners("tabOpened",event);emit(child);
  return true;
 }
 private boolean ownsRoute(Intent intent) {
  String own=getContext().getPackageName();
  if(own.equals(intent.getPackage()))return true;
  for(android.content.pm.ResolveInfo info:getContext().getPackageManager().queryIntentActivities(intent,0))
   if(info.activityInfo!=null&&own.equals(info.activityInfo.packageName))return true;
  return false;
 }
 /**
  * Hand a tapped mailto/tel/sms/geo/intent/market link to Android. The page stays loaded. A mail,
  * phone, text or map link goes to Android also when this host is the handler (a host that is the
  * dialer still opens its dial pad; no call is placed). Other links never open this host.
  */
 private void handoff(Tab t,String raw,boolean gesture) {
  if(paused||destroyed||t.dead||tabs.get(t.id)!=t)return;
  // A tapped target=_blank link to another app first opens a pop-up tab whose
  // creation was already gesture-gated in popup(). That still-empty pop-up may
  // hand off exactly once and then closes, so an opener script cannot reuse it.
  Tab opener=t.opener==null?null:tabs.get(t.opener);
  boolean fresh=opener!=null&&!t.handedOff&&!t.committed&&t.lastCommittedUrl.isEmpty();
  Tab report=fresh?opener:t;
  if(fresh)t.handedOff=true;
  boolean shownSelf=Objects.equals(presentedId,t.id),shownOpener=fresh&&Objects.equals(presentedId,opener.id);
  // Resolve the app link only for a tab that may hand off at all.
  Intent intent=(fresh?(shownSelf||shownOpener):(shownSelf&&gesture))?BrowserExternalHandoff.intentFor(raw,getContext().getPackageName(),config().hostSchemes):null;
  boolean supported=intent!=null&&(BrowserExternalLinkPolicy.systemLink(raw)||!ownsRoute(intent));
  // A private tab leaves private browsing only after the owner says so, as the menu's
  // "Open in another browser" does. The tap and pop-up rules hold first (LinkHandoff).
  switch(LinkHandoff.decide(fresh,shownSelf,shownOpener,gesture,supported,t.priv||report.priv)){
   case IGNORE:if(!fresh)settleLeftWeb(t);return;
   case CLOSE_POPUP:closePopup(t);return;
   case BLOCKED:if(loadFallback(t,raw))return;notice(t,"Blocked a link to another app that opened without a tap.");settleLeftWeb(t);return;
   case UNSUPPORTED:if(!fresh&&loadFallback(t,raw))return;notice(report,"This link type is not supported.");if(fresh)closePopup(t);else settleLeftWeb(t);return;
   case ASK:{
    long revision=report.navigation,shown=presentationRevision;
    AlertDialog dialog=new AlertDialog.Builder(getActivity()).setTitle(AlphaBrowserCopy.LEAVE_PRIVATE_TITLE).setMessage(AlphaBrowserCopy.LEAVE_PRIVATE_LINK)
     .setPositiveButton(AlphaBrowserCopy.OPEN_APP,(d,w)->{siteDialogCancel=null;
      if(!LinkHandoff.answerStillValid(!paused&&!destroyed,!report.dead&&tabs.get(report.id)==report,revision,report.navigation,shown,presentationRevision,fresh,tabs.get(t.id)==t)){if(fresh)closePopup(t);return;}
      launchHandoff(t,report,fresh,raw,intent);})
     .setNegativeButton(AlphaBrowserCopy.CANCEL,null).create();
    showSiteDialog(report,dialog,()->{if(fresh)closePopup(t);});
    return;
   }
   default:launchHandoff(t,report,fresh,raw,intent);
  }
 }
 /** A link to an app that names a web page to use instead (Chrome's browser_fallback_url) opens that page in the tab. */
 private boolean loadFallback(Tab t,String raw) {
  String fallback=BrowserExternalHandoff.fallback(raw);
  if(fallback==null||!safe(fallback))return false;
  load(t,fallback);return true;
 }
 /** A load the host started that went to an app link instead of a page: the tab shows its page again, or asks for an address, rather than waiting out its timer. */
 private void settleLeftWeb(Tab t) {
  if(!t.loading||t.committed||t.documentStarted||restoreCommitted(t))return;
  clearTimeout(t);t.loading=false;t.web.setVisibility(View.INVISIBLE);t.message.setText(AlphaBrowserCopy.LEFT_WEB);t.message.setVisibility(View.VISIBLE);emit(t);
 }
 private void launchHandoff(Tab t,Tab report,boolean fresh,String raw,Intent intent) {
  for(Tab tab:tabs.values())disableAutofill(tab);
  try{getActivity().startActivity(intent);if(fresh)closePopup(t);}
  catch(android.content.ActivityNotFoundException missing){
   String fallback=BrowserExternalHandoff.fallback(raw);
   if(fallback!=null&&safe(fallback))load(t,fallback);
   else{notice(report,"No app on this device can open this link.");if(fresh)closePopup(t);}
  }
  catch(RuntimeException blocked){notice(report,"This link could not be opened.");if(fresh)closePopup(t);}
 }
 private void tabClosed(String id){JSObject event=new JSObject();event.put("session",session);event.put("id",id);notifyListeners("tabClosed",event);}
 /** Close a pop-up after its callback returns; a WebView is not destroyed inside its own callback. */
 private void closePopup(Tab t){navigationHandler.post(()->{if(tabs.get(t.id)!=t)return;tabs.remove(t.id);dispose(t);tabClosed(t.id);});}
 @PluginMethod public void navigate(PluginCall call) { String url=call.getString("url"); if (url==null || !safe(url)) { call.reject("Enter an HTTP or HTTPS address without credentials"); return; } run(call,t -> load(t,url)); }
 /** The HTTPS form of an address Android would refuse in the clear (typed, agent, bookmark, restored, link or redirect), or null. */
 private String upgradedAddress(String url) {
  String host=TabNavigation.httpHost(url);
  boolean cleartext=host!=null&&android.security.NetworkSecurityPolicy.getInstance().isCleartextTrafficPermitted(host);
  return TabNavigation.httpsUpgrade(url,cleartext,config().allowLoopback);
 }
 /** The host loads {@code url} in the tab, over HTTPS when it would otherwise be refused. */
 private void load(Tab t,String url) {
  String secure=upgradedAddress(url),target=secure==null?url:secure;
  t.url=target; loading(t); if(secure!=null)t.upgradedHost=TabNavigation.httpHost(url); emit(t);
  if(t.readingWorld!=null)t.readingWorld.prepare(target); t.web.loadUrl(target);
 }
 /** Reloading a page that came from a form asks before sending the form again, as Chrome does; anything but Send again keeps the page as it was. */
 private void resubmission(Tab t,android.os.Message dontResend,android.os.Message resend) {
  Runnable keep=()->{dontResend.sendToTarget();if(!restoreCommitted(t))fail(t,"Loading stopped. Reload from the menu to try again.");};
  if(!promptable(t)){keep.run();return;}
  AlertDialog dialog=new AlertDialog.Builder(getActivity()).setTitle(AlphaBrowserCopy.RESUBMIT_TITLE).setMessage(AlphaBrowserCopy.RESUBMIT_MESSAGE)
   .setPositiveButton(AlphaBrowserCopy.RESUBMIT,(d,w)->{siteDialogCancel=null;resend.sendToTarget();})
   .setNegativeButton(AlphaBrowserCopy.CANCEL,null).create();
  showSiteDialog(t,dialog,keep);
 }
 @PluginMethod public void command(PluginCall call) { run(call,t -> { String expected=call.getString("navigation");if(expected!=null&&(paused||!getActivity().hasWindowFocus()||siteDialog!=null||!expected.equals(String.valueOf(t.navigation))))throw new IllegalStateException("Browser foreground or document changed"); String op=call.getString("command"); if ("back".equals(op)) { if(t.web.canGoBack()){loading(t);if(t.readingWorld!=null)t.readingWorld.prepareHistory(-1);t.web.goBack();} } else if ("forward".equals(op)) { if(t.web.canGoForward()){loading(t);if(t.readingWorld!=null)t.readingWorld.prepareHistory(1);t.web.goForward();} } else if ("reload".equals(op)) {loading(t);if(t.readingWorld!=null)t.readingWorld.prepare(t.web.getUrl());t.web.reload();} else if ("stop".equals(op)) { clearTimeout(t); if(!t.committed)fail(t,"Loading stopped. Reload from the menu to try again."); else {t.web.stopLoading();t.loading=false;syncAutofill(t);} } else throw new IllegalArgumentException(); emit(t); }); }
 private TabInputRouter tabInputRouter;
 /** Below-host tabs take their gestures through one router placed just above Alpha's WebView. */
 private TabInputRouter ensureTabInputRouter() {
  if(tabInputRouter==null)tabInputRouter=new TabInputRouter(getActivity(),()->{
   ArrayList<TabFrame> shown=new ArrayList<>();
   if(!paused&&!destroyed)for(Tab tab:tabs.values())
    if(!tab.dead&&Objects.equals(presentedId,tab.id)&&tab.frame.getLayer()==TabLayer.BELOW_HOST&&tab.frame.isShown())shown.add(tab.frame);
   return shown;
  });
  return tabInputRouter;
 }
 private void releaseTabInputRouter() {
  if(tabs.values().stream().anyMatch(tab->tab.frame!=null&&tab.frame.getLayer()==TabLayer.BELOW_HOST))return;
  if(tabInputRouter!=null&&tabInputRouter.getParent() instanceof ViewGroup)((ViewGroup)tabInputRouter.getParent()).removeView(tabInputRouter);
  tabInputRouter=null;
 }
 /** Change only the native wrapper; the website, profile, history and form stay alive. */
 private void presentLayer(Tab tab,TabLayer layer,ViewGroup host,View branch) {
  if(tab.frame.getLayer()!=layer){
   TabFrame before=tab.frame,next=new TabFrame(getActivity(),layer);
   next.setClipChildren(true);next.setVisibility(View.GONE);
   while(before.getChildCount()>0){View child=before.getChildAt(0);before.removeView(child);next.addView(child);}
   if(before.getParent() instanceof ViewGroup)((ViewGroup)before.getParent()).removeView(before);
   tab.frame=next;
   host.addView(next,layer==TabLayer.BELOW_HOST?host.indexOfChild(branch):host.getChildCount());
  }
  if(layer==TabLayer.BELOW_HOST){
   getBridge().getWebView().setBackgroundColor(android.graphics.Color.TRANSPARENT);
   TabInputRouter.placeRouter(host,branch,ensureTabInputRouter());
  }else tab.frame.bringToFront();
  releaseTabInputRouter();
 }
 /** Invalid geometry withdraws the old input authority rather than routing through stale chrome. */
 private void rejectPresentation(PluginCall call,String reason) {
  selectPresentation(null);cancelFile();dismissSiteDialogs();exitFullscreen(true);if(reading!=null)reading.check();
  for(Tab tab:tabs.values()){disableAutofill(tab);tab.frame.setHostRectsReceived(false);tab.frame.setVisibility(View.GONE);}
  call.reject(reason);
 }
 @PluginMethod public void present(PluginCall call) { getActivity().runOnUiThread(() -> {if(closed(call))return;
  if (!Objects.equals(session,call.getString("session"))) { call.reject("Expired browser session"); return; }
  String nextId=call.getString("id");
  Object rawLayer=call.getData().opt("layer");
  if(rawLayer==org.json.JSONObject.NULL)rawLayer=null;
  TabLayer layer=TabLayer.parse(rawLayer);
  if(layer==null){rejectPresentation(call,"Unknown browser layer");return;}
  Tab next=tabs.get(nextId);
  ViewGroup host=(ViewGroup)getActivity().findViewById(android.R.id.content);
  View branch=TabInputRouter.hostBranch(host,getBridge().getWebView());
  float x=call.getFloat("x",0f),y=call.getFloat("y",0f),width=call.getFloat("width",0f),height=call.getFloat("height",0f);
  ArrayList<HostRect> hostRects=new ArrayList<>();
  if(next!=null&&layer==TabLayer.BELOW_HOST){
   JSArray rawRects=call.getArray("hostRects");
   float density=getContext().getResources().getDisplayMetrics().density;
   if(branch==null||rawRects==null||rawRects.length()>128||!(call.getData().opt("x") instanceof Number)||!(call.getData().opt("y") instanceof Number)||!(call.getData().opt("width") instanceof Number)||!(call.getData().opt("height") instanceof Number)||!Float.isFinite(x*density)||!Float.isFinite(y*density)||!Float.isFinite(width*density)||!Float.isFinite(height*density)||width<0||height<0){rejectPresentation(call,"Below-host browser requires current host geometry");return;}
   for(int index=0;index<rawRects.length();index++){
    org.json.JSONObject rect=rawRects.optJSONObject(index);
    if(rect==null){rejectPresentation(call,"Invalid browser host rectangle");return;}
    double rx=rect.optDouble("x",Double.NaN),ry=rect.optDouble("y",Double.NaN),rw=rect.optDouble("width",Double.NaN),rh=rect.optDouble("height",Double.NaN),radius=rect.optDouble("cornerRadius",0);
    if(!Double.isFinite(rx)||!Double.isFinite(ry)||!Double.isFinite(rw)||!Double.isFinite(rh)||!Double.isFinite(radius)||rw<0||rh<0||radius<0){rejectPresentation(call,"Invalid browser host rectangle");return;}
    float left=(float)((rx-x)*density),top=(float)((ry-y)*density),right=(float)((rx-x+rw)*density),bottom=(float)((ry-y+rh)*density),corner=(float)(radius*density);
    if(!Float.isFinite(left)||!Float.isFinite(top)||!Float.isFinite(right)||!Float.isFinite(bottom)||!Float.isFinite(corner)){rejectPresentation(call,"Invalid browser host rectangle");return;}
    hostRects.add(new HostRect(left,top,right,bottom,corner));
   }
  }
  // Revoke selected-tab authority before any synchronous framework callback.
  selectPresentation(nextId);if(reading!=null)reading.check();
  for(Tab old:tabs.values())if(!Objects.equals(old.id,presentedId)){disableAutofill(old);clearFind(old);if(siteDialogTab==old)dismissSiteDialogs();if(fullscreenTab==old)exitFullscreen(true);old.frame.setVisibility(View.GONE);}
  Tab t=tabs.get(call.getString("id")); if(t!=null) { float d=getContext().getResources().getDisplayMetrics().density;
   presentLayer(t,layer,host,branch);
   FrameLayout.LayoutParams p=new FrameLayout.LayoutParams(Math.max(0,Math.round(width*d)),Math.max(0,Math.round(height*d)));p.leftMargin=Math.round(x*d);p.topMargin=Math.round(y*d);
   t.frame.setLayoutParams(p);t.frame.setOcclusions(hostRects);t.frame.setHostRectsReceived(layer==TabLayer.BELOW_HOST&&!paused);
   t.frame.setVisibility(paused?View.GONE:View.VISIBLE);syncAutofill(t);
   if(!paused)resumeTimeout(t);
  } call.resolve();
 }); }
 private boolean bookmarkSession(PluginCall call) {
  String requested=call.getString("session");
  if(requested==null||requested.isEmpty()||requested.length()>100||(session!=null&&!session.equals(requested))){call.reject("Expired browser session");return false;}
  session=requested;return true;
 }
 private JSObject bookmarkResult(ArrayList<String> urls) { JSObject result=new JSObject();JSArray list=new JSArray();for(String url:urls)list.put(url);result.put("urls",list);return result; }
 @PluginMethod public void bookmarks(PluginCall call) { getActivity().runOnUiThread(()->{if(closed(call))return;
  if(!bookmarkSession(call))return;
  try{call.resolve(bookmarkResult(bookmarks.read()));}catch(Exception unavailable){call.reject("Saved bookmarks could not be read. Existing bookmarks were not changed.");}
 }); }
 @PluginMethod public void setBookmark(PluginCall call) { getActivity().runOnUiThread(()->{if(closed(call))return;
  if(!bookmarkSession(call))return;
  String url=call.getString("url");Boolean saved=call.getBoolean("saved");
  if(!BrowserBookmarkStore.valid(url)||saved==null){call.reject("Only HTTPS addresses without embedded credentials can be bookmarked.");return;}
  try{call.resolve(bookmarkResult(bookmarks.change(url,saved)));}catch(Exception unavailable){call.reject("Bookmark could not be saved. The device stores up to 100 bookmarks; existing data was not changed.");}
 }); }
 @PluginMethod public void browsingState(PluginCall call) { getActivity().runOnUiThread(()->{if(closed(call))return;
  if(!bookmarkSession(call))return;
  try{call.resolve(JSObject.fromJSONObject(sessionStore.read()));}catch(Exception unavailable){call.reject("Saved tabs and history could not be read. They were not changed.");}
 }); }
 /** Normal tabs and history only; the renderer never sends private tabs. */
 @PluginMethod public void saveBrowsingState(PluginCall call) { getActivity().runOnUiThread(()->{if(closed(call))return;
  if(!bookmarkSession(call))return;
  if(clearing){call.reject("Browsing data is being cleared.");return;}
  try{
   org.json.JSONObject state=new org.json.JSONObject();
   state.put("history",call.getArray("history",new JSArray()));state.put("tabs",call.getArray("tabs",new JSArray()));state.put("cur",call.getString("cur",""));
   call.resolve(JSObject.fromJSONObject(sessionStore.write(state)));
  }catch(Exception unavailable){call.reject("Tabs and history could not be saved.");}
 }); }
 /** Clear browsing data: cookies and site data, history and cache of the
  * persistent normal-tab profile. Open normal tabs close first so a live page
  * cannot rewrite its data; private tabs are unaffected. Bookmarks remain. */
 @PluginMethod public void clearBrowsingData(PluginCall call) { getActivity().runOnUiThread(()->{if(closed(call))return;
  if(!bookmarkSession(call))return;
  if(clearing){call.reject("Browsing data is already being cleared.");return;}
  if(!WebViewFeature.isFeatureSupported(WebViewFeature.MULTI_PROFILE)||!WebViewFeature.isFeatureSupported(WebViewFeature.DELETE_BROWSING_DATA)){call.reject("This Android WebView cannot clear browser data. Update Android System WebView.");return;}
  clearing=true;JSArray closed=new JSArray();
  for(Tab tab:new ArrayList<>(tabs.values()))if(!tab.priv){tabs.remove(tab.id);dispose(tab);closed.put(tab.id);tabClosed(tab.id);}
  try{sessionStore.clear();sessionStore.clearPermissions();downloads.clearHistory();}catch(Exception unavailable){clearing=false;call.reject("Browsing history could not be cleared.");return;}
  // WebView.destroy posts native destruction; clear after those tasks.
  navigationHandler.post(()->{
   try{
    androidx.webkit.Profile profile=ProfileStore.getInstance().getOrCreateProfile(config().persistentProfile);
    CookieManager cookies=profile.getCookieManager();
    cookies.removeAllCookies(removed->{
     try{WebStorageCompat.deleteBrowsingData(profile.getWebStorage(),()->{cookies.flush();clearing=false;JSObject result=new JSObject();result.put("closed",closed);call.resolve(result);});}
     catch(Exception unavailable){clearing=false;call.reject("Website data could not be cleared.");}
    });
   }catch(Exception unavailable){clearing=false;call.reject("Website data could not be cleared.");}
  });
 }); }
 /** Cookies and storage for the selected tab's site (registrable domain) only. */
 @PluginMethod public void clearSiteData(PluginCall call) { getActivity().runOnUiThread(()->{if(closed(call))return;
  if(!Objects.equals(session,call.getString("session"))){call.reject("Expired browser session");return;}
  Tab t=tabs.get(call.getString("id"));
  if(t==null||t.dead||!safe(t.url)||!Objects.equals(call.getString("url"),t.url)){call.reject("Load a website before clearing its data.");return;}
  if(!WebViewFeature.isFeatureSupported(WebViewFeature.DELETE_BROWSING_DATA)){call.reject("This Android WebView cannot clear site data.");return;}
  try{
   String[] site=new String[1];
   site[0]=WebStorageCompat.deleteBrowsingDataForSite(WebViewCompat.getProfile(t.web).getWebStorage(),Uri.parse(t.url).getHost(),()->{JSObject result=new JSObject();result.put("site",site[0]);call.resolve(result);});
   // The site's download entries and (normal profile only) its permission decisions go too.
   String cleared=site[0]==null?Uri.parse(t.url).getHost():site[0];
   downloads.clearSite(cleared);
   if(!t.priv)try{sessionStore.clearPermissionsForSite(cleared);}catch(Exception unavailable){notice(t,"Website permissions for this site could not be cleared. Use Clear browsing data.");}
  }catch(Exception unavailable){call.reject("Site data could not be cleared.");}
 }); }
 /** A fact about this WebView provider, not about a page, tab or session: whether page reading can work at all. */
 @PluginMethod public void readingSupport(PluginCall call) { JSObject out=new JSObject();out.put("available",BrowserReadingWorld.supported());call.resolve(out); }
 @PluginMethod public void reviewQuestion(PluginCall call) { reviewPage(call,true); }
 @PluginMethod public void reviewReading(PluginCall call) { reviewPage(call,false); }
 private void reviewPage(PluginCall call,boolean question) { getActivity().runOnUiThread(()->{if(closed(call))return;
  Tab tab=tabs.get(call.getString("id"));String owner=session,url=call.getString("url"),navigation=call.getString("navigation");
  java.util.function.BooleanSupplier current=()->!destroyed&&!paused&&Objects.equals(owner,session)&&Objects.equals(session,call.getString("session"))&&tab!=null&&tabs.get(tab.id)==tab&&!tab.dead&&Objects.equals(presentedId,tab.id)&&tab.web.isShown()&&tab.committed&&!tab.loading&&tab.error.isEmpty()&&Objects.equals(url,tab.url)&&Objects.equals(url,tab.web.getUrl())&&Objects.equals(navigation,String.valueOf(tab.navigation))&&url!=null&&url.startsWith("https://");
  if(!current.getAsBoolean()){call.reject("Load a visible HTTPS page before reading");return;}
  if(question)reading.reviewQuestion(call,tab.id,tab.web,tab.readingWorld,current);else reading.review(call,tab.id,tab.web,tab.readingWorld,current);
 }); }
 /**
  * The open page for one chat turn, without a review: the owner turns this off under Settings,
  * Privacy, Browser page for Alpha, and the renderer asks only while that is on. Only the tab
  * Browser presents, with the committed HTTPS page the renderer observed; never a private tab.
  * A sensitive address, a page without an isolated world, a slow read or a malformed result
  * resolves as withheld, with the address (no query for a sensitive one) and title only.
  */
 @PluginMethod public void pageContext(PluginCall call) { getActivity().runOnUiThread(()->{if(closed(call))return;
  Tab tab=tabs.get(call.getString("id"));String owner=session,url=call.getString("url"),navigation=call.getString("navigation");
  java.util.function.BooleanSupplier current=()->!destroyed&&!paused&&Objects.equals(owner,session)&&Objects.equals(session,call.getString("session"))&&tab!=null&&tabs.get(tab.id)==tab&&!tab.dead&&Objects.equals(presentedId,tab.id)&&tab.committed&&!tab.loading&&tab.error.isEmpty()&&Objects.equals(url,tab.url)&&Objects.equals(url,tab.web.getUrl())&&Objects.equals(navigation,String.valueOf(tab.navigation));
  if(!current.getAsBoolean()){call.reject("Browser page changed","page-changed");return;}
  if(tab.priv){call.reject("Private tabs are never shared","private-tab");return;}
  String address=AlphaPageContext.address(url),title=AlphaPageContext.title(tab.web.getTitle());
  if(address==null){call.reject("Only public HTTPS pages are shared","not-public");return;}
  java.util.function.Consumer<String> withheld=reason->{JSObject out=new JSObject();out.put("url",AlphaPageContext.SENSITIVE_PAGE.equals(reason)?AlphaPageContext.origin(url):address);out.put("title",title);out.put("withheld",reason);call.resolve(out);};
  if(BrowserPageReading.sensitiveUrl(url)){withheld.accept(AlphaPageContext.SENSITIVE_PAGE);return;}
  BrowserReadingWorld world=tab.readingWorld;
  if(world==null||!world.available()||!world.ready()){withheld.accept(AlphaPageContext.UNREADABLE);return;}
  final boolean[] answered={false};
  Runnable unreadable=()->{if(answered[0])return;answered[0]=true;withheld.accept(AlphaPageContext.UNREADABLE);};
  new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(unreadable,1000);
  world.evaluate(AlphaPageContext.SCRIPT,encoded->{
   if(answered[0])return;
   if(!current.getAsBoolean()){answered[0]=true;call.reject("Browser page changed","page-changed");return;}
   org.json.JSONObject result;
   try{result=AlphaPageContext.accept(new org.json.JSONTokener(encoded).nextValue());}catch(Exception error){result=null;}
   if(result==null){unreadable.run();return;}
   if(result.has("withheld")){answered[0]=true;withheld.accept(result.optString("withheld"));return;}
   try{answered[0]=true;JSObject out=JSObject.fromJSONObject(result);out.put("url",address);out.put("title",title);call.resolve(out);}catch(Exception error){answered[0]=false;unreadable.run();}
  },unreadable);
 }); }
 @PluginMethod public void cancelReading(PluginCall call) { getActivity().runOnUiThread(()->{if(closed(call))return;if(Objects.equals(session,call.getString("session")))reading.cancel();call.resolve();}); }
 /** Releases the approved excerpt once to the host's bound speech request. */
 public String consumeReading(PluginCall call)throws Exception{return reading.consume(call);}
 @PluginMethod public void share(PluginCall call) { run(call,t->{
  // The renderer supplies only identity/revision guards. Page data comes from
  // the committed native document, never caller-provided share text or title.
  if(paused||destroyed||shareOutstanding||pickerOutstanding||!Objects.equals(presentedId,t.id)||!t.web.isShown()||!t.committed||t.loading||!t.error.isEmpty()
    ||!Objects.equals(call.getString("navigation"),String.valueOf(t.navigation))||!Objects.equals(call.getString("url"),t.url)||!Objects.equals(t.web.getUrl(),t.url)||!safe(t.url)||t.url.length()>4096||t.url.chars().anyMatch(c->c<32||c==127))throw new IllegalStateException("Current page changed");
  String title=t.web.getTitle();if(title==null||title.length()>512||title.chars().anyMatch(c->c<32||c==127))title=Uri.parse(t.url).getHost();
  Intent send=new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT,t.url).putExtra(Intent.EXTRA_SUBJECT,title).putExtra(Intent.EXTRA_TITLE,title);
  for(Tab tab:tabs.values())disableAutofill(tab);
  shareOutstanding=true;try{pageShare.launch(Intent.createChooser(send,AlphaBrowserCopy.SHARE_PAGE));}catch(RuntimeException failure){shareOutstanding=false;throw failure;}
 }); }
 /** Explicit user handoff of the unchanged visible HTTPS page to an installed browser. */
 @PluginMethod public void openExternalBrowser(PluginCall call) { getActivity().runOnUiThread(()->{if(closed(call))return;
  Tab t=tabs.get(call.getString("id"));
  if(!Objects.equals(session,call.getString("session"))||t==null||t.dead||paused||destroyed||shareOutstanding||pickerOutstanding
   ||!Objects.equals(presentedId,t.id)||!t.web.isShown()||!t.committed||t.loading||!t.error.isEmpty()
   ||!Objects.equals(call.getString("navigation"),String.valueOf(t.navigation))||!Objects.equals(call.getString("url"),t.url)||!Objects.equals(t.web.getUrl(),t.url)
   ||!BrowserExternalPage.allowed(t.url,getBridge().getWebView().getUrl())||(t.priv&&!Boolean.TRUE.equals(call.getBoolean("privateConfirmed")))){call.reject("The visible HTTPS page changed. Review it again before leaving "+config().hostName+".");return;}
  java.util.ArrayList<Intent> candidates=externalBrowsers(Uri.parse(t.url));
  if(candidates.isEmpty()){call.reject("No other installed browser can open this page. Use a password or another sign-in method.");return;}
  Intent chooser=Intent.createChooser(candidates.remove(0),AlphaBrowserCopy.OPEN_ELSEWHERE);
  chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS,candidates.toArray(new Intent[0]));
  for(Tab tab:tabs.values())disableAutofill(tab);
  try{getActivity().startActivity(chooser);call.resolve();}catch(RuntimeException unavailable){call.reject("The other browser could not be opened. Your page remains in "+config().hostName+".");}
 }); }
 /** One VIEW intent per installed full browser other than this app, each bound to its activity. */
 private java.util.ArrayList<Intent> externalBrowsers(Uri page) {
  Intent view=new Intent(Intent.ACTION_VIEW,page).addCategory(Intent.CATEGORY_BROWSABLE);
  java.util.ArrayList<Intent> candidates=new java.util.ArrayList<>();java.util.HashSet<String> seen=new java.util.HashSet<>();
  for(android.content.pm.ResolveInfo info:externalBrowserResolver.apply(BrowserExternalHandoff.browserProbe())){
   android.content.pm.ActivityInfo activity=info.activityInfo;
   if(activity!=null&&activity.applicationInfo!=null&&activity.name!=null&&BrowserExternalPage.eligible(getContext().getPackageName(),activity.packageName,activity.enabled&&activity.applicationInfo.enabled,activity.exported,BrowserExternalHandoff.genericHttps(info.filter))){
    android.content.ComponentName component=new android.content.ComponentName(activity.packageName,activity.name);
    if(seen.add(component.flattenToString()))candidates.add(new Intent(view).setComponent(component));
   }
  }
  return candidates;
 }
 /**
  * The owner's Open in browser on a normal tab whose page failed here for the network's or this
  * WebView's reason: only that address goes, to the default browser's Custom Tab when it has one,
  * or to the browser chooser. The page must still be the failed one the renderer showed.
  */
 @PluginMethod public void openFailedPage(PluginCall call) { getActivity().runOnUiThread(()->{if(closed(call))return;
  Tab t=tabs.get(call.getString("id"));
  if(!Objects.equals(session,call.getString("session"))||t==null||t.dead||t.priv||paused||destroyed||shareOutstanding||pickerOutstanding
   ||!Objects.equals(presentedId,t.id)||!t.frame.isShown()||t.loading||t.elsewhereUrl.isEmpty()
   ||!Objects.equals(call.getString("navigation"),String.valueOf(t.navigation))||!Objects.equals(call.getString("url"),t.elsewhereUrl)){call.reject("The page changed. Try again from the page.");return;}
  Uri page=Uri.parse(t.elsewhereUrl);
  java.util.ArrayList<Intent> candidates=externalBrowsers(page);
  if(candidates.isEmpty()){call.reject("No other installed browser can open this page.");return;}
  java.util.ArrayList<String> packages=new java.util.ArrayList<>();for(Intent candidate:candidates)packages.add(candidate.getComponent().getPackageName());
  for(Tab tab:tabs.values())disableAutofill(tab);
  try{
   String customTabs=androidx.browser.customtabs.CustomTabsClient.getPackageName(getContext(),packages);
   if(customTabs!=null&&packages.contains(customTabs)){
    androidx.browser.customtabs.CustomTabsIntent custom=new androidx.browser.customtabs.CustomTabsIntent.Builder().setShowTitle(true).setShareState(androidx.browser.customtabs.CustomTabsIntent.SHARE_STATE_OFF).build();
    // On a Home host the tab opens in the browser's own task: Home returns to the host's single-task activity, which would finish a page above it.
    custom.intent.setPackage(customTabs);if(hostIsHome())custom.intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    custom.launchUrl(getActivity(),page);
   }else{
    Intent chooser=Intent.createChooser(candidates.remove(0),AlphaBrowserCopy.OPEN_ELSEWHERE);
    chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS,candidates.toArray(new Intent[0]));
    getActivity().startActivity(chooser);
   }
   call.resolve();
  }catch(RuntimeException unavailable){call.reject("The other browser could not be opened. Your page remains in "+config().hostName+".");}
 }); }
 private boolean hostIsHome() {
  try {
   android.content.pm.ResolveInfo home=getContext().getPackageManager().resolveActivity(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME),android.content.pm.PackageManager.MATCH_DEFAULT_ONLY);
   return home!=null&&home.activityInfo!=null&&getContext().getPackageName().equals(home.activityInfo.packageName);
  } catch(RuntimeException unavailable) { return false; }
 }
 @PluginMethod public void downloads(PluginCall call) { getActivity().runOnUiThread(()->{if(closed(call))return;String requested=call.getString("session");if(requested==null||(session!=null&&!Objects.equals(session,requested))){call.reject("Expired browser session");return;}session=requested;for(Tab tab:tabs.values())disableAutofill(tab);String shown=requested;downloads.show(()->{if(destroyed||!Objects.equals(session,shown))return;JSObject event=new JSObject();event.put("session",shown);notifyListeners("showDownloads",event);});call.resolve();}); }
 /** Whether website password fill can work in this browser (no secrets, no tab state). */
 @PluginMethod public void loginFillStatus(PluginCall call) { JSObject result=new JSObject(); boolean available=BrowserLoginFields.supported(); result.put("available",available); if(!available)result.put("reason",BrowserFieldOrigin.UNSUPPORTED); call.resolve(result); }
 @PluginMethod public void close(PluginCall call) { getActivity().runOnUiThread(() -> {if(closed(call))return; if (!Objects.equals(session,call.getString("session"))) { call.reject("Expired browser session"); return; } Tab t=tabs.remove(call.getString("id")); if(t!=null) dispose(t); call.resolve(); }); }
 @Override protected void handleOnPause() { paused=true;if(reading!=null)reading.cancel();flushCookies();exitFullscreen(true); for(Tab t:tabs.values()) { syncAutofill(t); t.frame.setHostRectsReceived(false);t.frame.setVisibility(View.GONE); if(!t.dead)t.web.onPause(); } }
 /** Persist normal-tab sign-in cookies promptly; the process may be killed in background. */
 private void flushCookies() {
  try{if(WebViewFeature.isFeatureSupported(WebViewFeature.MULTI_PROFILE)){androidx.webkit.Profile profile=ProfileStore.getInstance().getProfile(config().persistentProfile);if(profile!=null)profile.getCookieManager().flush();}}catch(Exception unavailable){/* Chromium also flushes periodically. */}
 }
 @Override protected void handleOnResume() {
  paused=false;
  for(Tab t:tabs.values()) if(!t.dead){
   t.web.onResume();
   // Android can deliver the authentication result before the renderer responds
   // to surfaceResumed. Restore only the still-selected native surface now so
   // the same-document Autofill result passes its visibility check.
   t.frame.setVisibility(Objects.equals(presentedId,t.id)?View.VISIBLE:View.GONE);
   syncAutofill(t);
   if(Objects.equals(presentedId,t.id))resumeTimeout(t);
   JSObject event=state(t);event.put("surfaceResumed",true);notifyListeners("stateChanged",event);
  }
 }
 @Override protected void handleOnDestroy() { destroyed=true;if(reading!=null)reading.cancel();getBridge().removeWebViewListener(hostNavigation);if(downloads!=null)downloads.destroy();dismissSiteDialogs();exitFullscreen(true);if(runtimePermissions!=null)runtimePermissions.unregister();if(takePicture!=null)takePicture.unregister();AutofillManager manager=getActivity().getSystemService(AutofillManager.class);if(manager!=null)manager.unregisterCallback(autofillCallback);cancelFile();if(filePicker!=null)filePicker.unregister();if(pageShare!=null)pageShare.unregister();ArrayList<Tab> all=new ArrayList<>(tabs.values());tabs.clear();
  // Clear first: a private profile shared with a pop-up is purged only when no tab still uses it.
  for(Tab t:all) dispose(t); session=null; }
}
