package ai.alphacompute.alphaphone;

import android.content.Intent;
import android.os.Build;
import android.service.quicksettings.Tile;

/**
 * Host-JVM checks of Alpha's Quick Settings tile against Android stand-ins
 * (test/quick-settings-tile.test.mjs). Ported from upstream plugin-native-system
 * test/AssistantEntryTileTest.java, whose AssistantEntryTile Alpha's tile was forked from. The
 * stand-in Context answers getString with the strings in Alpha's res/values.
 */
public class AlphaQuickSettingsTileTest {
    static void check(boolean ok, String message) {
        if (!ok) throw new AssertionError(message);
    }

    public static void main(String[] args) throws Exception {
        Build.VERSION.SDK_INT = 36;

        AlphaQuickSettingsTile locked = new AlphaQuickSettingsTile();
        locked.locked = true;
        locked.onStartListening();
        check(locked.tile.updates == 1, "one tile update per listen");
        check(locked.tile.state == Tile.STATE_INACTIVE, "an action tile never reports an active state");
        check("Alpha".equals(locked.tile.label) && "Unlock to open".equals(locked.tile.subtitle), "locked presentation");
        check("Open Alpha.".equals(locked.tile.description), "spoken description");
        check(locked.tile.icon != null && locked.tile.icon.resource == R.drawable.notification_icon, "Alpha's notification icon");
        locked.onClick();
        check(locked.launched == 0 && locked.unlock != null, "a locked tap waits for the owner to unlock");
        locked.locked = false;
        locked.unlock.run();
        check(locked.launched == 1, "one launch after unlock");
        check(locked.lastPending != null && locked.lastPending.intent == locked.lastIntent, "PendingIntent entry on Android 14+");
        check((locked.lastPending.flags & android.app.PendingIntent.FLAG_IMMUTABLE) != 0, "immutable PendingIntent");
        check((locked.lastPending.flags & android.app.PendingIntent.FLAG_UPDATE_CURRENT) != 0, "current entry intent");
        check(locked.lastPending.requestCode == 41 && AlphaQuickSettingsTile.REQUEST_CODE == 41, "installed request code");
        check(locked.lastIntent.target == AlphaAssistActivity.class && Intent.ACTION_ASSIST.equals(locked.lastIntent.action), "explicit assist entry");
        check(locked.lastIntent.flags == (Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP), "entry flags");
        check(locked.lastIntent.data == null && locked.lastIntent.extras == 0, "a tap carries no data into Alpha");

        AlphaQuickSettingsTile unlocked = new AlphaQuickSettingsTile();
        unlocked.onClick();
        check(unlocked.launched == 1 && unlocked.unlock == null, "an unlocked tap opens without an unlock prompt");
        unlocked.onStartListening();
        check("Open assistant".equals(unlocked.tile.subtitle), "unlocked subtitle");

        Build.VERSION.SDK_INT = 33;
        AlphaQuickSettingsTile legacy = new AlphaQuickSettingsTile();
        legacy.onClick();
        check(legacy.launched == 1 && legacy.lastPending == null && legacy.lastIntent != null, "Intent entry before Android 14");
        Build.VERSION.SDK_INT = 36;
        java.lang.reflect.Method openLegacy = AlphaQuickSettingsTile.class.getDeclaredMethod("openLegacy", Intent.class);
        openLegacy.setAccessible(true);
        try {
            openLegacy.invoke(legacy, legacy.lastIntent);
            throw new AssertionError("the legacy entry was accepted on Android 14+");
        } catch (java.lang.reflect.InvocationTargetException expected) {
            check(expected.getCause() instanceof IllegalStateException, "the legacy entry fails closed on Android 14+");
        }
        check(legacy.launched == 1, "a refused legacy entry launches nothing");

        Build.VERSION.SDK_INT = 28;
        AlphaQuickSettingsTile old = new AlphaQuickSettingsTile();
        old.onStartListening();
        check(!old.tile.subtitleSet && old.tile.state == Tile.STATE_INACTIVE, "no subtitle before Android 10");
        Build.VERSION.SDK_INT = 36;

        AlphaQuickSettingsTile detached = new AlphaQuickSettingsTile();
        detached.tile = null;
        detached.onStartListening();

        System.out.println("PASS Alpha quick settings tile");
    }
}
