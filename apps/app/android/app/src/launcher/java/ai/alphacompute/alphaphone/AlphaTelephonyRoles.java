// spec/app/shell/index.md, "Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it"
package ai.alphacompute.alphaphone;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;
import android.util.Log;

final class AlphaTelephonyRoles {
 private AlphaTelephonyRoles() {}
 private static final Class<?>[] COMPONENTS = { AlphaInCallService.class, AlphaCallActivity.class, AlphaDialPadActivity.class,
  AlphaSmsDeliverReceiver.class, AlphaMmsWapPushReceiver.class, AlphaMmsResultReceiver.class, AlphaRespondViaMessageService.class,
  AlphaSmsComposeActivity.class, ai.eliza.plugins.messages.MmsFileProvider.class };

 static void sync(Context context) {
  int wanted = AlphaImageCapability.verified(context) ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED : PackageManager.COMPONENT_ENABLED_STATE_DISABLED;
  PackageManager packages = context.getPackageManager();
  for (Class<?> component : COMPONENTS) {
   ComponentName name = new ComponentName(context, component);
   try {
    if (packages.getComponentEnabledSetting(name) != wanted) packages.setComponentEnabledSetting(name, wanted, PackageManager.DONT_KILL_APP);
   } catch (RuntimeException refused) {
    Log.w("AlphaTelephonyRoles", "Role component state unchanged for " + component.getSimpleName());
   }
  }
 }
}
