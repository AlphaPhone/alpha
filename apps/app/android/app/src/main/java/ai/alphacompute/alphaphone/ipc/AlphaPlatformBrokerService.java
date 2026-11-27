package ai.alphacompute.alphaphone.ipc;

import ai.alphacompute.alphaphone.BuildConfig;
import ai.alphacompute.ipc.AlphaIpcContract;
import ai.alphacompute.ipc.AlphaSuitePolicy;
import ai.alphacompute.ipc.IAlphaCloudCallback;
import ai.alphacompute.ipc.IAlphaPlatformBroker;
import ai.alphacompute.ipc.PfdStreams;
import ai.eliza.os.agent.AgentService;
import ai.eliza.plugins.securestore.nativeonly.SecureSlotPolicy.Caller;
import ai.eliza.plugins.securestore.nativeonly.SecureSlotPolicy.ExchangeOutcome;
import ai.eliza.plugins.securestore.nativeonly.SecureSlots;
import ai.eliza.plugins.signin.CloudRequestPolicy;
import ai.eliza.plugins.signin.CloudRequests;
import ai.eliza.plugins.signin.CredentialPolicy;
import ai.eliza.plugins.signin.CredentialReader;
import ai.eliza.plugins.signin.DeviceCustody;
import ai.eliza.plugins.signin.LargeBodyGrant;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import android.os.ParcelFileDescriptor;
import android.os.RemoteException;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Signature-protected Binder broker anchoring Cloud custody, Sign-In state, SecureStore slots, and Google consent in AlphaCore. */
public final class AlphaPlatformBrokerService extends Service {
    private static final String CAPACITOR_CONFIG = "capacitor.config.json";
    private static final String AGENT_CONSENT_STORE = "alpha-agent";
    private static final String CONSENT_GMAIL = "google-gmail-changes";
    private static final String CONSENT_CALENDAR = "google-calendar-edits";
    private static final int MAX_CLOUD_REPLY_BYTES = 64 * 1024 * 1024;
    private static final Object CONSENT_LOCK = new Object();

    private final AlphaSuitePolicy policy = AlphaSuitePolicy.defaults();
    private final ExecutorService workers = Executors.newFixedThreadPool(4, task -> {
        Thread thread = new Thread(task, "AlphaPlatformBroker");
        thread.setDaemon(true);
        return thread;
    });

    private LargeBodyGrant grants;
    private CloudRequests cloudRequests;

