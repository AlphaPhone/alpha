package ai.alphacompute.alphaphone.ipc;

import ai.alphacompute.ipc.AlphaIpcContract;
import ai.alphacompute.ipc.AlphaSuitePolicy;
import ai.alphacompute.ipc.IAlphaAgentBroker;
import ai.alphacompute.ipc.IAlphaEventCallback;
import ai.alphacompute.ipc.IAlphaRequestCallback;
import ai.alphacompute.ipc.IAlphaStreamCallback;
import ai.alphacompute.ipc.PfdStreams;
import ai.eliza.os.agent.AgentChannel;
import ai.eliza.os.agent.AgentService;
import ai.eliza.os.agent.ChannelPolicy.FailCode;
import ai.eliza.os.agent.ChannelPolicy.Outcome;
import ai.eliza.os.agent.ChannelPolicy.OutcomeKind;
import ai.eliza.os.agent.ChannelPolicy.Topic;
import android.app.Service;
import android.content.Intent;
import android.os.Binder;
import android.os.IBinder;
import android.os.ParcelFileDescriptor;
import android.os.RemoteException;
import java.io.IOException;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;
import org.json.JSONException;
import org.json.JSONObject;

/** Signature-protected Binder broker forwarding suite requests, streams, and feeds into {@link AgentService#channel()}. */
public final class AlphaAgentBrokerService extends Service {
    private static final String ARCHIVE_RECOVERY_PREFIX = "archiveRecovery:";

    private final AlphaSuitePolicy policy = AlphaSuitePolicy.defaults();
    private final Map<String, AutoCloseable> statusObservers = new ConcurrentHashMap<>();
    private final Map<String, String> activeCallOwners = new ConcurrentHashMap<>();
    private final Map<String, String> activeSubOwners = new ConcurrentHashMap<>();
    private final ExecutorService ioWorkers = Executors.newCachedThreadPool(task -> {
        Thread thread = new Thread(task, "AlphaAgentBrokerIo");
        thread.setDaemon(true);
        return thread;
    });

