package ai.alphacompute.alphaphone;

import ai.eliza.plugins.filesystem.FilesPlugin;
import android.Manifest;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

/** Shared storage with Alpha’s existing Trash and selected-document registry. */
@CapacitorPlugin(name="ElizaFiles", permissions={
 @Permission(alias="legacyStorage", strings={Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.WRITE_EXTERNAL_STORAGE})
})
public final class AlphaFilesPlugin extends FilesPlugin {
 static final String TRASH_FOLDER = ".Trash-alpha";
 @Override protected String trashFolder() { return TRASH_FOLDER; }
 @Override protected SelectionRegistry selections() {
  return AlphaSelectedDocumentsPlugin.documents(getContext())::authorize;
 }
}
