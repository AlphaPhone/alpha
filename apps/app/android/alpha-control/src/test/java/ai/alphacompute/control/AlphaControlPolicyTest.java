// spec/app/control/index.md, "Story: Enforce formal safety guarantees over external app control"
package ai.alphacompute.control;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicInteger;
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
            AlphaControlPolicy.classifyScreenProtection(false, false, true, false, false, true)
                == AlphaControlPolicy.ScreenProtection.SensitiveView,
            "sensitive focused input must classify SensitiveView"
        );
        check(
            AlphaControlPolicy.classifyScreenProtection(false, false, true, false, false, false)
                == AlphaControlPolicy.ScreenProtection.ScreenClear,
            "clear unlocked screen must classify ScreenClear"
        );
        check(
            "".equals(AlphaAccessibilityService.resolveNextActivity("com.android.vending", "org.mozilla.firefox", "PurchaseActivity", null)),
            "package transition without class name must clear stale activeActivity"
        );
        check(
            "HomeActivity".equals(AlphaAccessibilityService.resolveNextActivity("org.mozilla.firefox", "org.mozilla.firefox", "HomeActivity", null)),
            "same-package event without class name preserves activeActivity"
        );
        check(
            "SettingsActivity".equals(AlphaAccessibilityService.resolveNextActivity("org.mozilla.firefox", "com.android.settings", "HomeActivity", "SettingsActivity")),
            "explicit class name updates activeActivity"
        );
        check(
            AlphaAccessibilityService.shouldEmitNode(false, false, true, false),
            "interactive descendants must emit even if visibility lags during window transition"
        );
        check(
            AlphaAccessibilityService.shouldEmitNode(false, false, false, true),
            "text descendants must emit even if visibility lags during window transition"
        );
        check(
            !AlphaAccessibilityService.shouldEmitNode(false, true, false, false),
            "invisible empty containers must not emit noise while remaining traversable"
        );
        check(
            AlphaAccessibilityService.shouldRetryEmptyObservation("com.android.chrome", "FirstRunActivity", "com.android.chrome", 0, 1_000L, 1_450L),
            "empty observation for AllowedApp must retry after 400ms"
        );
        check(
            !AlphaAccessibilityService.shouldRetryEmptyObservation("com.android.chrome", "FirstRunActivity", "com.android.chrome", 0, 1_000L, 1_200L),
            "empty observation retry must stay rate-limited under 400ms"
        );
        check(
            !AlphaAccessibilityService.shouldRetryEmptyObservation("com.android.chrome", "FirstRunActivity", "com.android.chrome", 8, 1_000L, 2_000L),
            "populated observation for current package must not retry"
        );
        check(
            AlphaAccessibilityService.shouldRetryEmptyObservation("com.android.chrome", "FirstRunActivity", "com.google.android.apps.nexuslauncher", 12, 1_000L, 1_500L),
            "stale package observation must retry once activePackage switches to AllowedApp"
        );
        check(
            !AlphaAccessibilityService.shouldRetryEmptyObservation("com.android.settings", "Settings", "com.android.settings", 0, 1_000L, 2_000L),
            "blocked packages must not trigger content-change retry captures"
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

        AlphaUiControlExecutor.StepOutcome openUrlUnleased = executor.executeOperation(
            new JSONObject().put("type", "app_open_url").put("url", "https://example.org"),
            0,
            ""
        );
        check("refused".equals(openUrlUnleased.outcome) && "BLOCKED_PACKAGE".equals(openUrlUnleased.refusalCode), "open_url without leased package refused");

        AlphaUiControlExecutor.StepOutcome openUrlMismatch = executor.executeOperation(
            new JSONObject().put("type", "app_open_url").put("url", "https://example.org").put("packageName", "com.android.chrome"),
            0,
            "org.mozilla.firefox"
        );
        check("refused".equals(openUrlMismatch.outcome) && "PACKAGE_MISMATCH".equals(openUrlMismatch.refusalCode), "open_url mismatched package refused");

        AlphaUiControlExecutor.StepOutcome openUrlDefaultedNoContext = executor.executeOperation(
            new JSONObject().put("type", "app_open_url").put("url", "https://example.org"),
            0,
            "org.mozilla.firefox"
        );
        check("refused".equals(openUrlDefaultedNoContext.outcome) && "CONTEXT_UNAVAILABLE".equals(openUrlDefaultedNoContext.refusalCode), "open_url defaults targetPkg to expectedPackage");

        executor.pollOnce();
        check(postedPaths.contains("GET /api/alpha-control/next"), "executor polled next route");
        check(postedPaths.contains("POST /api/alpha-control/receipt"), "executor posted refusal receipt");
    }

    /** Verify runtime exceptions always emit a refused receipt, opIds never execute twice, and worker shuts down cleanly. */
    @Test
    public void testExecutorExceptionReceiptDeduplicationAndLifecycle() throws Exception {
        List<JSONObject> receipts = new ArrayList<>();
        AtomicInteger receiptAttempts = new AtomicInteger(0);
        AtomicInteger execCount = new AtomicInteger(0);

        AlphaUiControlExecutor.NativeAgentTransport retryTransport = (method, path, body) -> {
            if ("GET".equals(method) && "/api/alpha-control/next".equals(path)) {
                String json = "{\"op\":{\"opId\":99,\"boundSnapId\":0,\"expectedPackage\":\"org.mozilla.firefox\",\"op\":{\"type\":\"app_open_url\",\"url\":\"https://example.org\"}}}";
                return CompletableFuture.completedFuture(new AlphaUiControlExecutor.TransportResponse(200, json.getBytes(StandardCharsets.UTF_8)));
            }
            if ("POST".equals(method) && "/api/alpha-control/receipt".equals(path)) {
                int attempt = receiptAttempts.incrementAndGet();
                try {
                    receipts.add(new JSONObject(new String(body, StandardCharsets.UTF_8)));
                } catch (Exception failed) {
                    throw new RuntimeException(failed);
                }
                int status = attempt == 1 ? 503 : 200;
                return CompletableFuture.completedFuture(new AlphaUiControlExecutor.TransportResponse(status, "{}".getBytes(StandardCharsets.UTF_8)));
            }
            return CompletableFuture.completedFuture(new AlphaUiControlExecutor.TransportResponse(200, "{}".getBytes(StandardCharsets.UTF_8)));
        };

        AlphaUiControlExecutor dedupExecutor = new AlphaUiControlExecutor(null, retryTransport, (op, snapId, expectedPkg) -> {
            execCount.incrementAndGet();
            return new AlphaUiControlExecutor.StepOutcome("done", null, null);
        });
        dedupExecutor.pollOnce();
        dedupExecutor.pollOnce();
        check(execCount.get() == 1, "transient receipt failure must not execute the same opId twice");
        check(receipts.size() == 2, "second poll must retry posting the cached receipt");
        check(receipts.get(0).getInt("opId") == 99 && "done".equals(receipts.get(0).getString("outcome")), "first receipt carries opId and outcome");
        check(receipts.get(1).getInt("opId") == 99 && "done".equals(receipts.get(1).getString("outcome")), "retried receipt matches cached outcome");

        List<JSONObject> errorReceipts = new ArrayList<>();
        AlphaUiControlExecutor.NativeAgentTransport crashTransport = (method, path, body) -> {
            if ("GET".equals(method) && "/api/alpha-control/next".equals(path)) {
                String json = "{\"op\":{\"opId\":100,\"boundSnapId\":0,\"expectedPackage\":\"org.mozilla.firefox\",\"op\":{\"type\":\"app_launch_package\",\"packageName\":\"org.mozilla.firefox\"}}}";
                return CompletableFuture.completedFuture(new AlphaUiControlExecutor.TransportResponse(200, json.getBytes(StandardCharsets.UTF_8)));
            }
            if ("POST".equals(method) && "/api/alpha-control/receipt".equals(path)) {
                try {
                    errorReceipts.add(new JSONObject(new String(body, StandardCharsets.UTF_8)));
                } catch (Exception failed) {
                    throw new RuntimeException(failed);
                }
            }
            return CompletableFuture.completedFuture(new AlphaUiControlExecutor.TransportResponse(200, "{}".getBytes(StandardCharsets.UTF_8)));
        };

        AlphaUiControlExecutor crashExecutor = new AlphaUiControlExecutor(null, crashTransport, (op, snapId, expectedPkg) -> {
            throw new SecurityException("denied");
        });
        crashExecutor.pollOnce();
        check(errorReceipts.size() == 1, "uncaught RuntimeException must still emit a refused receipt");
        check("refused".equals(errorReceipts.get(0).getString("outcome")), "exception receipt outcome must be refused");
        check("SECURITY_EXCEPTION".equals(errorReceipts.get(0).getString("refusalCode")), "SecurityException maps to SECURITY_EXCEPTION refusalCode");

        List<JSONObject> genericErrorReceipts = new ArrayList<>();
        AlphaUiControlExecutor.NativeAgentTransport genericCrashTransport = (method, path, body) -> {
            if ("GET".equals(method) && "/api/alpha-control/next".equals(path)) {
                String json = "{\"op\":{\"opId\":101,\"boundSnapId\":0,\"expectedPackage\":\"org.mozilla.firefox\",\"op\":{\"type\":\"app_launch_package\",\"packageName\":\"org.mozilla.firefox\"}}}";
                return CompletableFuture.completedFuture(new AlphaUiControlExecutor.TransportResponse(200, json.getBytes(StandardCharsets.UTF_8)));
            }
            if ("POST".equals(method) && "/api/alpha-control/receipt".equals(path)) {
                try {
                    genericErrorReceipts.add(new JSONObject(new String(body, StandardCharsets.UTF_8)));
                } catch (Exception failed) {
                    throw new RuntimeException(failed);
                }
            }
            return CompletableFuture.completedFuture(new AlphaUiControlExecutor.TransportResponse(200, "{}".getBytes(StandardCharsets.UTF_8)));
        };
        AlphaUiControlExecutor genericCrashExecutor = new AlphaUiControlExecutor(null, genericCrashTransport, (op, snapId, expectedPkg) -> {
            throw new IllegalStateException("boom");
        });
        genericCrashExecutor.pollOnce();
        check(genericErrorReceipts.size() == 1, "generic RuntimeException emits refused receipt");
        check("EXECUTION_FAILED".equals(genericErrorReceipts.get(0).getString("refusalCode")), "generic RuntimeException maps to EXECUTION_FAILED");

        dedupExecutor.start();
        dedupExecutor.stop();
        dedupExecutor.pollOnce();
        check(execCount.get() == 2, "stopping executor clears opId dedup cache for a fresh session");
        dedupExecutor.start();
        dedupExecutor.shutdown();
    }

    /** Standalone JVM entry point for fast verification without Gradle overhead. */
    public static void main(String[] args) throws Exception {
        AlphaControlPolicyTest suite = new AlphaControlPolicyTest();
        suite.testPolicyRules();
        suite.testExecutorRefusals();
        suite.testExecutorExceptionReceiptDeduplicationAndLifecycle();
    }
}