    private final IAlphaAgentBroker.Stub binder = new IAlphaAgentBroker.Stub() {
        @Override public String getStatusJson() {
            requireAuthorizedPackage();
            return AgentService.status(AlphaAgentBrokerService.this).toString();
        }

        @Override public String lifecycleCommand(String command) {
            String callingPkg = requireAuthorizedPackage();
            if (!policy.isLifecycleCommandAllowed(callingPkg)) {
                throw new SecurityException("Lifecycle command not permitted for " + callingPkg);
            }
            if (command == null || command.isEmpty()) {
                throw new IllegalArgumentException("Lifecycle command is required");
            }
            if (command.startsWith(ARCHIVE_RECOVERY_PREFIX)) {
                String token = command.substring(ARCHIVE_RECOVERY_PREFIX.length());
                int archived = AgentService.archiveRecovery(AlphaAgentBrokerService.this, token);
                return recoveryArchiveJson(archived);
            }
            return switch (command) {
                case "start" -> {
                    AgentService.start(AlphaAgentBrokerService.this);
                    yield AgentService.status(AlphaAgentBrokerService.this).toString();
                }
                case "stop" -> {
                    AgentService.stop(AlphaAgentBrokerService.this);
                    yield AgentService.status(AlphaAgentBrokerService.this).toString();
                }
                case "restart" -> {
                    AgentService.restart(AlphaAgentBrokerService.this);
                    yield AgentService.status(AlphaAgentBrokerService.this).toString();
                }
                case "reviewRecovery" -> recoveryReviewJson(AgentService.reviewRecovery(AlphaAgentBrokerService.this));
                default -> throw new IllegalArgumentException("Unsupported lifecycle command: " + command);
            };
        }

        @Override public void request(
            String callId,
            String method,
            String path,
            byte[] inlineBody,
            ParcelFileDescriptor bodyFd,
            String headersJson,
            IAlphaRequestCallback cb
        ) {
            if (cb == null) {
                closeQuietly(bodyFd);
                return;
            }
            String callingPkg = verifyPackageOrNull();
            if (callingPkg == null) {
                closeQuietly(bodyFd);
                notifyRequestError(cb, callId, AlphaIpcContract.FAIL_UNAUTHORIZED, "Caller signature rejected");
                return;
            }
            if (!policy.isAgentRouteAllowed(callingPkg, path)) {
                closeQuietly(bodyFd);
                notifyRequestError(cb, callId, AlphaIpcContract.FAIL_ROUTE_REFUSED, "Route not permitted for " + callingPkg);
                return;
            }
            String owner = ownerKey(callingPkg, Binder.getCallingPid());
            ioWorkers.execute(() -> executeRequest(owner, callId, method, path, inlineBody, bodyFd, headersJson, cb));
        }

        @Override public void requestStream(
            String callId,
            String method,
            String path,
            byte[] inlineBody,
            ParcelFileDescriptor bodyFd,
            String headersJson,
            IAlphaStreamCallback cb
        ) {
            if (cb == null) {
                closeQuietly(bodyFd);
                return;
            }
            String callingPkg = verifyPackageOrNull();
            if (callingPkg == null) {
                closeQuietly(bodyFd);
                notifyStreamEnd(cb, callId, "failed", AlphaIpcContract.FAIL_UNAUTHORIZED);
                return;
            }
            if (!policy.isAgentRouteAllowed(callingPkg, path)) {
                closeQuietly(bodyFd);
                notifyStreamEnd(cb, callId, "failed", AlphaIpcContract.FAIL_ROUTE_REFUSED);
                return;
            }
            String owner = ownerKey(callingPkg, Binder.getCallingPid());
            ioWorkers.execute(() -> executeStream(owner, callId, method, path, inlineBody, bodyFd, headersJson, cb));
        }

        @Override public boolean abort(String callId) {
            String callingPkg = requireAuthorizedPackage();
            if (callId == null || callId.isEmpty()) return false;
            String owner = ownerKey(callingPkg, Binder.getCallingPid());
            String trackedOwner = activeCallOwners.get(callId);
            if (trackedOwner != null && !trackedOwner.equals(owner)) return false;
            activeCallOwners.remove(callId);
            return AgentService.channel().abort(owner, callId);
        }

        @Override public void subscribeEvents(String subId, String topic, String clientId, IAlphaEventCallback cb) {
            if (cb == null) return;
            String callingPkg = verifyPackageOrNull();
            if (callingPkg == null) {
                notifyEventEnd(cb, subId, "failed", AlphaIpcContract.FAIL_UNAUTHORIZED);
                return;
            }
            if (subId == null || subId.isEmpty() || topic == null || topic.isEmpty()) {
                notifyEventEnd(cb, subId, "failed", AlphaIpcContract.FAIL_ROUTE_REFUSED);
                return;
            }
            String owner = ownerKey(callingPkg, Binder.getCallingPid());
            if ("status".equals(topic)) {
                subscribeStatus(owner, subId, cb);
                return;
            }
            Topic channelTopic = switch (topic) {
                case "view" -> Topic.VIEW;
                case "voice" -> Topic.VOICE;
                default -> null;
            };
            if (channelTopic == null) {
                notifyEventEnd(cb, subId, "failed", AlphaIpcContract.FAIL_ROUTE_REFUSED);
                return;
            }
            activeSubOwners.put(subId, owner);
            linkCallbackDeath(cb.asBinder(), () -> cleanupSubscription(owner, subId));
            String resolvedClientId = clientId == null || clientId.isEmpty() ? owner : clientId;
            FailCode refused = AgentService.channel().subscribe(owner, subId, channelTopic, resolvedClientId, new AgentChannel.Listener() {
                @Override public void head(String id, long index, int status, Map<String, String> headers) {}
                @Override public void chunk(String id, long index, byte[] data) {}

                @Override public void event(String id, long index, JSONObject event) {
                    try {
                        cb.onEvent(id, index, event == null ? "{}" : event.toString());
                    } catch (RemoteException dead) {
                        cleanupSubscription(owner, id);
                    }
                }

                @Override public void settled(String id, Outcome outcome, byte[] body) {
                    activeSubOwners.remove(id);
                    notifyEventEnd(cb, id, outcomeKindWire(outcome), failCodeWire(outcome));
                }
            });
            if (refused != null) {
                activeSubOwners.remove(subId);
                notifyEventEnd(cb, subId, "failed", failCodeName(refused));
            }
        }

        @Override public void unsubscribeEvents(String subId) {
            String callingPkg = requireAuthorizedPackage();
            if (subId == null || subId.isEmpty()) return;
            String owner = ownerKey(callingPkg, Binder.getCallingPid());
            cleanupSubscription(owner, subId);
        }
    };

    @Override public IBinder onBind(Intent intent) {
        return binder;
    }

    @Override public void onDestroy() {
        for (AutoCloseable handle : statusObservers.values()) {
            try {
                handle.close();
            } catch (Exception ignored) {
            }
        }
        statusObservers.clear();
        for (Map.Entry<String, String> entry : activeCallOwners.entrySet()) {
            AgentService.channel().abort(entry.getValue(), entry.getKey());
        }
        activeCallOwners.clear();
        for (Map.Entry<String, String> entry : activeSubOwners.entrySet()) {
            AgentService.channel().abort(entry.getValue(), entry.getKey());
        }
        activeSubOwners.clear();
        ioWorkers.shutdownNow();
        super.onDestroy();
    }

