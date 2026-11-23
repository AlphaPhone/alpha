/** Product storage contracts qualified across Chromium, Firefox and WebKit. */
export const STORAGE_SPECS = Object.freeze([
  "test/browser/assistant-draft-storage.spec.ts",
  "test/browser/password-provider-storage.spec.ts",
  "test/browser/photo-albums.spec.ts",
  "test/browser/calendar-form-draft.spec.ts",
  "test/browser/calendar-modal-draft.spec.ts",
  "test/browser/inbox-unsaved-recovery.spec.ts",
  "test/browser/calendar-edit-draft.spec.ts",
  "test/browser/calendar-recovery.spec.ts",
  "test/browser/storage-usage.spec.ts",
  "test/browser/domain-atomicity.spec.ts",
  "test/browser/location-settings-recovery.spec.ts",
  "test/browser/connection-preference-storage.spec.ts",
  "test/browser/appearance-storage.spec.ts",
  "test/browser/workflow-intent-storage.spec.ts",
  "test/browser/notes-audio-journey.spec.ts",
  "test/browser/media-copy-intent-storage.spec.ts",
  "test/browser/conversation-selection-storage.spec.ts",
  "test/browser/browser-photo-edit.spec.ts",
  "test/browser/reminder-action-storage.spec.ts",
  "test/browser/reminder-delete-review.spec.ts",
  "test/browser/reminder-decision-review.spec.ts",
  "test/browser/browser-reminder-edit-recovery.spec.ts",
  "test/browser/reminder-creation-storage.spec.ts",
  "test/browser/reminder-create-review.spec.ts",
]);
export const storageSpecPattern = new RegExp(`(?:^|[\\\\/])(${STORAGE_SPECS.map(file =>
  file.slice("test/browser/".length, -".spec.ts".length)).join("|")})\\.spec\\.ts$`);
