package ai.alphacompute.alphaphone;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;

import com.getcapacitor.JSObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

/** Carrier & SIM setup's fact boundary (spec/settings/carrier.md): a genuine value is kept, and a denial or missing hardware is never turned into one. */
@RunWith(RobolectricTestRunner.class)
@Config(manifest = Config.NONE, sdk = 35)
public class AlphaCarrierSetupPluginTest {
    @Test public void genuineValueIsKeptTrimmed() {
        JSObject imei = AlphaCarrierSetupPlugin.field(() -> " 123456789012345 ");
        assertEquals("available", imei.getString("status"));
        assertEquals("123456789012345", imei.getString("value"));
    }

    @Test public void missingBlankOrUnknownIsUnavailableWithoutValue() {
        for (Object value : new Object[] {null, "", "  ", "unknown", "UNKNOWN"}) {
            JSObject fact = AlphaCarrierSetupPlugin.field(() -> value);
            assertEquals("unavailable", fact.getString("status"));
            assertFalse(fact.has("value"));
        }
    }

    @Test public void androidRefusalsKeepTheirReasonAndNoValue() {
        JSObject denied = AlphaCarrierSetupPlugin.field(() -> { throw new SecurityException("private failure"); });
        assertEquals("permission-denied", denied.getString("status"));
        assertFalse(denied.has("value"));
        assertEquals("unsupported", AlphaCarrierSetupPlugin.field(() -> { throw new UnsupportedOperationException(); }).getString("status"));
        assertEquals("unavailable", AlphaCarrierSetupPlugin.field(() -> { throw new IllegalStateException(); }).getString("status"));
    }
}