    private void executeRequest(
        String owner,
        String callId,
        String method,
        String path,
        byte[] inlineBody,
        ParcelFileDescriptor bodyFd,
        String headersJson,
        IAlphaRequestCallback cb
    ) {
        byte[] body;
        try {
            body = PfdStreams.unpack(inlineBody, bodyFd, AlphaIpcContract.MAX_PFD_BODY_BYTES);
        } catch (IOException failed) {
            String code = failed instanceof PfdStreams.PayloadTooLargeException
                ? AlphaIpcContract.FAIL_TOO_LARGE
                : AlphaIpcContract.FAIL_BROKEN;
            notifyRequestError(cb, callId, code, failed.getMessage());
            return;
        }
        activeCallOwners.put(callId, owner);
        linkCallbackDeath(cb.asBinder(), () -> {
            activeCallOwners.remove(callId);
            AgentService.channel().abort(owner, callId);
        });
        FailCode refused = AgentService.channel().ask(owner, callId, method, path, false, body, parseHeaders(headersJson), new AgentChannel.Listener() {
            @Override public void head(String id, long index, int status, Map<String, String> headers) {}
            @Override public void chunk(String id, long index, byte[] data) {}
            @Override public void event(String id, long index, JSONObject event) {}

            @Override public void settled(String id, Outcome outcome, byte[] replyBody) {
                activeCallOwners.remove(id);
                if (outcome.kind() != OutcomeKind.RESPONSE) {
                    notifyRequestError(cb, id, failCodeWire(outcome), outcome.kind().name());
                    return;
                }
                ioWorkers.execute(() -> {
                    try (PfdStreams.Payload packed = PfdStreams.pack(replyBody, AlphaIpcContract.MAX_PFD_BODY_BYTES)) {
                        cb.onResponse(id, (int) outcome.status(), packed.inlineBody(), packed.bodyFd());
                    } catch (IOException | RemoteException failed) {
                        String code = failed instanceof PfdStreams.PayloadTooLargeException
                            ? AlphaIpcContract.FAIL_TOO_LARGE
                            : AlphaIpcContract.FAIL_BROKEN;
                        notifyRequestError(cb, id, code, failed.getMessage());
                    }
                });
            }
        });
        if (refused != null) {
            activeCallOwners.remove(callId);
            notifyRequestError(cb, callId, failCodeName(refused), refused.name());
        }
    }

    private void executeStream(
        String owner,
        String callId,
        String method,
        String path,
        byte[] inlineBody,
        ParcelFileDescriptor bodyFd,
        String headersJson,
        IAlphaStreamCallback cb
    ) {
        byte[] body;
        try {
            body = PfdStreams.unpack(inlineBody, bodyFd, AlphaIpcContract.MAX_PFD_BODY_BYTES);
        } catch (IOException failed) {
            String code = failed instanceof PfdStreams.PayloadTooLargeException
                ? AlphaIpcContract.FAIL_TOO_LARGE
                : AlphaIpcContract.FAIL_BROKEN;
            notifyStreamEnd(cb, callId, "failed", code);
            return;
        }
        activeCallOwners.put(callId, owner);
        linkCallbackDeath(cb.asBinder(), () -> {
            activeCallOwners.remove(callId);
            AgentService.channel().abort(owner, callId);
        });
        FailCode refused = AgentService.channel().ask(owner, callId, method, path, true, body, parseHeaders(headersJson), new AgentChannel.Listener() {
            @Override public void head(String id, long index, int status, Map<String, String> headers) {
                try {
                    cb.onHead(id, index, status, encodeHeaders(headers));
                } catch (RemoteException dead) {
                    activeCallOwners.remove(id);
                    AgentService.channel().abort(owner, id);
                }
            }

            @Override public void chunk(String id, long index, byte[] data) {
                List<byte[]> slices = PfdStreams.chunkBytes(data, AlphaIpcContract.MAX_STREAM_CHUNK_BYTES);
                for (byte[] slice : slices) {
                    try {
                        cb.onChunk(id, index, slice);
                    } catch (RemoteException dead) {
                        activeCallOwners.remove(id);
                        AgentService.channel().abort(owner, id);
                        return;
                    }
                }
            }

            @Override public void event(String id, long index, JSONObject event) {}

            @Override public void settled(String id, Outcome outcome, byte[] replyBody) {
                activeCallOwners.remove(id);
                notifyStreamEnd(cb, id, outcomeKindWire(outcome), failCodeWire(outcome));
            }
        });
        if (refused != null) {
            activeCallOwners.remove(callId);
            notifyStreamEnd(cb, callId, "failed", failCodeName(refused));
        }
    }

