package ai.alphacompute.alphaphone;

import android.annotation.SuppressLint;
import android.app.PendingIntent;
import android.content.Intent;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;

/**
 * Alpha's Quick Settings tile: an explicit assistant entry, not a connection indicator or a
 * microphone toggle. The tile always reports {@link Tile#STATE_INACTIVE}, so its presence or colour
 * never implies that an agent, inference, a connection or the microphone is active. A tap on a
 * locked device first asks Android to unlock and opens the entry only after the owner unlocks; no
 * tap grants a permission, starts capture or carries data into Alpha.
 *
 * <p>The manifest declares it with {@code android.permission.BIND_QUICK_SETTINGS_TILE} and
 * {@code android.service.quicksettings.TOGGLEABLE_TILE=false}, so only SystemUI can bind it, and
 * keeps it disabled together with AlphaAssistActivity, its only target (scripts/apk.ts).
 * {@code .AlphaQuickSettingsTile} is an installed name: a person who added the tile keeps it across
 * updates.
 */
public final class AlphaQuickSettingsTile extends TileService {
    /** Request code of the entry PendingIntent; an installed value. */
    static final int REQUEST_CODE = 41;

    /**
     * The explicit activity intent a tap opens, once per tap and after any unlock. The assist entry
     * sanitizes all incoming context and keeps account and microphone admission; opening it does
     * not grant permissions or start voice capture.
     */
    private Intent entryIntent() {
        return new Intent(this, AlphaAssistActivity.class)
                .setAction(Intent.ACTION_ASSIST)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    }

    @Override
    public void onStartListening() {
        super.onStartListening();
        Tile tile = getQsTile();
        if (tile == null) return;
        tile.setIcon(Icon.createWithResource(this, R.drawable.notification_icon));
        tile.setLabel(getString(R.string.alpha_quick_settings_label));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            tile.setSubtitle(getString(isLocked() ? R.string.alpha_quick_settings_locked : R.string.alpha_quick_settings_open));
        }
        tile.setContentDescription(getString(R.string.alpha_quick_settings_description));
        tile.setState(Tile.STATE_INACTIVE);
        tile.updateTile();
    }

    @Override
    public void onClick() {
        super.onClick();
        if (isLocked()) {
            unlockAndRun(this::open);
            return;
        }
        open();
    }

    private void open() {
        Intent intent = entryIntent();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            PendingIntent pending = PendingIntent.getActivity(this, REQUEST_CODE, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            startActivityAndCollapse(pending);
        } else {
            openLegacy(intent);
        }
    }

    /**
     * Android's Intent overload is the supported entry before Android 14, where the PendingIntent
     * overload does not exist. It is refused on 14 and later, where Android rejects it.
     */
    @SuppressLint("StartActivityAndCollapseDeprecated")
    @SuppressWarnings("deprecation")
    private void openLegacy(Intent intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            throw new IllegalStateException("Use the PendingIntent tile entry on Android 14 and later");
        }
        startActivityAndCollapse(intent);
    }
}
