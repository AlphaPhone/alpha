/**
 * Voice assistant turn controller. The implementation is the shared upstream
 * `@elizaos/voice/assistant-session` controller (endpointing, generations, barge-in and
 * heard-content accounting), authenticated and projected from the reviewed pin. Alpha adds no
 * behavior of its own.
 */
export {
  ASSISTANT_TIMING_DEFAULTS,
  splitSpokenSentences,
  VoiceAssistantSession,
  type AssistantState,
  type AssistantTextFrame,
} from '../../../../.eliza/client-features/packages/voice/src/voice-assistant-session.ts';
