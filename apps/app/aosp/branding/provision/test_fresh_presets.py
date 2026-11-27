"""Host JVM checks for AlphaFreshSetupPolicy and AlphaFreshPresets (including OverlayManager RuntimeException fallback)."""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

PROVISION = Path(__file__).resolve().parent
BRAND = PROVISION.parent
sys.path.insert(0, str(BRAND / "system-entry"))
from portable_tools import java_binary


STUBS = {
    "android/content/Context.java": """package android.content;
public class Context {
  public ContentResolver contentResolver = new ContentResolver();
  public Object overlayManager;
  public Object inputMethodManager;
  public Object devicePolicyManager;
  public Object userManager;
  public ContentResolver getContentResolver() { return contentResolver; }
  @SuppressWarnings("unchecked")
  public <T> T getSystemService(Class<T> type) {
    if (type.getName().equals("android.content.om.OverlayManager")) return (T) overlayManager;
    if (type.getName().equals("android.view.inputmethod.InputMethodManager")) return (T) inputMethodManager;
    if (type.getName().equals("android.app.admin.DevicePolicyManager")) return (T) devicePolicyManager;
    if (type.getName().equals("android.os.UserManager")) return (T) userManager;
    return null;
  }
}
""",
    "android/app/Activity.java": """package android.app;
import android.content.Context;
public class Activity extends Context {}
""",
    "android/app/admin/DevicePolicyManager.java": """package android.app.admin;
public class DevicePolicyManager {
  public Object deviceOwner;
  public Object getDeviceOwnerComponentOnCallingUser() { return deviceOwner; }
}
""",
    "android/content/ContentResolver.java": """package android.content;
import java.util.HashMap;
import java.util.Map;
public class ContentResolver {
  public final Map<String, String> secure = new HashMap<>();
  public final Map<String, Integer> global = new HashMap<>();
}
""",
    "android/content/om/OverlayInfo.java": """package android.content.om;
public class OverlayInfo {
  public final String packageName;
  public final String targetPackageName;
  public final String category;
  private boolean enabled;
  public OverlayInfo(String packageName, String targetPackageName, String category, boolean enabled) {
    this.packageName = packageName;
    this.targetPackageName = targetPackageName;
    this.category = category;
    this.enabled = enabled;
  }
  public boolean isEnabled() { return enabled; }
  public void setEnabled(boolean enabled) { this.enabled = enabled; }
}
""",
    "android/content/om/OverlayManager.java": """package android.content.om;
import android.os.UserHandle;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
public class OverlayManager {
  public final Map<String, OverlayInfo> overlays = new HashMap<>();
  public RuntimeException failure;
  public OverlayInfo getOverlayInfo(String pkg, UserHandle user) {
    if (failure != null) throw failure;
    return overlays.get(pkg);
  }
  public List<OverlayInfo> getOverlayInfosForTarget(String target, UserHandle user) {
    if (failure != null) throw failure;
    List<OverlayInfo> list = new ArrayList<>();
    for (OverlayInfo info : overlays.values()) {
      if (target.equals(info.targetPackageName)) list.add(info);
    }
    return list;
  }
  public void setEnabledExclusiveInCategory(String pkg, UserHandle user) {
    if (failure != null) throw failure;
    OverlayInfo chosen = overlays.get(pkg);
    if (chosen == null) throw new IllegalArgumentException("Unknown overlay " + pkg);
    for (OverlayInfo info : overlays.values()) {
      if (chosen.category.equals(info.category)) info.setEnabled(info == chosen);
    }
  }
}
""",
    "android/content/pm/ApplicationInfo.java": """package android.content.pm;
public class ApplicationInfo {
  public static final int FLAG_SYSTEM = 1;
  public boolean enabled = true;
  public int flags = FLAG_SYSTEM;
}
""",
    "android/content/pm/ServiceInfo.java": """package android.content.pm;
public class ServiceInfo {
  public boolean enabled = true;
  public ApplicationInfo applicationInfo = new ApplicationInfo();
}
""",
    "android/os/Process.java": """package android.os;
public final class Process {
  public static UserHandle myUserHandle() { return new UserHandle(); }
}
""",
    "android/os/UserHandle.java": """package android.os;
public final class UserHandle {
  public boolean isSystem() { return true; }
}
""",
    "android/os/UserManager.java": """package android.os;
public class UserManager {
  public boolean systemUser = true;
  public boolean managedProfile = false;
  public boolean isSystemUser() { return systemUser; }
  public boolean isManagedProfile() { return managedProfile; }
}
""",
    "android/provider/Settings.java": """package android.provider;
import android.content.ContentResolver;
public final class Settings {
  public static final class Secure {
    public static final String USER_SETUP_COMPLETE = "user_setup_complete";
    public static final String DEFAULT_INPUT_METHOD = "default_input_method";
    public static final String ENABLED_INPUT_METHODS = "enabled_input_methods";
    public static final String THEME_CUSTOMIZATION_OVERLAY_PACKAGES = "theme_customization_overlay_packages";
    public static int getInt(ContentResolver cr, String name, int def) {
      String value = cr.secure.get(name);
      return value == null ? def : Integer.parseInt(value);
    }
    public static String getString(ContentResolver cr, String name) {
      return cr.secure.get(name);
    }
    public static boolean putString(ContentResolver cr, String name, String value) {
      cr.secure.put(name, value);
      return true;
    }
  }
}
""",
    "android/util/Log.java": """package android.util;
import java.util.ArrayList;
import java.util.List;
public final class Log {
  public static final List<String> warnings = new ArrayList<>();
  public static int w(String tag, String msg) { warnings.add(tag + ": " + msg); return 0; }
  public static int w(String tag, String msg, Throwable tr) { warnings.add(tag + ": " + msg + " (" + tr.getClass().getSimpleName() + ")"); return 0; }
}
""",
    "android/view/inputmethod/InputMethodInfo.java": """package android.view.inputmethod;
import android.content.pm.ServiceInfo;
public class InputMethodInfo {
  private final String pkg, svc, id;
  private final ServiceInfo info = new ServiceInfo();
  public InputMethodInfo(String pkg, String svc, String id) { this.pkg = pkg; this.svc = svc; this.id = id; }
  public String getPackageName() { return pkg; }
  public String getServiceName() { return svc; }
  public String getId() { return id; }
  public ServiceInfo getServiceInfo() { return info; }
}
""",
    "android/view/inputmethod/InputMethodManager.java": """package android.view.inputmethod;
import java.util.ArrayList;
import java.util.List;
public class InputMethodManager {
  public final List<InputMethodInfo> methods = new ArrayList<>();
  public List<InputMethodInfo> getInputMethodList() { return methods; }
}
""",
}


