// spec/app/browser/reading.md, "Story: Ask Alpha about the page"
package ai.alphacompute.alphaphone.browser;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

public final class AlphaPageContextTest {
 @Test public void theAgentSeesOnlyAPublicHttpsAddressAndAOneLineTitle() {
  assertEquals("https://Example.com/a/b?q=1", AlphaPageContext.address("https://Example.com/a/b?q=1#frag"));
  assertEquals("https://example.com/", AlphaPageContext.address("HTTPS://example.com/"));
  for (String refused : new String[] {"http://example.com/", "https://user:pass@example.com/", "javascript:alert(1)", "file:///etc/passwd", "about:blank", "", null, "https://example.com/" + "a".repeat(2100)})
   assertNull(String.valueOf(refused), AlphaPageContext.address(refused));
  assertEquals("https://accounts.example/signin", AlphaPageContext.origin("https://accounts.example/signin?token=abc#x"));
  assertEquals("Two lines here", AlphaPageContext.title("  Two\nlines\u0007 here "));
  assertEquals("", AlphaPageContext.title(null));
  assertEquals(300, AlphaPageContext.title("t".repeat(400)).length());
 }

 @Test public void onlyAWellFormedReadOfThePageIsAccepted() {
  JSONObject read = AlphaPageContext.accept(new JSONObject("{\"text\":\"# Story\\nBody\",\"truncated\":false,\"selection\":\"Body\",\"links\":[{\"text\":\"More\",\"url\":\"https://example.com/more\"}]}"));
  assertNotNull(read);
  assertEquals("# Story\nBody", read.getString("text"));
  assertEquals("https://example.com/more", read.getJSONArray("links").getJSONObject(0).getString("url"));
  assertEquals("{\"withheld\":\"sensitive-page\"}", AlphaPageContext.accept(new JSONObject("{\"withheld\":\"sensitive-page\"}")).toString());
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
  for (String value : refused) assertNull(value.substring(0, Math.min(60, value.length())), AlphaPageContext.accept(new JSONObject(value)));
  JSONArray many = new JSONArray();
  for (int i = 0; i < 21; i++) many.put(new JSONObject().put("text", "l").put("url", "https://example.com/" + i));
  assertNull(AlphaPageContext.accept(new JSONObject().put("text", "x").put("truncated", false).put("links", many)));
  assertNull(AlphaPageContext.accept("not an object"));
  assertNull(AlphaPageContext.accept(null));
 }
}
