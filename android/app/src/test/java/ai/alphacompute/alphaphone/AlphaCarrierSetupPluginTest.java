package ai.alphacompute.alphaphone;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import com.getcapacitor.JSObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

/**
 * Each Carrier &amp; SIM field answers what Android said of it: its value, or why there is none. A
 * refused permission and an unsupported read are told apart from a value Android does not have.
 * JVM evidence only: no real TelephonyManager, SIM or eSIM is read.
 */
@RunWith(RobolectricTestRunner.class)
@Config(manifest = Config.NONE, sdk = 35)
public class AlphaCarrierSetupPluginTest {
    @Test public void aFieldSaysWhyItHasNoValue() {
        JSObject imei = AlphaCarrierSetupPlugin.field(() -> " 356938035643809 ");
        assertEquals("available", imei.getString("status"));
        assertEquals("356938035643809", imei.getString("value"));
        assertEquals("permission-denied", AlphaCarrierSetupPlugin.field(() -> { throw new SecurityException("READ_PRIVILEGED_PHONE_STATE"); }).getString("status"));
        assertEquals("unsupported", AlphaCarrierSetupPlugin.field(() -> { throw new UnsupportedOperationException(); }).getString("status"));
        assertEquals("unavailable", AlphaCarrierSetupPlugin.field(() -> { throw new IllegalStateException(); }).getString("status"));
        assertEquals("unavailable", AlphaCarrierSetupPlugin.field(() -> null).getString("status"));
        assertEquals("unavailable", AlphaCarrierSetupPlugin.field(() -> "unknown").getString("status"));
        assertFalse(AlphaCarrierSetupPlugin.field(() -> "").has("value"));
    }
}
