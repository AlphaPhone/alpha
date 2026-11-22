// spec/platform/index.md, "A capability is offered only on a variant whose build registers its plugin"; spec/platform/index.md, "A plugin method is called only when the native bridge lists it"

/** Where a plugin is offered: on both native variants, or only on the Alpha AOSP image. */
export type NativeReach = "AnyNative" | "AospImage";

/** One Capacitor plugin the renderer calls: where it is offered, its methods and the events it posts. */
export interface NativePluginEntry {
  readonly reach: NativeReach;
  readonly methods: readonly string[];
  readonly events: readonly string[];
}

const speechBridge = [
  "cancel", "startRecording", "requestPermissions", "getRecordingMetrics", "stopRecording", "cancelRecording",
  "releaseLocalSpeech", "holdSpeechEngine", "releaseSpeechEngineHold", "warmSpeechOutput", "localSpeechStatus",
  "transcribeLocalRecording", "synthesizeLocal", "setSpeechOutputMuted", "play", "stopPlayback", "nativeVoiceTiming",
  "markVoiceTurn", "clearNativeVoiceTiming", "liveCaptureStatus", "startLiveCapture", "stopLiveCapture",
] as const;

const sense = [
  "status", "pause", "turnOff", "openSettings", "bindInvocationSession", "discardProtectedPowerInvocation",
  "claimProtectedPowerLaunch", "discardProtectedPowerLaunch", "takeInvocation",
] as const;