    private final IAlphaPlatformBroker.Stub binder = new IAlphaPlatformBroker.Stub() {
        @Override public void cloudRequest(
            String callId,
            String method,
            String path,
            String queryJson,
            String headersJson,
            byte[] inlineBody,
            ParcelFileDescriptor bodyFd,
            String expectedCredentialId,
            String expectedSessionCredentialId,
            IAlphaCloudCallback cb
        ) {
            if (cb == null) {
                closeQuietly(bodyFd);
                return;
            }
            String callingPkg = verifyPackageOrNull();
            if (callingPkg == null) {
                closeQuietly(bodyFd);
                notifyCloudError(cb, callId, AlphaIpcContract.CLOUD_NOT_LISTED, "Caller signature rejected");
                return;
            }
            if (!policy.isCloudRouteAllowed(callingPkg, path)) {
                closeQuietly(bodyFd);
                notifyCloudError(cb, callId, AlphaIpcContract.CLOUD_NOT_LISTED, "Cloud route not permitted for " + callingPkg);
                return;
            }
            if (cloudRequests == null) {
                closeQuietly(bodyFd);
                notifyCloudError(cb, callId, AlphaIpcContract.CLOUD_NOT_CONFIGURED, "Cloud policy not loaded");
                return;
            }
            String target = buildTarget(path, queryJson);
            if (target == null || method == null || method.isBlank()) {
                closeQuietly(bodyFd);
                notifyCloudError(cb, callId, AlphaIpcContract.CLOUD_INVALID_REQUEST, "Invalid cloud request");
                return;
            }
            Map<String, String> headers = parseStringMap(headersJson);
            boolean billingSession = expectedSessionCredentialId != null && !expectedSessionCredentialId.isBlank();
            String bindingId = billingSession ? expectedSessionCredentialId : expectedCredentialId;
            workers.execute(() -> executeCloud(callId, method, target, headers, inlineBody, bodyFd, bindingId, billingSession, cb));
        }

        @Override public String signInCall(String method, String argsJson) {
            String callingPkg = requireAuthorizedPackage();
            if (!policy.isSignInMethodAllowed(callingPkg, method)) {
                return signInError("Rejected", "Sign-in method not permitted for " + callingPkg);
            }
            return handleSignInMethod(method);
        }

        @Override public String secureStoreCall(String op, String key, String expected, String value) {
            String callingPkg = requireAuthorizedPackage();
            if ("status".equals(op)) {
                return handleSecureStoreStatus();
            }
            if (!policy.isSecureStoreSlotAllowed(callingPkg, key)) {
                return secureStoreFailure(AlphaIpcContract.SECURE_DENIED, null);
            }
            return handleSecureStoreOp(op, key, expected, value);
        }

        @Override public boolean setAgentGoogleConsent(boolean gmailChanges, boolean calendarEdits) {
            String callingPkg = requireAuthorizedPackage();
            if (!policy.isGoogleConsentAllowed(callingPkg)) {
                throw new SecurityException("Google consent change not permitted for " + callingPkg);
            }
            return keepGoogleConsent(gmailChanges, calendarEdits);
        }

        @Override public String diagnosticsFactsJson() {
            requireAuthorizedPackage();
            JSONObject facts = new JSONObject();
            try {
                facts.put("appVersion", BuildConfig.VERSION_NAME)
                    .put("versionCode", BuildConfig.VERSION_CODE)
                    .put("variant", "core")
                    .put("buildType", BuildConfig.BUILD_TYPE)
                    .put("testMocks", false)
                    .put("sdkInt", Build.VERSION.SDK_INT)
                    .put("androidRelease", Build.VERSION.RELEASE)
                    .put("securityPatch", Build.VERSION.SECURITY_PATCH);
            } catch (JSONException impossible) {
                throw new IllegalStateException(impossible);
            }
            return facts.toString();
        }
    };

    @Override public void onCreate() {
        super.onCreate();
        grants = new LargeBodyGrant(getCacheDir());
        CloudRequestPolicy cloudPolicy = new CloudRequestPolicy(loadCloudRoutesJson());
        if (cloudPolicy.loaded()) {
            cloudRequests = new CloudRequests(cloudPolicy, grants);
        }
    }

    @Override public IBinder onBind(Intent intent) {
        return binder;
    }

    @Override public void onDestroy() {
        workers.shutdownNow();
        if (grants != null) grants.clear();
        super.onDestroy();
    }

