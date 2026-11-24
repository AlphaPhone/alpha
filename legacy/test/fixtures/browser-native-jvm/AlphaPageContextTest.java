import ai.alphacompute.alphaphone.browser.AlphaPageContext;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Host-JVM checks for Alpha's page-context boundary: the address the agent may see, the title as
 * one line, and the shape check on the isolated-world script's result. Prints the compiled script so
 * the renderer test can compare it with the text the Chromium fixture spec runs.
 */
public final class AlphaPageContextTest {
  private static int assertions;
  private static void check(boolean condition, String message) { assertions++; if (!condition) throw new AssertionError(message); }
  private static void equal(Object actual, Object expected, String message) { check(expected == null ? actual == null : expected.equals(actual), message + ": expected " + expected + " got " + actual); }
  private static JSONObject page(String json) { return new JSONObject(json); }

  public static void main(String[] args) {
    equal(AlphaPageContext.address("https://Example.com/a/b?q=1#frag"), "https://Example.com/a/b?q=1", "fragment removed, query kept");
    equal(AlphaPageContext.address("HTTPS://example.com/"), "https://example.com/", "scheme lowered");
    for (String bad : new String[] {"http://example.com/", "https://user:pass@example.com/", "javascript:alert(1)", "file:///etc/passwd", "about:blank", "", null, "https://example.com/" + "a".repeat(2100)})
      equal(AlphaPageContext.address(bad), null, "refused address " + (bad == null ? "null" : bad.substring(0, Math.min(40, bad.length()))));
    equal(AlphaPageContext.origin("https://accounts.example/signin?token=abc#x"), "https://accounts.example/signin", "a withheld page loses its query");
    equal(AlphaPageContext.title("  Two\nlines\u0007 here "), "Two lines here", "title is one line");
    equal(AlphaPageContext.title(null), "", "missing title");
    equal(AlphaPageContext.title("t".repeat(400)).length(), 300, "title bounded");

    JSONObject read = AlphaPageContext.accept(page("{\"text\":\"# Story\\nBody\",\"truncated\":false,\"selection\":\"Body\",\"links\":[{\"text\":\"More\",\"url\":\"https://example.com/more\"}]}"));
    check(read != null, "a well-formed read is accepted");
    equal(read.getString("text"), "# Story\nBody", "text kept");
    equal(read.getJSONArray("links").getJSONObject(0).getString("url"), "https://example.com/more", "link kept");
    equal(AlphaPageContext.accept(page("{\"withheld\":\"sensitive-page\"}")).toString(), "{\"withheld\":\"sensitive-page\"}", "withheld kept");
    String[] refused = {
      "{\"text\":\"x\",\"truncated\":false,\"cookies\":\"a=b\"}",
      "{\"text\":\"x\"}",
      "{\"text\":7,\"truncated\":false}",
      "{\"text\":\"" + "a".repeat(6001) + "\",\"truncated\":true}",
      "{\"withheld\":\"private\"}",
      "{\"withheld\":\"sensitive-page\",\"text\":\"x\"}",
      "{\"text\":\"x\",\"truncated\":false,\"selection\":\"\"}",
      "{\"text\":\"x\",\"truncated\":false,\"links\":[{\"text\":\"a\",\"url\":\"http://example.com/\"}]}",
      "{\"text\":\"x\",\"truncated\":false,\"links\":[{\"text\":\"a\",\"url\":\"https://example.com/#x\"}]}",
      "{\"text\":\"x\",\"truncated\":false,\"links\":[{\"text\":\" \",\"url\":\"https://example.com/\"}]}",
      "{\"text\":\"x\",\"truncated\":false,\"links\":[{\"text\":\"a\",\"url\":\"https://example.com/\",\"title\":\"b\"}]}",
    };
    for (String value : refused) equal(AlphaPageContext.accept(page(value)), null, "refused " + value.substring(0, Math.min(60, value.length())));
    JSONArray many = new JSONArray();
    for (int i = 0; i < 21; i++) many.put(new JSONObject().put("text", "l").put("url", "https://example.com/" + i));
    equal(AlphaPageContext.accept(new JSONObject().put("text", "x").put("truncated", false).put("links", many)), null, "more than 20 links refused");
    equal(AlphaPageContext.accept("not an object"), null, "non-object refused");
    equal(AlphaPageContext.accept(null), null, "null refused");
    System.out.println(new JSONObject().put("assertions", assertions).put("script", AlphaPageContext.SCRIPT).toString());
  }
}
