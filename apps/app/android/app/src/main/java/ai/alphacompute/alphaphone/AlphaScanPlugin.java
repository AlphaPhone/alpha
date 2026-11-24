package ai.alphacompute.alphaphone;

import android.app.Activity;
import ai.eliza.plugins.media.DocumentDestinations;
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
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AlphaScan")
public final class AlphaScanPlugin extends Plugin {
    private static final long DOCUMENT_LIMIT = 64L * 1024 * 1024;
    private static final int CHUNK_LIMIT = 256 * 1024;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private Draft inFlight;

    private static final class Draft {
        final String id = UUID.randomUUID().toString();
        final File file;
        final long length;
        long wrote;
        boolean picking;

        Draft(File file, long length) {
            this.file = file;
            this.length = length;
        }
    }

    @Override public void load() {
        worker.execute(() -> {
            File[] remains = getContext().getCacheDir().listFiles((directory, filename) -> filename.startsWith("alpha-scan-") && filename.endsWith(".pdf"));
            if (remains != null) {
                for (File file : remains) file.delete();
            }
        });
    }

    @PluginMethod public void begin(PluginCall call) {
        worker.execute(() -> {
            Integer length = call.getInt("length");
            if (inFlight != null || length == null || length < 5 || length > DOCUMENT_LIMIT) {
                call.reject("A document cannot start", "SCAN_REFUSED");
                return;
            }
            try {
                inFlight = new Draft(File.createTempFile("alpha-scan-", ".pdf", getContext().getCacheDir()), length);
                call.resolve(new JSObject().put("id", inFlight.id));
            } catch (IOException error) {
                call.reject("The document could not be prepared", "SCAN_REFUSED", error);
            }
        });
    }

    @PluginMethod public void append(PluginCall call) {
        worker.execute(() -> {
            Draft draft = matching(call);
            String chunk = call.getString("data");
            Integer offset = call.getInt("offset");
            if (draft == null || draft.picking || offset == null || offset != draft.wrote
                    || chunk == null || chunk.length() > ((CHUNK_LIMIT + 2) / 3) * 4) {
                call.reject("The document chunk was refused", "SCAN_REFUSED");
                return;
            }
            try {
                byte[] bytes = Base64.decode(chunk, Base64.NO_WRAP);
                if (bytes.length == 0 || bytes.length > CHUNK_LIMIT || draft.wrote + bytes.length > draft.length) {
                    throw new IOException("Invalid document chunk length");
                }
                if (draft.wrote == 0 && (bytes.length < 5 || bytes[0] != '%' || bytes[1] != 'P' || bytes[2] != 'D'
                        || bytes[3] != 'F' || bytes[4] != '-')) {
                    throw new IOException("Invalid PDF signature");
                }
                try (FileOutputStream out = new FileOutputStream(draft.file, true)) {
                    out.write(bytes);
                }
                draft.wrote += bytes.length;
                call.resolve();
            } catch (IOException | IllegalArgumentException error) {
                retire(draft);
                call.reject("The document could not be prepared", "SCAN_REFUSED", error);
            }
        });
    }

    @PluginMethod public void save(PluginCall call) {
        worker.execute(() -> {
            Draft draft = matching(call);
            if (draft == null || draft.picking || draft.wrote != draft.length) {
                call.resolve(status(false, true));
                return;
            }
            draft.picking = true;
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                    .addCategory(Intent.CATEGORY_OPENABLE)
                    .setType("application/pdf")
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
                    .putExtra(Intent.EXTRA_TITLE, "Scanned document.pdf");
            getActivity().runOnUiThread(() -> {
                try {
                    startActivityForResult(call, intent, "picked");
                } catch (RuntimeException error) {
                    worker.execute(() -> { retire(draft); call.resolve(status(false, true)); });
                }
            });
        });
    }

    @ActivityCallback private void picked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        worker.execute(() -> {
            Draft draft = matching(call);
            Intent data = result.getData();
            Uri uri = data == null ? null : data.getData();
            if (draft == null) {
                call.resolve(status(false, false));
                return;
            }
            if (result.getResultCode() != Activity.RESULT_OK || !DocumentDestinations.admits(uri)) {
                retire(draft);
                call.resolve(status(false, true));
                return;
            }
            boolean saved = false;
            try (FileInputStream in = new FileInputStream(draft.file);
                 OutputStream out = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                if (out == null) throw new IOException("The document destination could not be opened");
                in.transferTo(out);
                out.flush();
                saved = true;
            } catch (IOException | SecurityException error) {
                saved = false;
            } finally {
                retire(draft);
            }
            JSObject receipt = status(saved, saved);
            if (saved) {
                int flags = 0;
                if ((data.getFlags() & Intent.FLAG_GRANT_READ_URI_PERMISSION) != 0) {
                    try {
                        getContext().getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        flags = Intent.FLAG_GRANT_READ_URI_PERMISSION;
                    } catch (SecurityException ignored) { }
                }
                try {
                    receipt.put("selectionId", AlphaSelectedDocumentsPlugin.documents(getContext()).authorize(uri, flags));
                } catch (RuntimeException failure) {
                    if (flags != 0) AlphaSelectedDocumentsPlugin.documents(getContext()).releaseUnreferenced(uri);
                }
            }
            call.resolve(receipt);
        });
    }

    @PluginMethod public void abandon(PluginCall call) {
        worker.execute(() -> {
            Draft draft = matching(call);
            if (draft != null && !draft.picking) retire(draft);
            call.resolve();
        });
    }

    private Draft matching(PluginCall call) {
        return inFlight != null && inFlight.id.equals(call.getString("id")) ? inFlight : null;
    }

    private void retire(Draft draft) {
        draft.file.delete();
        if (inFlight == draft) inFlight = null;
    }

    private static JSObject status(boolean confirmed, boolean known) {
        return new JSObject().put("confirmed", confirmed).put("known", known);
    }

    @Override protected void handleOnDestroy() {
        worker.execute(() -> { if (inFlight != null) retire(inFlight); });
        worker.shutdown();
    }
}
