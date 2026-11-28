package ai.alphacompute.thinapp;

import ai.eliza.plugins.media.OwnedMediaConfig;
import ai.eliza.plugins.media.PhotosPlugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

/** Thin standalone {@code AlphaPhotos} media editing, library, and capture plugin. */
@CapacitorPlugin(name = "AlphaPhotos", permissions = {
    @Permission(alias = "libraryLegacy", strings = { "android.permission.READ_EXTERNAL_STORAGE" }),
    @Permission(alias = "libraryImages", strings = { "android.permission.READ_MEDIA_IMAGES" }),
    @Permission(alias = "libraryVideos", strings = { "android.permission.READ_MEDIA_VIDEO" }),
    @Permission(alias = "librarySelected", strings = { "android.permission.READ_MEDIA_VISUAL_USER_SELECTED" })
})
public final class ThinPhotosPlugin extends PhotosPlugin {
    private static final OwnedMediaConfig MEDIA = OwnedMediaConfig.builder("alpha")
        .edits("Pictures/Alpha Phone/Edits/", "Alpha-edit-")
        .captures("DCIM/Camera/", "SCAN_")
        .videoEdits("Movies/Alpha Phone/Edits/", "Alpha-video-edit-")
        .build();

    @Override protected OwnedMediaConfig mediaConfig() {
        return MEDIA;
    }

    @Override protected String playbackPath() {
        return "/_alpha_owned_video/";
    }
}
