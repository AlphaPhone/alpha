package ai.alphacompute.alphaphone;

import ai.eliza.plugins.media.DocumentBytes;
import ai.eliza.plugins.media.DocumentDestinations;
import ai.eliza.plugins.media.SelectedDocumentCalls;
import ai.eliza.plugins.media.SelectedDocuments;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.InputStream;
import java.util.Objects;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** The owner’s explicit Android document selections, opened by opaque selection ID. */
@CapacitorPlugin(name="SelectedDocuments")
public final class AlphaSelectedDocumentsPlugin extends Plugin {
 private static SelectedDocuments registry;
 private final ExecutorService worker = Executors.newSingleThreadExecutor();
 private final AtomicBoolean picking = new AtomicBoolean();
 private volatile boolean closed;

 static synchronized SelectedDocuments documents(Context context) {
  if (registry == null) {
   Context app = context.getApplicationContext();
   registry = new SelectedDocuments(app, "selected-documents", "document-", NoteSourceReferences.store(app)::retains, IsolatedPdfService.class);
  }
  return registry;
 }

 private SelectedDocuments documents() { return documents(getContext()); }

 @PluginMethod public void restoreSelected(PluginCall call) { work(call, () -> SelectedDocumentCalls.restore(call, this::documents)); }
 @PluginMethod public void describeSelected(PluginCall call) { work(call, () -> SelectedDocumentCalls.describe(call, this::documents)); }
 @PluginMethod public void renameSelected(PluginCall call) { work(call, () -> SelectedDocumentCalls.rename(call, this::documents)); }
 @PluginMethod public void pdfSelected(PluginCall call) { work(call, () -> SelectedDocumentCalls.pdf(call, this::documents)); }
 @PluginMethod public void readSelected(PluginCall call) { work(call, () -> SelectedDocumentCalls.read(call, this::documents)); }
 @PluginMethod public void forgetSelected(PluginCall call) { work(call, () -> SelectedDocumentCalls.forget(call, this::documents)); }
 @PluginMethod public void openSelected(PluginCall call) { foreground(call, () -> SelectedDocumentCalls.open(call, this::documents, getActivity())); }
 @PluginMethod public void shareSelected(PluginCall call) { foreground(call, () -> SelectedDocumentCalls.share(call, this::documents, getActivity())); }

 @PluginMethod public void pickSelected(PluginCall call) {
  foreground(call, () -> {
   if (!picking.compareAndSet(false, true)) { call.reject("A document picker is already open."); return; }
   try {
    Intent intent = DocumentDestinations.open("*/*").addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
    startActivityForResult(call, intent, "picked");
   } catch (RuntimeException failure) {
    picking.set(false);
    call.reject("Android could not open the document picker.");
   }
  });
 }

 @ActivityCallback private void picked(PluginCall call, ActivityResult result) {
  picking.set(false);
  if (call == null || closed) return;
  Intent answer = result.getData();
  Uri uri = answer == null ? null : answer.getData();
  if (result.getResultCode() != Activity.RESULT_OK || !DocumentDestinations.admits(uri)) {
   call.resolve(new JSObject().put("selectionId", ""));
   return;
  }
  work(call, () -> {
   ContentResolver resolver = getContext().getContentResolver();
   int flags = 0;
   if ((answer.getFlags() & Intent.FLAG_GRANT_READ_URI_PERMISSION) != 0) {
    try {
     resolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
     flags = Intent.FLAG_GRANT_READ_URI_PERMISSION;
    } catch (SecurityException ignored) { }
   }
   try {
    call.resolve(new JSObject().put("selectionId", documents().authorize(uri, flags)));
   } catch (RuntimeException failure) {
    if (flags != 0) documents().releaseUnreferenced(uri);
    call.reject("The selected document could not be opened.");
   }
  });
 }

 @PluginMethod public void attachmentSelected(PluginCall call) {
  foreground(call, () -> work(call, () -> attach(call)));
 }

 private void attach(PluginCall call) {
  String id = call.getString("selectionId");
  SelectedDocuments files = documents();
  try {
   Uri uri = files.resolve(id);
   JSObject before = files.describeSelected(id);
   if (uri == null || !"selected".equals(before.getString("status"))) throw new IllegalStateException();
   String name = before.getString("name");
   String type = DocumentBytes.opaqueMime(before.getString("mimeType"));
   if (name == null || name.isBlank() || name.length() > 255 || type.startsWith("audio/") || type.startsWith("video/")) {
    throw new IllegalArgumentException();
   }
   int limit = type.startsWith("image/") ? DocumentBytes.CHAT_MAX_BYTES : 15 * 1024 * 1024 / 4 * 3;
   byte[] bytes;
   try (InputStream input = getContext().getContentResolver().openInputStream(uri)) {
    bytes = DocumentBytes.read(input, limit);
   }
   JSObject after = files.describeSelected(id);
   if (!AlphaDevicePlugin.shareForeground(getActivity()) || bytes.length == 0 || !uri.equals(files.resolve(id))
     || !Objects.equals(name, after.getString("name")) || !Objects.equals(before.getString("mimeType"), after.getString("mimeType"))
     || !Objects.equals(before.opt("size"), after.opt("size")) || !Objects.equals(before.opt("modified"), after.opt("modified"))) {
    throw new IllegalStateException();
   }
   call.resolve(new JSObject().put("name", name).put("mimeType", type).put("dataBase64", Base64.encodeToString(bytes, Base64.NO_WRAP)));
  } catch (Exception failure) {
   call.reject("The selected file couldn’t be attached. Select it again or choose a supported file.");
  }
 }

 private void work(PluginCall call, Runnable operation) {
  Runnable stopped = () -> call.reject("Document access closed.");
  PluginWorkers.submit(worker, () -> { if (closed) stopped.run(); else operation.run(); }, stopped);
 }

 private void foreground(PluginCall call, Runnable operation) {
  Activity activity = getActivity();
  if (activity == null) { call.reject("Open and unlock Alpha before using this document."); return; }
  activity.runOnUiThread(() -> {
   if (!AlphaDevicePlugin.shareForeground(activity)) call.reject("Open and unlock Alpha before using this document.");
   else operation.run();
  });
 }

 @Override protected void handleOnDestroy() {
  closed = true;
  worker.shutdown();
  super.handleOnDestroy();
 }
}