/** Every Capacitor plugin and method the renderer uses, as `MainActivity` registers them. */
export const nativePlugins = {
  Agent: {
    reach: "AnyNative",
    methods: [
      "launchSurface", "takeInvocation", "residentAttachment", "setGoogleAgentAccess", "configureProvider",
      "prepareProviderConfiguration", "cancelProviderConfiguration", "clearProvider", "clearProviderIfCurrent",
      "configureCloudProvider", "providerStatus", "selectProvider", "editProviderKeys", "removeProviderKey",
      "revealProviderKey",
    ],
    events: [],
  },
  ElizaAgent: {
    reach: "AnyNative",
    methods: [
      "getStatus", "start", "stop", "restart", "request", "requestStream", "abort", "subscribeEvents",
      "unsubscribeEvents", "reviewRecovery", "archiveRecovery",
    ],
    events: ["status", "streamData", "streamEnd", "agentEvent"],
  },
  ElizaCloud: { reach: "AnyNative", methods: ["request", "readGrant", "cancel", "openExternal"], events: [] },
  ElizaNetworkPolicy: { reach: "AnyNative", methods: ["getMeteredHint", "getPathHints"], events: [] },
  ElizaSecureStore: { reach: "AnyNative", methods: ["get", "set", "remove", "compareAndExchange", "status"], events: [] },
  AlphaActionJournal: {
    reach: "AnyNative",
    methods: ["recoverNotification", "recoverDeletion", "recoverReminder", "reviewClock", "cancelClock", "confirmClock"],
    events: [],
  },
  AlphaBillingAuthority: { reach: "AnyNative", methods: ["status", "clear", "start", "verify", "perform"], events: [] },
  AlphaBrowser: {
    reach: "AnyNative",
    methods: [
      "create", "find", "findNext", "clearFind", "navigate", "command", "present", "bookmarks", "setBookmark",
      "browsingState", "saveBrowsingState", "clearBrowsingData", "clearSiteData", "readingSupport", "reviewQuestion",
      "reviewReading", "cancelReading", "share", "openExternalBrowser", "downloads", "loginFillStatus", "close",
    ],
    events: ["findResult", "fullscreen", "notice", "showDownloads", "stateChanged", "tabClosed", "tabOpened"],
  },
  AlphaCalendar: {
    reach: "AnyNative",
    methods: [
      "sync", "inspectDeletion", "removeScoped", "executeAgent", "cancelAgent", "requestPermissions", "requestAccess",
      "requestWorkflowReadAccess", "pendingCreations", "readOptions", "availabilitySources", "readAvailability",
      "insertHandoff",
    ],
    events: ["calendarSyncChanged"],
  },
  AlphaCallState: { reach: "AnyNative", methods: ["callState"], events: ["callState"] },
  AlphaCloudSignIn: {
    reach: "AnyNative",
    methods: [
      "credentialIdentity", "serviceInfo", "status", "startGoogle", "startEmail", "startPhone", "verifyPhone",
      "verifyEmail", "verifyMfa", "resumeMfa", "clearCredentialState", "cancel", "renewSignIn",
    ],
    events: ["signInCompleted", "signInIncomplete", "signInMfaRequired", "signInReadinessChanged", "signInRenewed"],
  },
  AlphaCloudSpeechStream: {
    reach: "AnyNative",
    methods: [
      "load", "requestPermissions", "startCloudSpeech", "stopCloudSpeech", "setCloudSpeechOutputMuted",
      "setCloudSpeechMuted", "speakCloudSpeech", "cancelCloudSpeech",
    ],
    events: ["cloudSpeechEvent", "error"],
  },
  AlphaConnection: {
    reach: "AnyNative",
    methods: [
      "readDelegationCallback", "clearDelegationCallback", "prepareGoogleWorkspaceReturn", "consumeGoogleWorkspaceReturn",
      "cancelGoogleWorkspaceReturn", "pauseNotificationCollection",
    ],
    events: ["cloudDelegationCallback", "googleWorkspaceReturn"],
  },
  AlphaContacts: {
    reach: "AospImage",
    methods: ["status", "requestPermissions", "list", "create", "edit", "get", "save", "remove"],
    events: [],
  },
  AlphaDeletions: { reach: "AnyNative", methods: ["pending", "dismiss", "undo", "reviewReminder", "reviewAgentReminder"], events: [] },
  AlphaDevice: {
    reach: "AnyNative",
    methods: [
      "shareText", "copyText", "setTextScale", "recommendedTimeout", "snapshot", "openPasswordProvider",
      "openNotificationShade", "openSettings", "diagnosticsFacts",
      "shareDiagnostics", "openUpdatePermissionSettings", "activateUpdate", "updateState", "reconcileUpdate",
      "continueUpdate", "checkForUpdate", "installUpdate", "setVolumeShutter", "setSystemBarAppearance", "haptic",
    ],
    events: ["alphaUpdateReady", "alphaUpdateSettled"],
  },
  AlphaFiles: {
    reach: "AnyNative",
    methods: [
      "requestPermissions", "load", "storageState", "storageRequestAccess", "storageList", "storageCategory",
      "storageQuery", "storageReviewedIdentities", "storageReadAttachment", "storageTransfer", "storageRename",
      "storageCreateFolder", "storageTrash", "storageTrashList", "storageRestore", "storageEmptyTrash", "storageShare",
      "storageSelect", "storageOpen", "storageWatch", "storageUnwatch",
    ],
    events: ["storageChanged"],
  },
  AlphaGmail: {
    reach: "AnyNative",
    methods: ["configure", "withdraw", "status", "pending", "consume", "releaseQuestion", "notificationSettings"],
    events: ["pendingMail"],
  },
  AlphaHostedResults: {
    reach: "AnyNative",
    methods: [
      "nativeSourceIdentity", "nativeSourceConsent", "beginBackground", "cancelBackground", "configureBackground",
      "disableBackground", "syncInbox", "setBackgroundPolling", "inboxHistory", "scheduleSourceRenewal",
      "clearSourceRenewal", "postWorkflowApprovalNotice", "withdrawWorkflowApprovalNotice",
      "withdrawOtherOwnerApprovalNotices", "resumeWorkflowApprovalNotice", "pendingSourceRenewal", "settleSourceRenewal",
      "setResultsShowing", "withdrawResult", "publishResult", "pendingResult", "consumeResult", "releaseResultQuestion",
      "status", "enable", "requestPermissions",
    ],
    events: ["pendingResult", "renewSource"],
  },
  AlphaListener: { reach: "AospImage", methods: sense, events: [] },
  AlphaMailAttachments: {
    reach: "AnyNative",
    methods: [
      "readSelected", "readPhotoSelected", "cancelPhotoSelected", "cancel", "openReviewed", "retainSourceReference",
      "openSourceReference", "releaseSourceReferences", "saveReviewed",
    ],
    events: [],
  },
  AlphaMapsTransport: {
    reach: "AnyNative",
    methods: [
      "consumeNavigationOpen", "clearNavigationOpen", "navigationAvailability", "startNavigation", "updateNavigation",
      "navigationArrived", "stopNavigation",
    ],
    events: ["navigationStopped"],
  },
  AlphaNoteAudio: {
    reach: "AnyNative",
    methods: ["migrationStatus", "describe", "play", "stop", "state", "remove", "restore", "purge", "deletionStatus"],
    events: ["started", "ended", "failed"],
  },
  AlphaNoteDocuments: { reach: "AnyNative", methods: ["importText", "exportText", "exportPdf"], events: [] },
  AlphaNotifications: { reach: "AnyNative", methods: ["canonicalPending", "acknowledgeCanonical"], events: ["canonicalNotificationTap"] },
  AlphaOngoingCall: { reach: "AospImage", methods: ["ongoingCall", "showCall", "endCall"], events: ["ongoingCall"] },
  AlphaPhotoLibrary: {
    reach: "AnyNative",
    methods: ["scope", "requestAccess", "requestPermissions", "watch", "page", "inspect", "validate", "changes", "requestChange", "share"],
    events: ["libraryChanged", "scopeChanged"],
  },
  AlphaPhotos: {
    reach: "AnyNative",
    methods: [
      "beginEdit", "previewEdit", "saveEdit", "editResult", "cancelEdit", "beginVideoEdit", "saveVideoEdit",
      "cancelVideoEdit", "list", "thumbnails", "read", "keepCapture", "share", "shareMany", "setTrashed", "setFavorite",
      "deletePermittedTrash", "changeMany", "summary", "prepareDeleteTrash", "cancelDeleteTrash", "deletePreparedTrash",
      "albums", "changeAlbum",
    ],
    events: [],
  },
  AlphaReset: { reach: "AnyNative", methods: ["review"], events: [] },
  AlphaTelephony: {
    reach: "AospImage",
    methods: [
      "requestPermissions", "checkPermissions", "imageCapability", "status", "phoneInfo", "requestAccess", "requestRole",
      "listRecentCalls", "dial", "placeCall", "composeSms", "listThreads", "listMessages", "latestIncomingSender",
      "markThreadRead", "deleteMessage", "observeMessages", "voicemailStatus", "listVoicemail", "fetchVoicemailAudio",
      "voicemailAudio", "voicemailPcm", "markVoicemailHeard", "deleteVoicemail", "observeVoicemail", "sendSms",
      "cancelSmsReview", "smsSendHistory", "smsSendResult", "sendMms", "mmsSendResult", "smsNoticePending",
      "acknowledgeSmsNotice", "contactForNumber", "searchContacts",
    ],
    events: ["messagesChanged", "voicemailChanged"],
  },
  AlphaVoiceCloud: {
    reach: "AnyNative",
    methods: [
      ...speechBridge,
      "transcribeLocalAudio", "cloudVoiceTiming", "workflowPresentationCapabilities", "saveRecording",
      "startNoteRecording", "consumeNoteRecordingOpen", "clearNoteRecordingOpen", "noteRecordingStatus",
      "pauseNoteRecording", "resumeNoteRecording", "stopNoteRecording", "discardNoteRecording", "setNoteSegmentText",
      "claimCanonicalNoteSave", "saveNoteRecording", "transcribeRecording", "synthesize", "transcribeOwnRecording",
      "synthesizeOwn", "pairedVoiceStatus", "pairedTranscriptionStatus", "transcribePairedRecording", "synthesizePaired",
      "synthesizeBrowserReading", "synthesizeLocalBrowserReading",
    ],
    events: [
      "noteRecordingChanged", "recordingState", "recordingStopped", "playbackEnded", "playbackFailed",
      "playbackSegmentStarted", "playbackStopped", "liveCaptureBargeIn", "liveCaptureEnded", "liveCaptureFrames",
      "liveCaptureTranscript", "error",
    ],
  },
  DailyApps: {
    reach: "AnyNative",
    methods: [
      "operateReminder", "cancelReminder", "load", "requestPermissions", "scheduleReminder", "surfaceInfo",
      "closeAssistant", "restoreSelected", "renameSelected", "pdfSelected", "describeSelected", "readSelected",
      "openSelected", "shareSelected", "forgetSelected", "clockHandoff", "capabilities", "perform",
    ],
    events: ["assistantInvoked", "restoredResult"],
  },
  DeviceApps: { reach: "AnyNative", methods: ["platformCapabilities", "openHomeChooser"], events: [] },
  ElizaCamera: {
    reach: "AnyNative",
    methods: [
      "getDevices", "startPreview", "setCaptureMode", "stopPreview", "switchCamera", "capturePhoto", "startRecording",
      "stopRecording", "getRecordingState", "getSettings", "setSettings", "setZoom", "setFocusPoint",
      "setExposurePoint", "checkCameraPermission", "requestCameraPermission", "checkPermissions", "requestPermissions",
    ],
    events: ["frame", "recordingState", "error"],
  },
  ElizaLocation: {
    reach: "AnyNative",
    methods: ["getCurrentPosition", "watchPosition", "clearWatch", "checkPermissions", "requestPermissions"],
    events: ["locationChange", "error"],
  },
  ElizaPasswords: {
    reach: "AnyNative",
    methods: ["status", "unlock", "lock", "list", "save", "openEditor", "remove", "reset", "reveal", "copy", "openAutofillSettings"],
    events: [],
  },
  ElizaPasswordTransfer: { reach: "AnyNative", methods: ["exportVault", "importVault"], events: [] },
  ElizaSense: { reach: "AospImage", methods: sense, events: [] },
  ElizaSystem: {
    reach: "AnyNative",
    methods: [
      "getStatus", "requestRole", "openSettings", "openNetworkSettings", "openWriteSettings", "openDisplaySettings",
      "openSoundSettings", "getDeviceSettings", "getSystemFacts", "openSettingsPage", "openNotificationShade",
      "setScreenBrightness", "setVolume", "setFlashlight", "listLauncherApps", "launchApp", "resolveDefaultApp",
      "openDefaultApp", "getBuildInfo", "getLaunchInfo", "getLocaleInfo", "getNetworkStatus", "requestPermissions",
      "openAppInfo", "openClock", "switchStates", "mute", "crashLog", "recordRendererFailure", "clearCrashLog",
    ],
    events: ["networkStatusChanged", "launcherAppsChanged"],
  },
} as const satisfies Record<string, NativePluginEntry>;

/** The name of a plugin the renderer calls. */
export type NativePluginName = keyof typeof nativePlugins;

/** A method of `P` that the renderer calls. */
export type NativeMethod<P extends NativePluginName> = (typeof nativePlugins)[P]["methods"][number];

/** An event `P` posts to the renderer. */
export type NativeEvent<P extends NativePluginName> = (typeof nativePlugins)[P]["events"][number];

/** Whether `name` is a plugin of the table. @throws {never} */
export function isNativePlugin(name: string): name is NativePluginName {
  return Object.hasOwn(nativePlugins, name);
}

/** Where `name` is offered; a plugin the table does not list is offered nowhere. @throws {never} */
export function reachOf(name: string): NativeReach | undefined {
  return isNativePlugin(name) ? nativePlugins[name].reach : undefined;
}
