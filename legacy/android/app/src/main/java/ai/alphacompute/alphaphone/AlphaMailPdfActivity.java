package ai.alphacompute.alphaphone;

import ai.eliza.plugins.media.IsolatedPdfRenderService;
import ai.eliza.plugins.media.PdfPageLimits;
import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.content.res.ColorStateList;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.Message;
import android.os.Messenger;
import android.os.ParcelFileDescriptor;
import android.os.Process;
import android.os.SharedMemory;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.nio.ByteBuffer;
import java.util.UUID;

/**
 * Alpha's viewer for a reviewed PDF attachment (manifest name {@code .AlphaMailPdfActivity}, not
 * exported). Alpha owns this screen and every word on it; it is forked from the shared
 * IsolatedPdfViewerActivity (elizaOS plugin-native-media) with the same checks in the same order.
 *
 * <p>The viewer process never parses the PDF. It admits only the current reviewed copy under
 * Alpha's attachment provider ({@link AlphaMailAttachmentsPlugin#handoff}), opens a read-only
 * descriptor for it, hands that to the isolated renderer {@link IsolatedPdfService} (process
 * {@code :isolated_pdf}) and maps the read-only pixels it returns only after
 * {@link PdfPageLimits#requireReply} accepts the reply. The renderer's own error text is never
 * shown: Alpha words each outcome ({@link AlphaMediaCopy}).
 */
public final class AlphaMailPdfActivity extends Activity {
  private static final int BACKGROUND = Color.rgb(244, 243, 238), TEXT = Color.rgb(32, 32, 25),
                           ACCENT = Color.rgb(57, 58, 203);

  private final Handler main = new Handler(Looper.getMainLooper());
  private TextView status;
  private ImageView image;
  private Button previous, next;
  private Bitmap displayed;
  private Messenger remote;
  private ServiceConnection connection;
  private String pending;
  private Uri source;
  private int page, pages, generation;
  private boolean started, bound;
  private final Runnable timeout = () -> fail(AlphaMediaCopy.PDF_TIMED_OUT);
  private final Messenger replies = new Messenger(new Handler(Looper.getMainLooper(), message -> {
    receive(message.getData());
    return true;
  }));

