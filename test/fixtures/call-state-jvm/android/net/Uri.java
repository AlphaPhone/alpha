package android.net;
public class Uri {
 public final String text;
 Uri(String text) { this.text = text; }
 public static Uri withAppendedPath(Uri base, String path) { return new Uri(base.text + "/" + path); }
 public static String encode(String value) { return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8); }
 public static Uri parse(String text) { return new Uri(text); }
}
