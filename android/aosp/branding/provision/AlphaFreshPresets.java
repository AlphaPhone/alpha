package com.android.provision;

import android.app.Activity;
import android.app.admin.DevicePolicyManager;
import android.content.Context;
import android.content.om.OverlayInfo;
import android.content.om.OverlayManager;
import android.content.pm.ApplicationInfo;
import android.os.Process;
import android.os.UserHandle;
import android.os.UserManager;
import android.provider.Settings;
import android.util.Log;
import android.view.inputmethod.InputMethodInfo;
import android.view.inputmethod.InputMethodManager;
import java.util.Objects;

import static com.android.provision.AlphaFreshSetupPolicy.nonempty;

/** Privileged Provision adapter; never invoked for a completed or enterprise provisioning branch. */
final class AlphaFreshPresets {
    private static final String GESTURE_OVERLAY = "com.android.internal.systemui.navbar.gestural";
    private static final String NAVIGATION_CATEGORY = "com.android.internal.navigation_bar_mode";
    private AlphaFreshPresets() {}
    static boolean shouldRunWelcome(Context context) {
        try {
            if (Settings.Secure.getInt(context.getContentResolver(), Settings.Secure.USER_SETUP_COMPLETE, 0) != 0
                    || !Process.myUserHandle().isSystem()) return false;
            DevicePolicyManager policy = context.getSystemService(DevicePolicyManager.class);
            UserManager users = context.getSystemService(UserManager.class);
            // Missing services keep the welcome visible for a recoverable retry; they never finish it.
            return (policy == null || policy.getDeviceOwnerComponentOnCallingUser() == null)
                    && (users == null || !users.isManagedProfile());
        } catch (IllegalStateException | SecurityException unavailable) {
            return true; // Unknown state keeps a recoverable welcome, never silent completion.
        }
    }
    static boolean eligible(Context context) {
        try {
            DevicePolicyManager policy = context.getSystemService(DevicePolicyManager.class);
            UserManager users = context.getSystemService(UserManager.class);
            // Unknown policy/user state cannot authorize first-run setting writes.
            if (policy == null || users == null) return false;
            return AlphaFreshSetupPolicy.eligible(
                    Settings.Secure.getInt(context.getContentResolver(), Settings.Secure.USER_SETUP_COMPLETE, 0) != 0,
                    policy.getDeviceOwnerComponentOnCallingUser() != null || users.isManagedProfile(),
                    Process.myUserHandle().isSystem());
        } catch (IllegalStateException | SecurityException unavailable) { return false; }
    }

    static boolean applyPalette(Context context) {
        // Android's existing theme engine owns colors, contrast, light/dark and control states.
        return Settings.Secure.putString(context.getContentResolver(),
                Settings.Secure.THEME_CUSTOMIZATION_OVERLAY_PACKAGES,
                "{\"android.theme.customization.system_palette\":\"0000FF\","
                + "\"android.theme.customization.accent_color\":\"0000FF\","
                + "\"android.theme.customization.theme_style\":\"TONAL_SPOT\","
                + "\"android.theme.customization.color_source\":\"preset\"}");
    }

    static void defaultToGestureNavigation(Activity activity) {
        final OverlayManager overlays = activity.getSystemService(OverlayManager.class);
        if (overlays == null) return;
        final UserHandle user = Process.myUserHandle();
        try {
            AlphaFreshSetupPolicy.NavigationResult result = AlphaFreshSetupPolicy.ensureNavigation(
                    new AlphaFreshSetupPolicy.NavigationPort() {
                        public boolean eligible() { return AlphaFreshPresets.eligible(activity); }
                        public boolean hasEnabledMode() {
                            for (OverlayInfo info : overlays.getOverlayInfosForTarget("android", user)) {
                                if (NAVIGATION_CATEGORY.equals(info.category) && info.isEnabled()) return true;
                            }
                            return false;
                        }
                        public boolean selectGesturesIfUnchosen() {
                            final OverlayInfo gestures = overlays.getOverlayInfo(GESTURE_OVERLAY, user);
                            if (gestures == null || !"android".equals(gestures.targetPackageName)
                                    || !NAVIGATION_CATEGORY.equals(gestures.category)
                                    || !eligible() || hasEnabledMode()) return false;
                            // Select the stock overlay so Android owns the gesture zones and dimensions.
                            overlays.setEnabledExclusiveInCategory(GESTURE_OVERLAY, user);
                            final OverlayInfo selected = overlays.getOverlayInfo(GESTURE_OVERLAY, user);
                            return selected != null && selected.isEnabled();
                        }
                    });
            if (result == AlphaFreshSetupPolicy.NavigationResult.FAILED) {
                Log.w("AlphaFreshPresets", "Gesture navigation default was not applied.");
            }
        } catch (IllegalStateException | SecurityException failure) {
            // The system's button navigation remains available if this image cannot select gestures.
            Log.w("AlphaFreshPresets", "Gesture navigation default was unavailable.", failure);
        }
    }

    static AlphaFreshSetupPolicy.ImeResult ensureKeyboard(Activity activity) {
        try {
            return AlphaFreshSetupPolicy.ensureKeyboard(new AlphaFreshSetupPolicy.ImePort() {
                public boolean eligible() { return AlphaFreshPresets.eligible(activity); }
                public String selected() { return Settings.Secure.getString(activity.getContentResolver(), Settings.Secure.DEFAULT_INPUT_METHOD); }
                public String enabled() { return Settings.Secure.getString(activity.getContentResolver(), Settings.Secure.ENABLED_INPUT_METHODS); }
                public String target() {
                    InputMethodManager manager = activity.getSystemService(InputMethodManager.class);
                    if (manager == null) return null;
                    for (InputMethodInfo method : manager.getInputMethodList()) {
                        if ("com.android.inputmethod.latin".equals(method.getPackageName())
                                && "com.android.inputmethod.latin.LatinIME".equals(method.getServiceName())
                                && method.getServiceInfo().enabled && method.getServiceInfo().applicationInfo.enabled
                                && (method.getServiceInfo().applicationInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0) {
                            return method.getId();
                        }
                    }
                    return null;
                }
                public boolean enableIfUnchanged(String expected, String value) {
                    if (!eligible() || !Objects.equals(expected, enabled()) || nonempty(selected())) return false;
                    return Settings.Secure.putString(activity.getContentResolver(), Settings.Secure.ENABLED_INPUT_METHODS, value);
                }
                public boolean selectIfEmpty(String value) {
                    if (!eligible() || nonempty(selected())) return false;
                    // Pinned InputMethodManager.setInputMethod(null, id) explicitly recommends
                    // these secure-setting updates instead of its deprecated null-token behavior.
                    return Settings.Secure.putString(activity.getContentResolver(), Settings.Secure.DEFAULT_INPUT_METHOD, value);
                }
            });
        } catch (IllegalStateException | SecurityException failure) {
            return AlphaFreshSetupPolicy.ImeResult.FAILED;
        }
    }
}