    private void executeCloud(
        String callId,
        String method,
        String target,
        Map<String, String> headers,
        byte[] inlineBody,
        ParcelFileDescriptor bodyFd,
        String expectedCredentialId,
        boolean billingSession,
        IAlphaCloudCallback cb
    ) {
        byte[] requestBytes;
        try {
            requestBytes = PfdStreams.unpack(inlineBody, bodyFd, AlphaIpcContract.MAX_PFD_BODY_BYTES);
        } catch (IOException failed) {
            String code = failed instanceof PfdStreams.PayloadTooLargeException ? "body-too-large" : "network";
            notifyCloudError(cb, callId, code, failed.getMessage());
            return;
        }
        String origin = BuildConfig.CLOUD_API_ORIGIN;
        CloudRequests.Outcome outcome = cloudRequests.send(
            callId,
            origin,
            DeviceCustody.cloud(this, origin),
            method.toUpperCase(Locale.ROOT),
            target,
            headers,
            requestBytes,
            expectedCredentialId,
            billingSession
        );
        if (outcome instanceof CloudRequests.Failed failed) {
            String wire = failed.failure().name().toLowerCase(Locale.ROOT).replace('_', '-');
            notifyCloudError(cb, callId, wire, wire);
            return;
        }
        CloudRequests.Answered answered = (CloudRequests.Answered) outcome;
        byte[] replyBytes;
        try {
            replyBytes = readReplyBytes(answered);
        } catch (IOException failed) {
            notifyCloudError(cb, callId, "reply-too-large", failed.getMessage());
            return;
        }
        String replyHeadersJson = encodeCloudHeaders(answered);
        try (PfdStreams.Payload packed = PfdStreams.pack(replyBytes, MAX_CLOUD_REPLY_BYTES)) {
            cb.onResponse(callId, answered.status(), replyHeadersJson, packed.inlineBody(), packed.bodyFd());
        } catch (IOException | RemoteException failed) {
            notifyCloudError(cb, callId, "network", failed.getMessage());
        }
    }

