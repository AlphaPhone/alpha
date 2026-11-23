# Voice

Alpha's voice: two separate modes and the speech beneath them. Dictation records into an editable
draft that the owner sends; a voice conversation listens, submits each finished turn by itself,
speaks the reply and can be interrupted. On-device recognition (Phonon-2) and synthesis (Paradee)
ship in every build; Eliza Cloud speech is the default when the owner is signed in to Cloud or has
installed a Cartesia key, and on-device speech is used otherwise and whenever network speech fails
(PRD AP-06, P-60). Clef decides the end of a turn in Cloud, and a long pause always ends it. On the
Alpha AOSP image the always-on listener and hardware invocation start voice (P-61); elsewhere Alpha
only makes sure a listener left on is stopped.

The turn mechanics of a conversation (endpointing, echo rejection, barge-in, the heard report) are
`VoiceSession` of `@elizaos/agent/voice`; the native listener, its indicator lease, the microphone
slot and the speech output path are the os package's. These specs state what Alpha decides around
them.

- [Speech route](./route.md): the key each account gives the local inference package's route, plan
  limits, and what each route sends.
- [Dictation](./dictation.md): recording into another area's draft, transcription and insertion.
- [Conversation](./conversation.md): starting, disclosure, interruption, review, retries, calls,
  retirement, a screen the agent opens, and the one Cloud speech relay session a streamed
  conversation listens and speaks on.
- [Acknowledgement](./acknowledgement.md): the one short line a voice turn may say while its reply
  is prepared, held 300 ms and bounded at 2.5 s by the assistant's spoken cue, and never spoken over
  the reply.
- [Speech output](./speech.md): cleanup of each speaking channel, warm-up, what may be spoken, and
  what is spoken or transcribed only on the phone (page readings, voicemail).
- [Microphone](./capture.md): one owner of the renderer's capture, permission and calls.
- [Voice activity](./vad.md): the energy gate that segments a browser or batch capture, and the
  native segment gate.
- [Always-on listener](./listener.md): the AOSP listener's status, stop and invocation.
- [Latency](./latency.md): a turn's marks from the last input to the first audible reply.
- [Keyboard dictation](./keyboard.md): Alpha's voice input method in other apps' fields.
