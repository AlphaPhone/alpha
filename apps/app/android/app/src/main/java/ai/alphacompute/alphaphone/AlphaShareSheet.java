package ai.alphacompute.alphaphone;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import java.io.IOException;

/**
 * Alpha's Android share sheet for one selected document or one Photos item. Alpha owns the chooser
 * wording ({@link AlphaMediaCopy}); the opening rules are forked from the shared
 * SelectedDocuments.shareUri and SelectedDocumentCalls.share (elizaOS plugin-native-media) with the
 * same checks in the same order. The result statuses and sentences are the bridge
 * contract the renderer words ({@code apps/app/src/ui/files/selected-document-messages.ts}), so
 * they are kept exactly. Nothing is sent until the owner picks an app.
 */
final class AlphaShareSheet {
  private AlphaShareSheet() {}

  private static JSObject result(String status, String message) {
    JSObject value = new JSObject();
    value.put("status", status);
    value.put("message", message);
    return value;
  }

  /**
   * Opens Android sharing for one URI. Callers must first validate a picker capability or an
   * admitted media identity; never pass a renderer-supplied URI.
   */
  static JSObject shareUri(Activity activity, Uri uri) {
    try {
      try (android.content.res.AssetFileDescriptor file =
               activity.getContentResolver().openAssetFileDescriptor(uri, "r")) {
        if (file == null)
          return result("unavailable", "This item is no longer available.");
      }
      String mime = activity.getContentResolver().getType(uri);
      Intent send = new Intent(Intent.ACTION_SEND)
                        .setType(mime == null ? "application/octet-stream" : mime)
                        .putExtra(Intent.EXTRA_STREAM, uri)
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
      send.setClipData(ClipData.newRawUri("Selected item", uri));
      activity.startActivity(Intent.createChooser(send, AlphaMediaCopy.SHARE_ONE));
      return result("opened", "Choose an app to share this item. Nothing has been sent yet.");
    } catch (SecurityException | java.io.FileNotFoundException error) {
      return result("unavailable", "Access expired or the item was removed. Select it again.");
    } catch (IOException | RuntimeException error) {
      return result("failed", "Android could not open sharing for this item.");
    }
  }
}
