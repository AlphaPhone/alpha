package ai.alphacompute.alphaphone;

/** A dictation result belongs to one editor and one explicit capture, never the next field. */
final class KeyboardDictationPolicy {
 enum State { READY, RECORDING, TRANSCRIBING, CLOSED }
 private long generation;
 private String recordingId;
 private State state = State.CLOSED;
 long open() { recordingId = null; state = State.READY; return ++generation; }
 boolean bindRecording(long ticket, String id) {
  if (!is(ticket, State.RECORDING) || id == null || id.isEmpty()) return false;
  recordingId = id; return true;
 }
 boolean ownsRecording(String id) { return state == State.RECORDING && recordingId != null && recordingId.equals(id); }
 long start() {
  if (state != State.READY) throw new IllegalStateException("Dictation is busy");
  recordingId = null; state = State.RECORDING; return ++generation;
 }
 boolean stop(long ticket) {
  if (!is(ticket, State.RECORDING)) return false;
  state = State.TRANSCRIBING; return true;
 }
 boolean finish(long ticket, boolean sameField, boolean sameAuthority) {
  if (!is(ticket, State.TRANSCRIBING) || !sameField || !sameAuthority) return false;
  close(); return true;
 }
 boolean is(long ticket, State expected) { return ticket == generation && state == expected; }
 void close() { recordingId = null; ++generation; state = State.CLOSED; }
 State state() { return state; }
 static boolean usesDirect(String provider, boolean unbound) {
  if (unbound || !("cerebras".equals(provider) || "elizacloud".equals(provider))) throw new IllegalStateException("Choose a voice provider in Alpha");
  return "cerebras".equals(provider);
 }
 // android.text.InputType and EditorInfo values, kept as literals so the policy stays Android-free.
 private static final int TYPE_MASK_CLASS = 0xf, TYPE_MASK_VARIATION = 0xff0, TYPE_CLASS_TEXT = 1, TYPE_CLASS_NUMBER = 2;
 private static final int TYPE_TEXT_VARIATION_PASSWORD = 0x80, TYPE_TEXT_VARIATION_VISIBLE_PASSWORD = 0x90, TYPE_TEXT_VARIATION_WEB_PASSWORD = 0xe0;
 private static final int TYPE_NUMBER_VARIATION_PASSWORD = 0x10, IME_FLAG_NO_PERSONALIZED_LEARNING = 0x1000000;
 static boolean permitted(int inputType, int imeOptions) {
  int kind = inputType & TYPE_MASK_CLASS, variation = inputType & TYPE_MASK_VARIATION;
  return inputType != 0 && (imeOptions & IME_FLAG_NO_PERSONALIZED_LEARNING) == 0
    && !(kind == TYPE_CLASS_TEXT && (variation == TYPE_TEXT_VARIATION_PASSWORD || variation == TYPE_TEXT_VARIATION_VISIBLE_PASSWORD || variation == TYPE_TEXT_VARIATION_WEB_PASSWORD))
    && !(kind == TYPE_CLASS_NUMBER && variation == TYPE_NUMBER_VARIATION_PASSWORD);
 }
}
