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

  static final class Prepared {
    final Uri uri;
    final String mime;
    Prepared(Uri uri, String mime) { this.uri = uri; this.mime = mime; }
  }

  /** Verifies readability and resolves MIME type off the main thread before opening the chooser. */
  static Prepared prepareUri(android.content.Context context, Uri uri) throws IOException {
    try (android.content.res.AssetFileDescriptor file =
             context.getContentResolver().openAssetFileDescriptor(uri, "r")) {
      if (file == null) return null;
    }
    String mime = context.getContentResolver().getType(uri);
    return new Prepared(uri, mime == null ? "application/octet-stream" : mime);
  }

  /** Opens Android sharing on the UI thread for an already verified URI. */
  static JSObject launchPrepared(Activity activity, Prepared prepared) {
    if (prepared == null) return result("unavailable", "This item is no longer available.");
    if (!AlphaDevicePlugin.shareForeground(activity))
      return result("failed", "Return to Photos to share this item.");
    try {
      Intent send = new Intent(Intent.ACTION_SEND)
                        .setType(prepared.mime)
                        .putExtra(Intent.EXTRA_STREAM, prepared.uri)
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
      send.setClipData(ClipData.newRawUri("Selected item", prepared.uri));
      activity.startActivity(Intent.createChooser(send, AlphaMediaCopy.SHARE_ONE));
      return result("opened", "Choose an app to share this item. Nothing has been sent yet.");
    } catch (SecurityException error) {
      return result("unavailable", "Access expired or the item was removed. Select it again.");
    } catch (RuntimeException error) {
      return result("failed", "Android could not open sharing for this item.");
    }
  }

  /**
   * Opens Android sharing for one URI. Callers must first validate a picker capability or an
   * admitted media identity; never pass a renderer-supplied URI.
   */
  static JSObject shareUri(Activity activity, Uri uri) {
    if (!AlphaDevicePlugin.shareForeground(activity))
      return result("failed", "Return to Photos to share this item.");
    try {
      return launchPrepared(activity, prepareUri(activity, uri));
    } catch (SecurityException | java.io.FileNotFoundException error) {
      return result("unavailable", "Access expired or the item was removed. Select it again.");
    } catch (IOException | RuntimeException error) {
      return result("failed", "Android could not open sharing for this item.");
    }
  }
}
