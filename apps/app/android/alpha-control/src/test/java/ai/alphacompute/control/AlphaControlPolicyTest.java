// spec/app/control/index.md, "Story: Enforce formal safety guarantees over external app control"
package ai.alphacompute.control;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import org.json.JSONObject;
import org.junit.Test;

/** Pure JVM verification tests for AlphaControlPolicy and AlphaUiControlExecutor safety rules. */
public final class AlphaControlPolicyTest {
    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    /** Verify blocked packages, Play Store billing activities, HTTPS URLs, screen protection, and keycode allowlists. */
    @Test
    public void testPolicyRules() {
        check(AlphaControlPolicy.isBlockedTarget("com.android.permissioncontroller", null), "permissioncontroller must be blocked");
        check(AlphaControlPolicy.isBlockedTarget("com.android.packageinstaller", null), "packageinstaller must be blocked");
        check(AlphaControlPolicy.isBlockedTarget("com.android.settings", null), "settings must be blocked");
        check(AlphaControlPolicy.isBlockedTarget("proton.android.pass", null), "password managers must be blocked");
        check(AlphaControlPolicy.isBlockedTarget("ai.alphacompute.alphaphone", null), "Alpha approval host must be blocked");
        check(AlphaControlPolicy.isBlockedTarget("ai.alphacompute.wallet", null), "Alpha wallet must be blocked");
        check(AlphaControlPolicy.isBlockedTarget("com.android.vending", "com.google.android.finsky.billing.PurchaseActivity"), "Play billing must be blocked");
        check(!AlphaControlPolicy.isBlockedTarget("com.android.vending", "com.google.android.finsky.activities.MainActivity"), "Play browse allowed");
        check(!AlphaControlPolicy.isBlockedTarget("org.mozilla.firefox", "org.mozilla.fenix.HomeActivity"), "Firefox allowed");

        check(AlphaControlPolicy.isValidHttpsUrl("https://example.org/docs"), "HTTPS URL allowed");
        check(!AlphaControlPolicy.isValidHttpsUrl("http://example.org"), "HTTP URL refused");
        check(!AlphaControlPolicy.isValidHttpsUrl("javascript:alert(1)"), "javascript scheme refused");
        check(!AlphaControlPolicy.isValidHttpsUrl("https://user:pass@example.org"), "userinfo URL refused");

        check(AlphaControlPolicy.isFirefoxPackage("org.mozilla.firefox"), "Firefox detected");
        check(AlphaControlPolicy.isPrivateBrowserWindow("org.mozilla.firefox", "Private Browsing", false), "Firefox private title detected");
        check(AlphaControlPolicy.isPrivateBrowserWindow("org.mozilla.firefox", "Firefox", true), "Firefox FLAG_SECURE private detected");

        check(
            AlphaControlPolicy.classifyScreenProtection(true, false, true, false, false, false)
                == AlphaControlPolicy.ScreenProtection.ScreenLocked,
            "keyguard lock must classify ScreenLocked"
        );
        check(
            AlphaControlPolicy.classifyScreenProtection(false, false, true, true, false, false)
                == AlphaControlPolicy.ScreenProtection.SecureFlag,
            "FLAG_SECURE must classify SecureFlag"
        );
        check(
            AlphaControlPolicy.classifyScreenProtection(false, false, true, false, true, false)
                == AlphaControlPolicy.ScreenProtection.PrivateTab,
            "private tab must classify PrivateTab"
        );
        check(
            AlphaControlPolicy.classifyScreenProtection(false, false, true, false, false, false)
                == AlphaControlPolicy.ScreenProtection.ScreenClear,
            "clear unlocked screen must classify ScreenClear"
        );

        check(!AlphaControlPolicy.isScreenshotAllowed(1_000L, 1_500L, false), "Tier-1 screenshot must throttle under 1100ms");
        check(AlphaControlPolicy.isScreenshotAllowed(1_000L, 2_200L, false), "Tier-1 screenshot allowed after 1100ms");
        check(AlphaControlPolicy.isScreenshotAllowed(1_000L, 1_050L, true), "Tier-2 screenshot unthrottled");

        check(AlphaControlPolicy.resolveAllowlistedKeyCode("ENTER") > 0, "ENTER allowlisted");
        check(AlphaControlPolicy.resolveAllowlistedKeyCode("POWER") < 0, "POWER refused");
        check(!AlphaControlPolicy.requiresSnapshot("app_open_url"), "app_open_url needs no prior snapshot");
        check(AlphaControlPolicy.requiresSnapshot("ui_click"), "ui_click requires live snapshot");
    }

    /** Verify executor refuses blocked packages, stale snapshots, and non-privileged key injection cleanly. */
    @Test
    public void testExecutorRefusals() throws Exception {
        List<String> postedPaths = new ArrayList<>();
        AlphaUiControlExecutor.NativeAgentTransport transport = (method, path, body) -> {
            postedPaths.add(method + " " + path);
            if ("GET".equals(method) && "/api/alpha-control/next".equals(path)) {
                String json = "{\"op\":{\"opId\":7,\"boundSnapId\":1,\"expectedPackage\":\"org.mozilla.firefox\",\"op\":{\"type\":\"ui_click\",\"snapshotId\":1,\"expectedPackage\":\"org.mozilla.firefox\",\"nodeId\":\"n1\"}}}";
                return CompletableFuture.completedFuture(new AlphaUiControlExecutor.TransportResponse(200, json.getBytes(StandardCharsets.UTF_8)));
            }
            return CompletableFuture.completedFuture(new AlphaUiControlExecutor.TransportResponse(200, "{}".getBytes(StandardCharsets.UTF_8)));
        };
        AlphaUiControlExecutor executor = new AlphaUiControlExecutor(null, transport);
        check(executor.currentTier() == AlphaControlPolicy.ControlTier.TierNone, "disconnected service is TierNone");

        AlphaUiControlExecutor.StepOutcome blocked = executor.executeOperation(
            new JSONObject().put("type", "app_launch_package").put("packageName", "com.android.settings"),
            0,
            "com.android.settings"
        );
        check("refused".equals(blocked.outcome) && "BLOCKED_PACKAGE".equals(blocked.refusalCode), "blocked package refused");

        AlphaUiControlExecutor.StepOutcome stale = executor.executeOperation(
            new JSONObject().put("type", "ui_click").put("snapshotId", 1).put("expectedPackage", "org.mozilla.firefox").put("nodeId", "n1"),
            1,
            "org.mozilla.firefox"
        );
        check("refused".equals(stale.outcome) && "STALE_SNAPSHOT".equals(stale.refusalCode), "stale snapshot refused");

        executor.pollOnce();
        check(postedPaths.contains("GET /api/alpha-control/next"), "executor polled next route");
        check(postedPaths.contains("POST /api/alpha-control/receipt"), "executor posted refusal receipt");
    }

    /** Standalone JVM entry point for fast verification without Gradle overhead. */
    public static void main(String[] args) throws Exception {
        AlphaControlPolicyTest suite = new AlphaControlPolicyTest();
        suite.testPolicyRules();
        suite.testExecutorRefusals();
    }
}
