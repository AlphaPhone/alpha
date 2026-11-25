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
  // The image can enable manifest defaults, so a failed admission must explicitly disable them.
  int wanted = AlphaImageCapability.verified(context) ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED : PackageManager.COMPONENT_ENABLED_STATE_DISABLED;
  syncComponents(context, wanted);
 }

 static boolean prepare(Context context) {
  return AlphaImageCapability.verified(context) && syncComponents(context, PackageManager.COMPONENT_ENABLED_STATE_ENABLED);
 }

 private static boolean syncComponents(Context context, int wanted) {
  PackageManager packages = context.getPackageManager();
  boolean ready = true;
  for (Class<?> component : COMPONENTS) {
   ComponentName name = new ComponentName(context, component);
   try {
    if (packages.getComponentEnabledSetting(name) != wanted) {
     packages.setComponentEnabledSetting(name, wanted, PackageManager.DONT_KILL_APP);
     ready &= packages.getComponentEnabledSetting(name) == wanted;
    }
   } catch (RuntimeException refused) {
    ready = false;
    Log.w("AlphaTelephonyRoles", "Role component state unchanged for " + component.getSimpleName());
   }
  }
  return ready;
 }
}
