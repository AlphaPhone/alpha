package com.android.provision;

import android.app.Activity;
import android.app.WallpaperManager;
import android.content.Context;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Insets;
import android.os.Bundle;
import android.view.Gravity;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.Toast;
import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** A normal user action for applying the image's wallpaper after an in-place update. */
public final class AlphaAppearance extends Activity {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        float density = getResources().getDisplayMetrics().density;
        int padH = (int)(28 * density);
        int padV = (int)(32 * density);
        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER);
        column.setPadding(padH, padV, padH, padV);
        column.setBackgroundColor(AlphaWelcome.BACKGROUND);
        column.setOnApplyWindowInsetsListener((view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(WindowInsets.Type.systemBars());
            view.setPadding(padH + bars.left, padV + bars.top, padH + bars.right, padV + bars.bottom);
            return windowInsets;
        });
        ImageView preview = new ImageView(this);
        preview.setImageResource(R.drawable.alpha_wallpaper);
        preview.setContentDescription(getString(R.string.alpha_wallpaper_preview));
        preview.setAdjustViewBounds(true);
        column.addView(preview, new LinearLayout.LayoutParams(-1, 0, 1));
        Button apply = new Button(this);
        apply.setText(R.string.alpha_apply_wallpaper);
        apply.setAllCaps(false);
        apply.setTextColor(Color.WHITE);
        apply.setBackgroundTintList(ColorStateList.valueOf(Color.BLUE));
        apply.setMinHeight((int)(56 * density));
        column.addView(apply, new LinearLayout.LayoutParams(-1, -2));
        apply.setOnClickListener(view -> {
            apply.setEnabled(false);
            Context appContext = getApplicationContext();
            executor.execute(() -> {
                boolean wallpaperApplied = false;
                boolean paletteApplied = false;
                try {
                    WallpaperManager.getInstance(appContext).setResource(R.drawable.alpha_wallpaper,
                            WallpaperManager.FLAG_SYSTEM | WallpaperManager.FLAG_LOCK);
                    wallpaperApplied = true;
                    paletteApplied = AlphaFreshPresets.applyPalette(appContext);
                } catch (IOException | RuntimeException ignored) {
                    // Handled below according to whether wallpaper or palette failed.
                }
                final boolean didWallpaper = wallpaperApplied;
                final boolean didPalette = paletteApplied;
                runOnUiThread(() -> {
                    if (isFinishing() || isDestroyed()) return;
                    if (didWallpaper && didPalette) {
                        Toast.makeText(this, R.string.alpha_wallpaper_applied, Toast.LENGTH_SHORT).show();
                        finish();
                    } else if (didWallpaper) {
                        apply.setEnabled(true);
                        Toast.makeText(this, R.string.alpha_appearance_preset_failed, Toast.LENGTH_LONG).show();
                    } else {
                        apply.setEnabled(true);
                        Toast.makeText(this, R.string.alpha_wallpaper_failed, Toast.LENGTH_LONG).show();
                    }
                });
            });
        });
        setContentView(column);
    }

    @Override protected void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }
}
