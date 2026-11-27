package ai.alphacompute.thinapp;

import ai.alphacompute.runtime.AlphaBaseActivity;

/** Thin standalone Alpha app activity binding a single Alpha view flavor to {@link AlphaBaseActivity}. */
public final class ThinAppActivity extends AlphaBaseActivity {
    @Override protected String alphaAppId() {
        return BuildConfig.ALPHA_APP_ID;
    }

    @Override protected String alphaViewName() {
        return BuildConfig.ALPHA_VIEW;
    }

    @Override protected String alphaSurfaceMode() {
        return BuildConfig.ALPHA_SURFACE;
    }
}
