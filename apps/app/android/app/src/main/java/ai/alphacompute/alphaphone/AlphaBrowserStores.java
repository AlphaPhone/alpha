package ai.alphacompute.alphaphone;

import ai.eliza.plugins.browsersurface.BrowserAutofillExtras;
import ai.eliza.plugins.browsersurface.BrowserBookmarkStore;
import ai.eliza.plugins.browsersurface.BrowserSealedText;
import ai.eliza.plugins.browsersurface.BrowserSessionStore;
import ai.eliza.plugins.browsersurface.BrowserTabHostConfig;
import ai.eliza.plugins.passwords.PasswordFormPolicy;
import ai.eliza.plugins.securestore.nativeonly.KeystoreTextFrame;
import ai.eliza.plugins.securestore.nativeonly.PasswordAutofillPolicy;
import android.content.Context;
import java.util.Set;

/**
 * Alpha's persisted identifiers for its Browser tab host (AlphaBrowserPlugin) and the shared
 * stores in plugin-native-browser-surface: the WebView profiles, preferences files, activity-result
 * keys and Android Keystore aliases that hold website sign-ins, saved bookmarks, tabs, history,
 * downloads and site-permission decisions; never rename them. The stores, their formats and the
 * profile rules are upstream; the tab host and its native windows are Alpha's.
 */
final class AlphaBrowserStores {
 /** Alpha's own URL scheme: an intent: link may never carry it as data. */
 static final Set<String> HOST_SCHEMES=Set.of("alphaphone");
 /** Durable profile shared by every normal tab (P-04). */
 static final String PERSISTENT_PROFILE="alpha_browser_v1";
 /** Private tabs: alpha_private_<namespace>_<tab>, purged on close and at start. */
 static final String PRIVATE_PREFIX="alpha_private_";
 /**
  * Derived names keep the installed files and keys: alpha-browser-downloads (download list),
  * alpha-browser-retired-profiles, alpha-browser-notices and the alpha-browser-* activity-result keys.
  */
 static final BrowserTabHostConfig IDENTITY=BrowserTabHostConfig.builder(PERSISTENT_PROFILE,PRIVATE_PREFIX,"alpha-browser")
  .names("Alpha Phone","Alpha","Alpha Browser")
  .hostScheme("alphaphone")
  .appLinks(true)
  .autofillExtras(new BrowserAutofillExtras(PasswordAutofillPolicy.FIELD_ORIGIN,PasswordFormPolicy.TOP_ORIGIN_EXTRA))
  .debugLogging(BuildConfig.DEBUG)
  .logTag("AlphaBrowser")
  .build();
 static final String BOOKMARK_PREFERENCES="alpha-browser-bookmarks",BOOKMARK_KEY_ALIAS="alpha-browser-bookmarks-v1";
 static final String SESSION_PREFERENCES="alpha-browser-session",SESSION_KEY_ALIAS="alpha-browser-session-v1";
 private AlphaBrowserStores(){}
 static BrowserBookmarkStore bookmarks(Context context){
  return new BrowserBookmarkStore(context.getSharedPreferences(BOOKMARK_PREFERENCES,Context.MODE_PRIVATE),sealer(BOOKMARK_KEY_ALIAS,800000));
 }
 static BrowserSessionStore session(Context context){
  return new BrowserSessionStore(context.getSharedPreferences(SESSION_PREFERENCES,Context.MODE_PRIVATE),sealer(SESSION_KEY_ALIAS,2000000));
 }
 private static BrowserSealedText sealer(String alias,int maxBytes){
  KeystoreTextFrame frame=new KeystoreTextFrame(alias,maxBytes);
  return new BrowserSealedText(){
   @Override public String seal(String plain)throws Exception{return frame.seal(plain);}
   @Override public String open(String sealed)throws Exception{return frame.open(sealed);}
  };
 }
}