class FreshPresetsHostTest(unittest.TestCase):
    def test_gesture_overlay_default_and_runtime_exception_fallback(self):
        with tempfile.TemporaryDirectory(prefix="alpha-fresh-presets-") as d:
            root = Path(d)
            sources = [
                str(PROVISION / "AlphaFreshSetupPolicy.java"),
                str(PROVISION / "AlphaFreshPresets.java"),
            ]
            for rel, code in STUBS.items():
                path = root / rel
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(code)
                sources.append(str(path))
            driver = root / "com/android/provision/FreshPresetsDriver.java"
            driver.parent.mkdir(parents=True, exist_ok=True)
            driver.write_text(
                """package com.android.provision;
import android.app.Activity;
import android.app.admin.DevicePolicyManager;
import android.content.om.OverlayInfo;
import android.content.om.OverlayManager;
import android.os.UserManager;
import android.util.Log;
public class FreshPresetsDriver {
  static void check(boolean ok, String msg) { if (!ok) throw new AssertionError(msg); }
  public static void main(String[] args) {
    Activity activity = new Activity();
    activity.devicePolicyManager = new DevicePolicyManager();
    activity.userManager = new UserManager();
    OverlayManager om = new OverlayManager();
    OverlayInfo gestures = new OverlayInfo("com.android.internal.systemui.navbar.gestural", "android", "com.android.internal.navigation_bar_mode", false);
    om.overlays.put(gestures.packageName, gestures);
    activity.overlayManager = om;

    AlphaFreshPresets.defaultToGestureNavigation(activity);
    check(gestures.isEnabled(), "Gesture overlay should be enabled on fresh setup");

    // RuntimeException from OverlayManager must be caught and logged without aborting setup (#1499).
    OverlayManager failing = new OverlayManager();
    failing.failure = new IllegalArgumentException("unknown package");
    activity.overlayManager = failing;
    Log.warnings.clear();
    AlphaFreshPresets.defaultToGestureNavigation(activity);
    check(!Log.warnings.isEmpty(), "RuntimeException fallback should log warning and not throw");
    System.out.println("PASS AlphaFreshPresets gesture overlay & RuntimeException fallback");
  }
}
"""
            )
            sources.append(str(driver))
            compiled = subprocess.run(
                [java_binary("javac"), "--release", "11", "-d", d, *sources],
                capture_output=True,
                text=True,
            )
            self.assertEqual(compiled.returncode, 0, compiled.stderr)
            out = subprocess.check_output(
                [java_binary("java"), "-cp", d, "com.android.provision.FreshPresetsDriver"],
                text=True,
            )
            self.assertIn("PASS AlphaFreshPresets", out)


if __name__ == "__main__":
    unittest.main(verbosity=2)