    private void subscribeStatus(String owner, String subId, IAlphaEventCallback cb) {
        AtomicLong seq = new AtomicLong(0);
        Runnable push = () -> {
            try {
                cb.onEvent(subId, seq.incrementAndGet(), AgentService.status(this).toString());
            } catch (RemoteException dead) {
                cleanupSubscription(owner, subId);
            }
        };
        AutoCloseable observer = AgentService.observe(push);
        AutoCloseable previous = statusObservers.put(subId, observer);
        if (previous != null) {
            try {
                previous.close();
            } catch (Exception ignored) {
            }
        }
        activeSubOwners.put(subId, owner);
        linkCallbackDeath(cb.asBinder(), () -> cleanupSubscription(owner, subId));
        push.run();
    }

    private void cleanupSubscription(String owner, String subId) {
        String trackedOwner = activeSubOwners.get(subId);
        if (trackedOwner != null && !trackedOwner.equals(owner)) return;
        activeSubOwners.remove(subId);
        AutoCloseable observer = statusObservers.remove(subId);
        if (observer != null) {
            try {
                observer.close();
            } catch (Exception ignored) {
            }
            return;
        }
        AgentService.channel().abort(owner, subId);
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

    private static String ownerKey(String packageName, int callingPid) {
        return "ipc-" + packageName + "-" + callingPid;
    }

    private static void linkCallbackDeath(IBinder target, Runnable onDied) {
        if (target == null) return;
        try {
            target.linkToDeath(onDied::run, 0);
        } catch (RemoteException alreadyDead) {
            onDied.run();
        }
    }

    private static Map<String, Object> parseHeaders(String headersJson) {
        Map<String, Object> headers = new LinkedHashMap<>();
        if (headersJson == null || headersJson.isBlank()) return headers;
        try {
            JSONObject obj = new JSONObject(headersJson);
            for (Iterator<String> keys = obj.keys(); keys.hasNext(); ) {
                String key = keys.next();
                headers.put(key, obj.opt(key));
            }
        } catch (JSONException ignored) {
        }
        return headers;
    }

    private static String encodeHeaders(Map<String, String> headers) {
        JSONObject obj = new JSONObject();
        if (headers != null) {
            for (Map.Entry<String, String> entry : headers.entrySet()) {
                try {
                    obj.put(entry.getKey(), entry.getValue());
                } catch (JSONException ignored) {
                }
            }
        }
        return obj.toString();
    }

    private static String recoveryReviewJson(AgentService.Review review) {
        JSONObject out = new JSONObject();
        try {
            if (review == null) {
                out.put("kind", "unavailable");
            } else {
                out.put("kind", "reviewable")
                    .put("reviewToken", review.token())
                    .put("retainedCount", review.retainedCount());
            }
        } catch (JSONException impossible) {
            throw new IllegalStateException(impossible);
        }
        return out.toString();
    }

    private static String recoveryArchiveJson(int archived) {
        JSONObject out = new JSONObject();
        try {
            if (archived < 0) {
                out.put("kind", "unavailable");
            } else {
                out.put("kind", "archived").put("archivedCount", archived);
            }
        } catch (JSONException impossible) {
            throw new IllegalStateException(impossible);
        }
        return out.toString();
    }

    private static String outcomeKindWire(Outcome outcome) {
        return switch (outcome.kind()) {
            case FAILED -> "failed";
            case ERROR -> "error";
            case ABORTED -> "aborted";
            case END, RESPONSE -> "end";
        };
    }

    private static String failCodeWire(Outcome outcome) {
        return outcome.kind() == OutcomeKind.FAILED && outcome.code() != null
            ? failCodeName(outcome.code())
            : "";
    }

    private static String failCodeName(FailCode code) {
        return switch (code) {
            case NOT_READY -> "NotReady";
            case ROUTE_REFUSED -> "RouteRefused";
            case TOO_LARGE -> "TooLarge";
            case ID_IN_USE -> "IdInUse";
            case TOPIC_IN_USE -> "TopicInUse";
            case BUSY -> "Busy";
            case RESTARTED -> "Restarted";
            case BROKEN -> "Broken";
        };
    }

    private static void notifyRequestError(IAlphaRequestCallback cb, String callId, String code, String message) {
        try {
            cb.onError(callId, code, message == null ? code : message);
        } catch (RemoteException ignored) {
        }
    }

    private static void notifyStreamEnd(IAlphaStreamCallback cb, String callId, String kind, String code) {
        try {
            cb.onEnd(callId, kind, code == null ? "" : code);
        } catch (RemoteException ignored) {
        }
    }

    private static void notifyEventEnd(IAlphaEventCallback cb, String subId, String kind, String code) {
        try {
            cb.onEnd(subId, kind, code == null ? "" : code);
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
