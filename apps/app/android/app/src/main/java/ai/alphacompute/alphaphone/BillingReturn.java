// spec/app/account/billing.md, "Coming back from the browser, giving up on it, or waiting too long for it, confirms a checkout of this sign-in with Cloud and checks the plan; the return itself changes nothing"
package ai.alphacompute.alphaphone;

import android.content.Intent;
import android.net.Uri;
import java.util.concurrent.atomic.AtomicReference;

final class BillingReturn {
 private static final AtomicReference<String> pending = new AtomicReference<>();

 private BillingReturn() {}

 static boolean capture(Intent intent) {
  if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) return false;
  Uri url = intent.getData();
  if (url == null || !url.isHierarchical() || !"https".equals(url.getScheme()) || url.getFragment() != null
   || !"/alphaphone/billing/return".equals(url.getEncodedPath())) return false;
  String authority = url.getEncodedAuthority(), host = BuildConfig.CLOUD_APP_LINK_HOST;
  if (!host.equals(authority) && !(host + ":443").equals(authority)) return false;
  if ((intent.getFlags() & Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0) return false;
  var sessions = url.getQueryParameters("session_id");
  var results = url.getQueryParameters("result");
  if (results.size() != 1) return false;
  if ("success".equals(results.get(0)) && sessions.size() == 1 && sessions.get(0).matches("cs_[A-Za-z0-9_]{1,250}")) {
   pending.set(sessions.get(0));
   intent.setData(null);
   return true;
  }
  if (!"cancel".equals(results.get(0)) || !sessions.isEmpty()) return false;
  intent.setData(null);
  return true;
 }

 static String take() { return pending.getAndSet(null); }
}
