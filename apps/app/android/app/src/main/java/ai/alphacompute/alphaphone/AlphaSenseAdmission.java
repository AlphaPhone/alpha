package ai.alphacompute.alphaphone;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;

/** Admits only the listener installed in the verified Alpha image. */
final class AlphaSenseAdmission {
 private static final String FEATURE = BuildConfig.APPLICATION_ID + ".feature.LISTENER";
 private static final String COMPANION = BuildConfig.APPLICATION_ID + ".sense";
 private static final String SYSTEM_APK = "/system_ext/priv-app/AlphaSense/AlphaSense.apk";

 private AlphaSenseAdmission() {}

 static boolean available(Context context) {
  try {
   PackageManager packages = context.getPackageManager();
   if (!packages.hasSystemFeature(FEATURE)) return false;
   ApplicationInfo companion = packages.getApplicationInfo(COMPANION, 0);
   if (companion == null || !COMPANION.equals(companion.packageName) || !companion.enabled
     || (companion.flags & ApplicationInfo.FLAG_SYSTEM) == 0 || !SYSTEM_APK.equals(companion.sourceDir)
     || packages.checkPermission("android.permission.CAPTURE_AUDIO_HOTWORD", COMPANION) != PackageManager.PERMISSION_GRANTED
     || context.checkSelfPermission(COMPANION + ".permission.LISTENER_CONTROL") != PackageManager.PERMISSION_GRANTED) return false;
   Signature signer = currentSigner(packages, context.getPackageName());
   return signer != null && signer.equals(currentSigner(packages, COMPANION));
  } catch (PackageManager.NameNotFoundException | RuntimeException unavailable) { return false; }
 }

 private static Signature currentSigner(PackageManager packages, String name) throws PackageManager.NameNotFoundException {
  SigningInfo signing = packages.getPackageInfo(name, PackageManager.GET_SIGNING_CERTIFICATES).signingInfo;
  Signature[] signers = signing == null ? null : signing.getApkContentsSigners();
  return signers != null && signers.length == 1 ? signers[0] : null;
 }
}
