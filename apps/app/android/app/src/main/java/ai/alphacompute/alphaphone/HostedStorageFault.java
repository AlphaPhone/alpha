package ai.alphacompute.alphaphone;

final class HostedStorageFault extends Exception {
 HostedStorageFault(Throwable cause) { super("Encrypted result storage unavailable", cause); }
}
