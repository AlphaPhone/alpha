package ai.alphacompute.alphaphone;

import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;

/** The protected Power child can open text Ask Alpha through the same entry. */
public final class AlphaPowerVoiceActivity extends AlphaAssistActivity {
 private static final String SYSTEM_UI = "com.android.systemui";

 @Override boolean admittedCaller() {
  if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE
    || !SYSTEM_UI.equals(getLaunchedFromPackage())) return false;
  try {
   PackageManager packages = getPackageManager();
   ApplicationInfo caller = packages.getApplicationInfo(SYSTEM_UI, 0);
   return caller.uid == getLaunchedFromUid() && (caller.flags & ApplicationInfo.FLAG_SYSTEM) != 0
     && packages.checkSignatures("android", SYSTEM_UI) == PackageManager.SIGNATURE_MATCH;
  } catch (PackageManager.NameNotFoundException | RuntimeException unavailable) { return false; }
 }
}