    private byte[] readReplyBytes(CloudRequests.Answered answered) throws IOException {
        LargeBodyGrant.Grant grant = answered.grant();
        if (grant == null) {
            return answered.body() == null ? new byte[0] : answered.body();
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream((int) Math.min(grant.size(), 1024 * 1024));
        while (true) {
            LargeBodyGrant.Chunk chunk = grants.read(grant.id());
            if (chunk == null) throw new IOException("Cloud reply grant missing");
            out.write(chunk.data());
            if (out.size() > MAX_CLOUD_REPLY_BYTES) throw new IOException("Cloud reply exceeds limit");
            if (chunk.done()) break;
        }
        return out.toByteArray();
    }

    private String handleSignInMethod(String method) {
        CredentialReader reader = DeviceCustody.reader(this, BuildConfig.CLOUD_API_ORIGIN);
        if ("status".equals(method)) {
            CredentialReader.Credential active = reader.current();
            CredentialPolicy.Account account = active != null ? active.account() : reader.account();
            JSONObject out = new JSONObject();
            try {
                out.put("ok", true)
                    .put("environment", "production")
                    .put("state", active != null ? "ready" : "signed_out")
                    .put("signedIn", active != null);
                if (active != null) {
                    out.put("credentialId", active.credentialId());
                }
                if (account != null) {
                    JSONObject accountObj = new JSONObject()
                        .put("id", account.id())
                        .put("email", account.email())
                        .put("name", account.name());
                    out.put("account", accountObj);
                } else {
                    out.put("account", JSONObject.NULL);
                }
            } catch (JSONException impossible) {
                throw new IllegalStateException(impossible);
            }
            return out.toString();
        }
        if ("serviceInfo".equals(method)) {
            JSONObject out = new JSONObject();
            try {
                out.put("ok", true).put("outcome", "ready").put("origin", BuildConfig.CLOUD_API_ORIGIN);
            } catch (JSONException impossible) {
                throw new IllegalStateException(impossible);
            }
            return out.toString();
        }
        return signInError("RequiresCoreActivity", "Interactive sign-in runs inside AlphaCore");
    }

    private String handleSecureStoreStatus() {
        JSONObject out = new JSONObject();
        try {
            SecureSlots slots = SecureSlots.forHost(this);
            slots.ensureAvailable();
            out.put("ok", true)
                .put("available", true)
                .put("backend", "android_keystore")
                .put("accessibility", "credential_encrypted_device_only")
                .put("synchronized", false)
                .put("accessGroup", "app_only");
        } catch (Exception unavailable) {
            try {
                out.put("ok", false)
                    .put("available", false)
                    .put("error", AlphaIpcContract.SECURE_UNAVAILABLE)
                    .put("backend", "unavailable")
                    .put("accessibility", "unavailable")
                    .put("synchronized", false)
                    .put("accessGroup", "app_only");
            } catch (JSONException impossible) {
                throw new IllegalStateException(impossible);
            }
        }
        return out.toString();
    }

    private String handleSecureStoreOp(String op, String key, String expected, String value) {
        SecureSlots slots;
        try {
            slots = SecureSlots.forHost(this);
        } catch (Exception unavailable) {
            return secureStoreFailure(AlphaIpcContract.SECURE_UNAVAILABLE, null);
        }
        if ("get".equals(op)) {
            SecureSlots.Reading reading = slots.read(Caller.RendererCaller, key);
            if (reading instanceof SecureSlots.Present present) {
                try {
                    return new JSONObject().put("ok", true).put("value", present.value()).toString();
                } catch (JSONException impossible) {
                    throw new IllegalStateException(impossible);
                }
            }
            if (reading instanceof SecureSlots.Absent) return secureStoreFailure("not_found", null);
            if (reading instanceof SecureSlots.Unreadable) return secureStoreFailure("unreadable", null);
            return secureStoreFailure(AlphaIpcContract.SECURE_DENIED, null);
        }
        ExchangeOutcome outcome = switch (op == null ? "" : op) {
            case "set" -> slots.write(Caller.RendererCaller, key, value == null ? "" : value);
            case "remove" -> slots.remove(Caller.RendererCaller, key);
            case "compareAndExchange" -> slots.compareAndExchange(Caller.RendererCaller, key, expected, value);
            default -> ExchangeOutcome.Refused;
        };
        return encodeExchangeOutcome(outcome);
    }

    private boolean keepGoogleConsent(boolean gmailChanges, boolean calendarEdits) {
        synchronized (CONSENT_LOCK) {
            SharedPreferences prefs = getSharedPreferences(AGENT_CONSENT_STORE, Context.MODE_PRIVATE);
            boolean hadPrevious = prefs.contains(CONSENT_GMAIL) && prefs.contains(CONSENT_CALENDAR);
            boolean prevGmail = prefs.getBoolean(CONSENT_GMAIL, false);
            boolean prevCalendar = prefs.getBoolean(CONSENT_CALENDAR, false);
            if (hadPrevious && prevGmail == gmailChanges && prevCalendar == calendarEdits) {
                return true;
            }
            if (!prefs.edit().putBoolean(CONSENT_GMAIL, gmailChanges).putBoolean(CONSENT_CALENDAR, calendarEdits).commit()) {
                return false;
            }
            String state = AgentService.status(this).optString("state");
            if (!"running".equals(state) && !"starting".equals(state)) {
                return true;
            }
            try {
                AgentService.restart(this);
                return true;
            } catch (IllegalStateException refused) {
                SharedPreferences.Editor revert = prefs.edit();
                if (hadPrevious) {
                    revert.putBoolean(CONSENT_GMAIL, prevGmail).putBoolean(CONSENT_CALENDAR, prevCalendar);
                } else {
                    revert.remove(CONSENT_GMAIL).remove(CONSENT_CALENDAR);
                }
                revert.commit();
                return false;
            }
        }
    }

    private String loadCloudRoutesJson() {
        try (InputStream in = getAssets().open(CAPACITOR_CONFIG)) {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[4096];
            for (int n; (n = in.read(chunk)) != -1; ) {
                buffer.write(chunk, 0, n);
            }
            JSONObject root = new JSONObject(buffer.toString(StandardCharsets.UTF_8.name()));
            JSONObject plugins = root.optJSONObject("plugins");
            JSONObject cloud = plugins == null ? null : plugins.optJSONObject("ElizaCloud");
            JSONArray routes = cloud == null ? null : cloud.optJSONArray("routes");
            return routes == null ? null : routes.toString();
        } catch (IOException | JSONException unavailable) {
            return null;
        }
    }

    private String verifyPackageOrNull() {
        return AlphaIpcContract.verifySameSignaturePackage(this, Binder.getCallingUid(), policy);
    }

    private String requireAuthorizedPackage() {
        String pkg = verifyPackageOrNull();
        if (pkg == null) {
            throw new SecurityException("Unauthorized IPC caller UID " + Binder.getCallingUid());
        }
        return pkg;
    }

    private static String buildTarget(String path, String queryJson) {
        if (path == null || !path.startsWith("/") || path.contains("?") || path.contains("#")) return null;
        if (queryJson == null || queryJson.isBlank() || "{}".equals(queryJson.trim())) return path;
        try {
            JSONObject query = new JSONObject(queryJson);
            StringBuilder builder = new StringBuilder(path);
            char separator = '?';
            for (Iterator<String> keys = query.keys(); keys.hasNext(); ) {
                String key = keys.next();
                String val = query.optString(key, "");
                builder.append(separator)
                    .append(URLEncoder.encode(key, StandardCharsets.UTF_8))
                    .append('=')
                    .append(URLEncoder.encode(val, StandardCharsets.UTF_8));
                separator = '&';
            }
            return builder.toString();
        } catch (JSONException malformed) {
            return null;
        }
    }

    private static Map<String, String> parseStringMap(String json) {
        Map<String, String> map = new LinkedHashMap<>();
        if (json == null || json.isBlank()) return map;
        try {
            JSONObject obj = new JSONObject(json);
            for (Iterator<String> keys = obj.keys(); keys.hasNext(); ) {
                String key = keys.next();
                Object value = obj.opt(key);
                if (value instanceof String text) {
                    map.put(key, text);
                }
            }
        } catch (JSONException ignored) {
        }
        return map;
    }

    private static String encodeCloudHeaders(CloudRequests.Answered answered) {
        JSONObject headers = new JSONObject();
        try {
            if (answered.etag() != null) headers.put("etag", answered.etag());
            if (answered.contentType() != null) headers.put("contentType", answered.contentType());
            if (answered.retryAfter() != null) headers.put("retryAfter", answered.retryAfter());
        } catch (JSONException impossible) {
            throw new IllegalStateException(impossible);
        }
        return headers.toString();
    }

    private static String encodeExchangeOutcome(ExchangeOutcome outcome) {
        return switch (outcome) {
            case Written, Removed -> {
                try {
                    yield new JSONObject().put("ok", true).put("outcome", outcome.name()).toString();
                } catch (JSONException impossible) {
                    throw new IllegalStateException(impossible);
                }
            }
            case Conflict -> secureStoreFailure("conflict", outcome);
            case CapacityRefused -> secureStoreFailure("storage_full", outcome);
            case Refused -> secureStoreFailure(AlphaIpcContract.SECURE_DENIED, outcome);
            case Failed -> secureStoreFailure("native_error", outcome);
            case Unconfirmed -> secureStoreFailure("unconfirmed", outcome);
        };
    }

    private static String secureStoreFailure(String code, ExchangeOutcome outcome) {
        JSONObject out = new JSONObject();
        try {
            out.put("ok", false).put("error", code);
            if (outcome != null) out.put("outcome", outcome.name());
        } catch (JSONException impossible) {
            throw new IllegalStateException(impossible);
        }
        return out.toString();
    }

    private static String signInError(String code, String message) {
        JSONObject out = new JSONObject();
        try {
            out.put("ok", false).put("error", code).put("message", message);
        } catch (JSONException impossible) {
            throw new IllegalStateException(impossible);
        }
        return out.toString();
    }

    private static void notifyCloudError(IAlphaCloudCallback cb, String callId, String code, String message) {
        try {
            cb.onError(callId, code, message == null ? code : message);
        } catch (RemoteException ignored) {
        }
    }

    private static void closeQuietly(ParcelFileDescriptor fd) {
        if (fd != null) {
            try {
                fd.close();
            } catch (IOException ignored) {
            }
        }
    }
}
