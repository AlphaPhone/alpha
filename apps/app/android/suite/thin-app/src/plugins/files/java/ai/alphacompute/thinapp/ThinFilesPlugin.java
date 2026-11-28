package ai.alphacompute.thinapp;

import ai.eliza.plugins.filesystem.FilesPlugin;
import android.Manifest;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

/** Thin standalone {@code ElizaFiles} plugin using Alpha's shared trash folder name. */
@CapacitorPlugin(name = "ElizaFiles", permissions = {
    @Permission(alias = "legacyStorage", strings = {
        Manifest.permission.READ_EXTERNAL_STORAGE,
        Manifest.permission.WRITE_EXTERNAL_STORAGE
    })
})
public final class ThinFilesPlugin extends FilesPlugin {
    @Override protected String trashFolder() {
        return ".Trash-alpha";
    }
}
