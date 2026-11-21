package ai.alphacompute.alphaphone;

import android.os.Looper;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Process-wide signal that one of Alpha's secret screens is up: the unlock prompt, the password
 * editor and its questions, a revealed password or provider key, or the fill or save screen. It
 * becomes visible before the first screen draws and hidden after the last one closes, so voice and
 * dictation stop capture and speech first. Listeners run on the main thread, inside the call that
 * opens or closes the screen, so they must be quick, must not throw and must not open a screen.
 * Native only; page script cannot observe or change it.
 */
final class PasswordSurfaces {
  private PasswordSurfaces() {}
  interface Listener { void onSecretSurfaceChanged(boolean visible); }
  private static final List<Listener> LISTENERS = new CopyOnWriteArrayList<>();
  private static volatile int open;

  static void addListener(Listener listener) { LISTENERS.add(listener); }
  static void removeListener(Listener listener) { LISTENERS.remove(listener); }
  static boolean visible() { return open > 0; }

  /** One screen from before it draws until {@link #close}. Closing again does nothing. */
  static final class Hold {
    private boolean closed;
    void close() {
      if (closed) return;
      closed = true;
      if (--open == 0) changed(false);
    }
  }

  static Hold open() {
    if (Looper.myLooper() != Looper.getMainLooper()) throw new IllegalStateException("Secret surfaces open on the main thread");
    if (open++ == 0) changed(true);
    return new Hold();
  }

  private static void changed(boolean visible) { for (Listener listener : LISTENERS) listener.onSecretSurfaceChanged(visible); }
}
