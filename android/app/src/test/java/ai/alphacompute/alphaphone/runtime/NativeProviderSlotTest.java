package ai.alphacompute.alphaphone.runtime;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertThrows;

import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

/**
 * spec/account/provider.md, "A voice key alone is changed in place, keeping the saved text key and the route":
 * {@link NativeProviderSlot#editKeys} behind {@code Agent.editProviderKeys}.
 */
@RunWith(RobolectricTestRunner.class)
@Config(manifest = Config.NONE, sdk = 35)
public class NativeProviderSlotTest {
  private static final String TEXT = "synthetic-text-key-0123", VOICE = "synthetic-voice-key-0123", NEW_VOICE = "synthetic-voice-key-4567";

  /** An in-memory slot holding the owner's saved own keys. */
  private static final class Slot implements NativeProviderSlot.Store {
    String value;
    Slot(String value) { this.value = value; }
    @Override public String readProvider() { return value; }
    @Override public void assertCurrent() {}
    @Override public String compareExchangeProvider(String previous, String selection) {
      if (previous == null ? value != null : !previous.equals(value)) return null;
      value = selection;
      return selection;
    }
    @Override public void removeProvider(boolean onlyIfPresent) { value = null; }
  }

  private static Slot ownKeys() throws Exception {
    return new Slot(new JSONObject().put("provider", "cerebras").put("model", NativeProviderAdmission.CEREBRAS_PROVIDER_MODEL)
        .put("key", TEXT).put("cartesiaKey", VOICE).put("revision", "r1").toString());
  }

  private static final NativeProviderSlot.KeyCheck NEVER_CALLED = (key, model) -> { throw new AssertionError("a voice edit never checks the text key"); };

  @Test public void aVoiceEditLeavesTheTextKeyAndTheRouteAsTheyWere() throws Exception {
    Slot slot = ownKeys();
    String revision = NativeProviderSlot.managementRevision(slot.value, 0);
    assertNull(NativeProviderSlot.editKeys(slot, revision, null, NEW_VOICE, NEVER_CALLED));
    JSONObject saved = new JSONObject(slot.value);
    assertEquals(TEXT, saved.getString("key"));
    assertEquals(NEW_VOICE, saved.getString("cartesiaKey"));
    assertEquals("cerebras", saved.getString("provider"));
    assertEquals(NativeProviderAdmission.CEREBRAS_PROVIDER_MODEL, saved.getString("model"));
  }

  @Test public void anEditFromAnOutdatedFormOrWithAnInvalidKeyChangesNothing() throws Exception {
    Slot slot = ownKeys();
    String before = slot.value;
    assertThrows(IllegalStateException.class, () -> NativeProviderSlot.editKeys(slot, "r0:0", null, NEW_VOICE, NEVER_CALLED));
    assertThrows(IllegalArgumentException.class,
        () -> NativeProviderSlot.editKeys(slot, NativeProviderSlot.managementRevision(before, 0), null, "", NEVER_CALLED));
    assertThrows(IllegalArgumentException.class,
        () -> NativeProviderSlot.editKeys(slot, NativeProviderSlot.managementRevision(before, 0), null, null, NEVER_CALLED));
    assertEquals(before, slot.value);
  }

  @Test public void aTextKeyTheProviderRefusesIsNotSaved() throws Exception {
    Slot slot = ownKeys();
    String before = slot.value;
    assertEquals("Key not accepted", NativeProviderSlot.editKeys(slot, NativeProviderSlot.managementRevision(before, 0),
        "synthetic-text-key-4567", null, (key, model) -> "Key not accepted"));
    assertEquals(before, slot.value);
  }
}
