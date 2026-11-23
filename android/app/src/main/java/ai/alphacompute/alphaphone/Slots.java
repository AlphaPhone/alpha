package ai.alphacompute.alphaphone;

/**
 * Secure-slot names that more than one class reads, writes, caps or admits. They are installed
 * identity: each value is the exact name already in users' encrypted slot files, and the renderer
 * writes several of the same names.
 */
final class Slots {
 private Slots(){}

 /** Cloud sign-in credentials, one slot per environment. */
 static final String CLOUD_PREFIX="cloud:";
 static final String CLOUD_PRODUCTION=CLOUD_PREFIX+"production";
 static final String CLOUD_STAGING=CLOUD_PREFIX+"staging";
 /** The selected local-agent provider. */
 static final String LOCAL_AGENT_PROVIDER="local-agent-provider:v1";

 static final String GMAIL_BACKGROUND="gmail-background:v1";
 static final String NATIVE_CALENDAR_SYNC="native-calendar-sync:v1";
 static final String NATIVE_DELETE_JOURNAL="native-delete-journal:v1";
 static final String SMS_SEND_LEDGER="sms-send-ledger:v1:device";
 static final String HOSTED_DIGESTS_PREFIX="hosted-digests:v1:";

 static final String NOTES_RECORDS="notes-records:v1:device";
 static final String NOTES_TRASH="notes-trash:v1:device";
 static final String NOTES_DRAFT="notes-draft:v1:device";
 static final String NOTE_ORIGINS="note-origins:v1:device";
 static final String NOTES_FOLDERS="notes-folders:v1:device";
 static final String NOTES_AUDIO_DELETIONS="notes-audio-deletions:v1:device";
 /** Per-recording metadata; the suffix is the note id. */
 static final String NOTE_AUDIO_METADATA_PREFIX="note-audio-metadata:v1:";

 static final String INBOX_DRAFTS_PREFIX="inbox-drafts:v1:";
 /** Full-match patterns of renderer slots keyed by a SHA-256 hex digest. */
 static final String INBOX_OPERATION_PATTERN="inbox-operation:v1:"+AlphaUtil.SHA256_HEX;
 static final String CALENDAR_LINKED_SYNC_PATTERN="calendar-linked-sync:v1:"+AlphaUtil.SHA256_HEX;
 static final String CONNECTED_READ_CACHE_PATTERN="connected-read-cache:v1:"+AlphaUtil.SHA256_HEX;
}
