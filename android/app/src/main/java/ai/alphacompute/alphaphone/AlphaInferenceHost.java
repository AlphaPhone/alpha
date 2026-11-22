package ai.alphacompute.alphaphone;

import android.content.Context;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;

/**
 * Starts the upstream os InferenceHost (ai.eliza.voice.InferenceHost, :eliza-local-inference) for the resident agent
 * and names its socket in the launch environment; the resident binds @elizaos/os/inference androidInferenceLayer(socket).
 */
final class AlphaInferenceHost {
 static final String SOCKET_ENV = "ELIZA_INFERENCE_SOCKET";
 static final String EMBEDDING_ASSET = "agent/models/bge-small-en-v1.5-f16.gguf";
 static final String EMBEDDING_SHA256 = "f0b2fef971e8366438bfd2d9aefea1b0115919389448806d290237f638bae999";
 private static final Object LOCK = new Object();
 private static String started;

 private AlphaInferenceHost() {}

 /** The abstract socket of this package's inference host. */
 static String socketName(Context context) { return context.getPackageName() + ".inference.v1"; }

 /** Local inference's model storage under the agent state directory. */
 static File modelStorage(File agentRoot) { return new File(agentRoot, "state/local-inference/models"); }

 /** Install the BGE embedding model, start the host once and name its socket in the agent's environment. */
 static void configure(Context context, java.util.Map<String, String> env) throws IOException {
  String root = env.get("AGENT_ROOT");
  if (root == null) throw new IOException("Agent resource directory unavailable");
  File models = modelStorage(new File(root));
  installEmbeddingModel(context, models);
  String socket = socketName(context);
  synchronized (LOCK) {
   if (!socket.equals(started)) {
    ai.eliza.voice.VoiceAssets.Bundle bundle = ai.eliza.voice.VoiceAssets.install(context);
    ai.eliza.voice.InferenceHost.start(context, socket, bundle, models);
    started = socket;
   }
  }
  env.put(SOCKET_ENV, socket);
 }

 /** Copy the packaged BGE asset into model storage, verified by its SHA-256; an intact copy is kept. */
 static File installEmbeddingModel(Context context, File models) throws IOException {
  if (!models.isDirectory() && !models.mkdirs()) throw new IOException("Model storage unavailable");
  File target = new File(models, "bge-small-en-v1.5-f16.gguf");
  if (target.isFile() && EMBEDDING_SHA256.equals(sha256(target))) return target;
  File staged = new File(models, ".bge-small-en-v1.5-f16.gguf.part");
  MessageDigest digest = digest();
  try (InputStream in = context.getAssets().open(EMBEDDING_ASSET); FileOutputStream out = new FileOutputStream(staged)) {
   byte[] buffer = new byte[1 << 16];
   for (int read; (read = in.read(buffer)) > 0;) { digest.update(buffer, 0, read); out.write(buffer, 0, read); }
   out.getFD().sync();
  }
  if (!EMBEDDING_SHA256.equals(hex(digest.digest()))) { staged.delete(); throw new IOException("Packaged embedding model differs from its pin"); }
  if (!staged.renameTo(target)) { staged.delete(); throw new IOException("Embedding model could not be installed"); }
  return target;
 }

 private static MessageDigest digest() throws IOException {
  try { return MessageDigest.getInstance("SHA-256"); } catch (java.security.NoSuchAlgorithmException missing) { throw new IOException(missing); }
 }

 private static String sha256(File file) throws IOException {
  MessageDigest digest = digest();
  try (InputStream in = new java.io.FileInputStream(file)) {
   byte[] buffer = new byte[1 << 16];
   for (int read; (read = in.read(buffer)) > 0;) digest.update(buffer, 0, read);
  }
  return hex(digest.digest());
 }

 private static String hex(byte[] bytes) {
  StringBuilder out = new StringBuilder(bytes.length * 2);
  for (byte b : bytes) out.append(Character.forDigit((b >> 4) & 15, 16)).append(Character.forDigit(b & 15, 16));
  return out.toString();
 }
}