  /** True only for the current reviewed copy (authority, path and scheme). */
  private boolean admits(Uri source) {
    return AlphaMailAttachmentsPlugin.handoff(this).admits(source);
  }

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    source = getIntent().getData();
    page = state == null ? 0 : state.getInt("page", 0);
    LinearLayout root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setBackgroundColor(BACKGROUND);
    int pad = (int) (16 * getResources().getDisplayMetrics().density);
    root.setPadding(pad, pad, pad, pad);
    root.setOnApplyWindowInsetsListener((view, insets) -> {
      view.setPadding(pad, pad + insets.getSystemWindowInsetTop(), pad,
          pad + insets.getSystemWindowInsetBottom());
      return insets;
    });
    Button close = new Button(this);
    close.setText(AlphaMediaCopy.PDF_CLOSE);
    style(close);
    close.setOnClickListener(v -> finish());
    root.addView(close);
    status = new TextView(this);
    status.setTextColor(TEXT);
    status.setTextSize(16);
    status.setPadding(4, 12, 4, 12);
    root.addView(status);
    image = new ImageView(this);
    image.setScaleType(ImageView.ScaleType.FIT_CENTER);
    image.setContentDescription(AlphaMediaCopy.PDF_PAGE_IMAGE);
    root.addView(image, new LinearLayout.LayoutParams(-1, 0, 1));
    LinearLayout controls = new LinearLayout(this);
    previous = new Button(this);
    previous.setText(AlphaMediaCopy.PDF_PREVIOUS);
    style(previous);
    previous.setOnClickListener(v -> {
      if (pending == null && page > 0) {
        page--;
        request();
      }
    });
    next = new Button(this);
    next.setText(AlphaMediaCopy.PDF_NEXT);
    style(next);
    next.setOnClickListener(v -> {
      if (pending == null && page + 1 < pages) {
        page++;
        request();
      }
    });
    controls.addView(previous, new LinearLayout.LayoutParams(0, -2, 1));
    controls.addView(next, new LinearLayout.LayoutParams(0, -2, 1));
    root.addView(controls);
    setContentView(root);
    buttons(false);
    if (source == null || !"content".equals(source.getScheme()) || !admits(source)) {
      source = null;
      status.setText(AlphaMediaCopy.PDF_REFUSED);
    }
  }

  @Override protected void onStart() {
    super.onStart();
    started = true;
    if (source == null)
      return;
    int token = ++generation;
    status.setText(AlphaMediaCopy.PDF_OPENING);
    connection = new ServiceConnection() {
      @Override public void onServiceConnected(ComponentName name, IBinder binder) {
        if (!started || token != generation)
          return;
        remote = new Messenger(binder);
        request();
      }
      @Override public void onServiceDisconnected(ComponentName name) {
        if (token == generation)
          fail(AlphaMediaCopy.PDF_STOPPED);
      }
      @Override public void onBindingDied(ComponentName name) {
        if (token == generation)
          fail(AlphaMediaCopy.PDF_STOPPED);
      }
      @Override public void onNullBinding(ComponentName name) {
        if (token == generation)
          fail(AlphaMediaCopy.PDF_VIEWER_UNAVAILABLE);
      }
    };
    try {
      bound = bindService(
          new Intent(this, IsolatedPdfService.class), connection, Context.BIND_AUTO_CREATE);
    } catch (RuntimeException unavailable) {
      bound = false;
    }
    if (!bound)
      fail(AlphaMediaCopy.PDF_VIEWER_UNAVAILABLE);
  }

  private void style(Button button) {
    button.setAllCaps(false);
    button.setTextColor(Color.WHITE);
    button.setBackgroundTintList(ColorStateList.valueOf(ACCENT));
  }

  private void buttons(boolean ready) {
    previous.setEnabled(ready && page > 0);
    next.setEnabled(ready && page + 1 < pages);
  }

  private void request() {
    if (!started || remote == null || pending != null)
      return;
    pending = UUID.randomUUID().toString();
    buttons(false);
    status.setText(AlphaMediaCopy.pdfLoading(page + 1));
    main.postDelayed(timeout, PdfPageLimits.VIEWER_TIMEOUT_MS);
    try (ParcelFileDescriptor descriptor = getContentResolver().openFileDescriptor(source, "r")) {
      if (descriptor == null)
        throw new IllegalStateException();
      Bundle data = new Bundle();
      data.putString("request", pending);
      data.putInt("page", page);
      data.putParcelable("descriptor", descriptor);
      Message message = Message.obtain(null, IsolatedPdfRenderService.MESSAGE);
      message.replyTo = replies;
      message.setData(data);
      remote.send(message);
    } catch (Exception error) {
      fail(AlphaMediaCopy.PDF_EXPIRED);
    }
  }

  private void receive(Bundle data) {
    SharedMemory pixels = null;
    ByteBuffer mapped = null;
    Bitmap bitmap = null;
    try {
      Object raw = data.getParcelable("pixels");
      if (raw != null && !(raw instanceof SharedMemory))
        throw new IllegalArgumentException();
      pixels = (SharedMemory) raw;
      if (!started || pending == null || !pending.equals(data.getString("request")))
        return;
      main.removeCallbacks(timeout);
      if (data.containsKey("error")) {
        fail(AlphaMediaCopy.pdfRendererError(data.getString("error")));
        return;
      }
      int width = data.getInt("width"), height = data.getInt("height"),
          count = data.getInt("pages");
      if (pixels == null)
        throw new IllegalArgumentException();
      PdfPageLimits.requireReply(data.getBoolean("isolated"), data.getBoolean("internetDenied"),
          data.getInt("uid"), Process.myUid(), width, height, count, data.getInt("page"), page,
          pixels.getSize());
      mapped = pixels.mapReadOnly();
      bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
      bitmap.copyPixelsFromBuffer(mapped);
      clearImage();
      displayed = bitmap;
      bitmap = null;
      image.setImageBitmap(displayed);
      image.setContentDescription(AlphaMediaCopy.pdfPageImage(page + 1, count));
      pages = count;
      pending = null;
      status.setText(AlphaMediaCopy.pdfPage(page + 1, pages));
      buttons(true);
    } catch (Exception | OutOfMemoryError error) {
      fail(AlphaMediaCopy.PDF_TOO_LARGE);
    } finally {
      if (mapped != null)
        SharedMemory.unmap(mapped);
      if (pixels != null)
        pixels.close();
      if (bitmap != null)
        bitmap.recycle();
    }
  }

  private void clearImage() {
    image.setImageDrawable(null);
    if (displayed != null) {
      displayed.recycle();
      displayed = null;
    }
  }

  private void fail(String text) {
    pending = null;
    main.removeCallbacks(timeout);
    buttons(false);
    status.setText(text == null ? AlphaMediaCopy.PDF_UNAVAILABLE : text);
    clearImage();
    disconnect();
  }

  private void disconnect() {
    remote = null;
    if (bound && connection != null) {
      bound = false;
      try {
        unbindService(connection);
      } catch (IllegalArgumentException ignored) {
      }
    }
    connection = null;
  }

  @Override protected void onStop() {
    started = false;
    generation++;
    pending = null;
    main.removeCallbacks(timeout);
    disconnect();
    clearImage();
    super.onStop();
  }

  @Override protected void onSaveInstanceState(Bundle state) {
    state.putInt("page", page);
    super.onSaveInstanceState(state);
  }
}
