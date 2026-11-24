// spec/platform/index.md, "A capability is offered only on a variant whose build registers its plugin"; spec/platform/index.md, "A plugin method is called only when the native bridge lists it"

/** Where a plugin is offered: on both native variants, or only on the Alpha AOSP image. */
export type NativeReach = "AnyNative" | "AospImage";

/** One Capacitor plugin the renderer calls: where it is offered, its methods and the events it posts. */
export interface NativePluginEntry {
  readonly reach: NativeReach;
  readonly methods: readonly string[];
  readonly events: readonly string[];
}

/** Every Capacitor plugin, method and event the renderer uses, each implemented by the Android plugin of that name; a method the plugin on the device does not list is unavailable there. */
export const nativePlugins = {
  Agent: {
    reach: "AnyNative",
    methods: [
      "residentAttachment", "setGoogleAgentAccess", "configureProvider", "prepareProviderConfiguration",
      "cancelProviderConfiguration", "clearProvider", "configureCloudProvider", "providerStatus", "selectProvider",
      "removeProviderKey", "revealProviderKey", "launchSurface", "takeInvocation", "keyguard",
    ],
    events: ["keyguardChanged"],
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
  ElizaNetworkPolicy: { reach: "AnyNative", methods: ["getMeteredHint"], events: [] },
  ElizaSecureStore: { reach: "AnyNative", methods: ["get", "set", "remove", "compareAndExchange", "status"], events: [] },
  ElizaActionJournal: {
    reach: "AnyNative",
    methods: ["reserve", "markApplying", "finish", "get", "list", "pending", "undo", "dismiss"],
    events: [],
  },
  ElizaNotifications: { reach: "AnyNative", methods: ["pendingWorkflowTap", "consumeWorkflowTap"], events: ["pendingWorkflowTap"] },
  AlphaActionJournal: {
    reach: "AnyNative",
    methods: [
      "get", "edit", "list", "reviewClock", "cancelClock", "confirmClock",
    ],
    events: [],
  },
  AlphaBillingAuthority: { reach: "AnyNative", methods: ["status", "clear", "start", "verify", "perform"], events: [] },
  AlphaBrowser: {
    reach: "AnyNative",
    methods: [
      "create", "find", "findNext", "clearFind", "navigate", "command", "present", "bookmarks", "setBookmark",
      "browsingState", "saveBrowsingState", "clearBrowsingData", "clearSiteData", "readingSupport", "reviewQuestion",
      "reviewReading", "cancelReading", "pageContext", "share", "openExternalBrowser", "downloads", "loginFillStatus", "close",
    ],
    events: ["findResult", "fullscreen", "notice", "showDownloads", "stateChanged", "tabClosed", "tabOpened"],
  },
  AlphaCalendar: {
    reach: "AnyNative",
    methods: [
      "checkPermissions", "requestPermissions", "requestAccess", "requestWorkflowReadAccess", "list", "inspect", "open",
      "save", "saveOptions", "readOptions", "insertHandoff", "pendingCreations", "acknowledgeCreation", "remove",
      "inspectDeletion", "removeScoped", "prepareAgentSource", "executeAgent", "cancelAgent", "availabilitySources",
      "readAvailability",
    ],
    events: [],
  },
  AlphaCallState: { reach: "AnyNative", methods: ["callState"], events: ["callState"] },
  AlphaCloudSignIn: {
    reach: "AnyNative",
    methods: [
      "credentialIdentity", "status", "startGoogle", "startEmail", "startPhone", "verifyPhone", "verifyEmail", "verifyMfa",
      "resumeMfa", "clearCredentialState", "cancel", "renewSignIn",
    ],
    events: ["signInCompleted", "signInIncomplete", "signInMfaRequired", "signInReadinessChanged", "signInRenewed"],
  },
  AlphaCloudSpeechStream: {
    reach: "AnyNative",
    methods: [
      "requestPermissions", "cloudStreamTiming", "startCloudSpeech", "stopCloudSpeech", "setCloudSpeechOutputMuted",
      "setCloudSpeechMuted", "speakCloudSpeech", "cancelCloudSpeech",
    ],
    events: ["cloudSpeechEvent"],
  },
  AlphaConnection: {
    reach: "AnyNative",
    methods: [
      "readDelegationCallback", "clearDelegationCallback", "prepareGoogleWorkspaceReturn", "consumeGoogleWorkspaceReturn",
      "cancelGoogleWorkspaceReturn", "pauseNotificationCollection", "secureRead", "secureCompareExchange",
    ],
    events: ["cloudDelegationCallback", "googleWorkspaceReturn"],
  },
  AlphaContacts: {
    reach: "AospImage",
    methods: ["status", "requestPermissions", "list", "create", "edit", "get", "save", "remove", "resolveNames"],
    events: [],
  },
  AlphaDeletions: { reach: "AnyNative", methods: ["pending", "dismiss", "undo", "reviewReminder", "reviewAgentReminder"], events: [] },
  AlphaDevice: {
    reach: "AnyNative",
    methods: [
      "shareText", "copyText", "setTextScale", "recommendedTimeout", "snapshot", "openNotificationShade", "openSettings",
      "diagnosticsFacts", "shareDiagnostics", "openUpdatePermissionSettings", "activateUpdate", "updateState",
      "continueUpdate", "checkForUpdate", "installUpdate", "setVolumeShutter", "setSystemBarAppearance", "haptic",
    ],
    events: ["alphaUpdateReady", "alphaUpdateSettled"],
  },
  AlphaCarrierSetup: { reach: "AnyNative", methods: ["read", "readEid", "openSettings"], events: ["foregroundEnded"] },
  AlphaFiles: {
    reach: "AnyNative",
    methods: [
      "checkPermissions", "requestPermissions", "storageState", "storageRequestAccess", "storageList", "storageCategory",
      "storageQuery", "storageReviewedIdentities", "storageTransfer", "storageRename", "storageCreateFolder", "storageTrash",
      "storageTrashList", "storageRestore", "storageEmptyTrash", "storageShare", "storageSelect", "storageOpen",
      "storageWatch", "storageUnwatch",
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
      "status", "enable", "nativeSourceIdentity", "nativeSourceConsent", "beginBackground", "cancelBackground",
      "configureBackground", "disableBackground", "syncInbox", "inboxHistory", "scheduleSourceRenewal", "clearSourceRenewal",
      "pendingSourceRenewal", "settleSourceRenewal", "postWorkflowApprovalNotice", "withdrawWorkflowApprovalNotice",
      "withdrawOtherOwnerApprovalNotices", "resumeWorkflowApprovalNotice", "setResultsShowing", "withdrawResult",
      "publishResult", "pendingResult", "consumeResult", "releaseResultQuestion",
    ],
    events: ["pendingResult", "renewSource"],
  },
  AlphaMailAttachments: {
    reach: "AnyNative",
    methods: ["readSelected", "readPhotoSelected", "cancel", "openReviewed", "openSourceReference", "releaseSourceReferences", "saveReviewed"],
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
  AlphaNetworkLocation: { reach: "AnyNative", methods: ["locate"], events: [] },
  AlphaNoteAudio: {
    reach: "AnyNative",
    methods: ["describe", "play", "stop", "state", "remove", "purge", "deletionStatus"],
    events: [],
  },
  AlphaNoteDocuments: { reach: "AnyNative", methods: ["importText", "exportText", "exportPdf"], events: [] },
  AlphaNotifications: {
    reach: "AnyNative",
    methods: [
      "status", "list", "open", "dismiss", "clear", "canonicalPending", "acknowledgeCanonical", "crossAppStatus",
      "notificationApps", "setNotificationPolicy", "resumeCrossApp", "openNotificationAccess", "notificationHistory",
      "clearNotificationHistory", "consumeOwnNotice", "workflowPresentationCapabilities", "postWorkflow", "workflowReceipt",
      "openChannelSettings",
    ],
    events: ["canonicalNotificationTap", "notificationsChanged", "mirrorChanged"],
  },
  AlphaOngoingCall: { reach: "AospImage", methods: ["ongoingCall", "showCall", "endCall"], events: ["ongoingCall"] },
  AlphaPhotoLibrary: {
    reach: "AnyNative",
    methods: ["scope", "requestAccess", "requestPermissions", "watch", "page", "inspect", "validate", "requestChange", "share"],
    events: ["libraryChanged"],
  },
  AlphaPhotos: {
    reach: "AnyNative",
    methods: [
      "libraryAccess", "list", "thumbnails", "read", "keepCapture", "share", "shareMany", "setFavorite", "changeMany",
      "summary", "prepareDeleteTrash", "cancelDeleteTrash", "deletePreparedTrash", "albums", "changeAlbum", "beginEdit",
      "previewEdit", "saveEdit", "editResult", "cancelEdit", "beginVideoEdit", "saveVideoEdit", "cancelVideoEdit",
      "reviewRemovedVideoCopy",
    ],
    events: [],
  },
  AlphaReset: { reach: "AnyNative", methods: ["review"], events: [] },
  AlphaTelephony: {
    reach: "AospImage",
    methods: [
      "imageCapability", "status", "phoneInfo", "requestAccess", "requestRole", "requestPermissions", "listRecentCalls",
      "dial", "placeCall", "voicemailStatus", "listVoicemail", "fetchVoicemailAudio", "voicemailAudio", "voicemailPcm",
      "markVoicemailHeard", "deleteVoicemail", "observeVoicemail", "composeSms", "listThreads", "listMessages",
      "latestIncomingSender", "markThreadRead", "deleteMessage", "deleteThread", "observeMessages", "sendSms", "sendMms", "cancelSmsReview",
      "smsSendHistory", "smsSendResult", "mmsSendResult", "smsNoticePending", "acknowledgeSmsNotice",
    ],
    events: ["messagesChanged", "voicemailChanged", "smsSendUpdated", "mmsSendUpdated"],
  },
  AlphaVoiceCloud: {
    reach: "AnyNative",
    methods: [
      "checkPermissions", "requestPermissions", "cancel", "startRecording", "stopRecording", "cancelRecording",
      "getRecordingMetrics", "warmSpeechOutput", "localSpeechStatus", "transcribeLocalRecording", "transcribeLocalAudio",
      "synthesizeLocal", "setSpeechOutputMuted", "play", "stopPlayback", "nativeVoiceTiming", "markVoiceTurn",
      "liveCaptureStatus", "startLiveCapture", "stopLiveCapture", "transcribeRecording", "transcribeOwnRecording",
      "synthesize", "synthesizeOwn", "synthesizeLocalBrowserReading", "startNoteRecording", "consumeNoteRecordingOpen",
      "clearNoteRecordingOpen", "noteRecordingStatus", "pauseNoteRecording", "resumeNoteRecording", "stopNoteRecording",
      "discardNoteRecording", "setNoteSegmentText", "claimCanonicalNoteSave", "saveNoteRecording", "workflowPresentationCapabilities",
    ],
    events: ["noteRecordingChanged", "recordingStopped", "playbackEnded", "playbackFailed", "playbackStopped", "liveCaptureEnded"],
  },
  DailyApps: {
    reach: "AnyNative",
    methods: [
      "checkPermissions", "requestPermissions", "perform", "surfaceInfo", "clockHandoff", "listReminders", "selectedReminder",
      "scheduleReminder", "operateReminder", "reminderOperationReceipt", "saveTodo", "todoDecision", "pendingReminderTap",
      "consumeReminderTap", "dismissReminderTap", "releaseReminderQuestion", "restoreSelected", "renameSelected",
      "pdfSelected", "describeSelected", "readSelected", "openSelected", "shareSelected", "forgetSelected", "closeAssistant",
    ],
    events: ["assistantInvoked", "pendingReminderTap", "appResumed", "reminderOpened", "remindersChanged"],
  },
  DeviceApps: { reach: "AnyNative", methods: ["platformCapabilities", "openHomeChooser"], events: [] },
  ElizaCamera: {
    reach: "AnyNative",
    methods: [
      "checkPermissions", "startPreview", "stopPreview", "setCaptureMode", "switchCamera", "capturePhoto", "startRecording",
      "stopRecording", "getRecordingState", "setSettings", "setZoom", "setFocusPoint",
    ],
    events: [],
  },
  ElizaLocation: {
    reach: "AnyNative",
    methods: ["getCurrentPosition", "watchPosition", "clearWatch", "checkPermissions", "requestPermissions"],
    events: ["locationChange", "error"],
  },
  ElizaPasswords: {
    reach: "AnyNative",
    methods: [
      "status", "unlock", "lock", "list", "openEditor", "remove", "reset", "reveal", "copy", "openAutofillSettings",
    ],
    events: [],
  },
  ElizaSense: {
    // Registered on every Android build (MainActivity), so a listener left on can be stopped at startup off the AOSP image.
    reach: "AnyNative",
    methods: [
      "status", "pause", "turnOff", "openSettings", "bindInvocationSession", "discardProtectedPowerInvocation", "takeInvocation",
      "claimProtectedPowerLaunch", "discardProtectedPowerLaunch",
    ],
    events: [],
  },
  ElizaWiFi: {
    reach: "AnyNative",
    methods: ["listAvailableNetworks", "addNetworkWithApproval", "getConnectivity", "openInternetPanel"],
    events: [],
  },
  ElizaSystem: {
    reach: "AnyNative",
    methods: [
      "getStatus", "getSystemFacts", "getDeviceSettings", "getBuildInfo", "getLaunchInfo", "getNetworkStatus", "requestRole",
      "openSettings", "openSettingsPage", "openNetworkSettings", "openNotificationShade", "openAppInfo", "listLauncherApps",
      "launchApp", "resolveDefaultApp", "openDefaultApp", "crashLog", "recordRendererFailure", "clearCrashLog",
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

/** Where `name` is offered; undefined for a plugin the table does not list, which Native then offers wherever the build registers it. @throws {never} */
export function reachOf(name: string): NativeReach | undefined {
  return isNativePlugin(name) ? nativePlugins[name].reach : undefined;
}

/** One `AlphaActionJournal` call: the method and its arguments, answered with the plugin's reply. */
export type JournalInvoke = (method: "get" | "edit" | "list", args: Readonly<Record<string, unknown>>) => Promise<unknown>;

function field(reply: unknown, name: string): unknown {
  if (typeof reply !== "object" || reply === null || !Object.hasOwn(reply, name)) throw new Error(`AlphaActionJournal answered without ${name}`);
  return (reply as Record<string, unknown>)[name];
}

/** The agent device-execution journal (`DeviceJournal` of @elizaos/agent/client) over `AlphaActionJournal`: `get` answers the entry or undefined, `edit` whether the compare-and-set held, `list` every entry; a malformed reply rejects, so it never reads as an absent entry. @throws {never} */
export function deviceJournalOver(invoke: JournalInvoke): {
  get(proposalId: string): Promise<unknown>;
  edit(proposalId: string, expectedRevision: number, next: unknown): Promise<boolean>;
  list(): Promise<readonly unknown[]>;
} {
  return {
    async get(proposalId) {
      const entry = field(await invoke("get", { proposalId }), "entry");
      return entry === null ? undefined : entry;
    },
    async edit(proposalId, expectedRevision, next) {
      return field(await invoke("edit", { proposalId, expectedRevision, next }), "kept") === true;
    },
    async list() {
      const entries = field(await invoke("list", {}), "entries");
      if (!Array.isArray(entries)) throw new Error("AlphaActionJournal answered without entries");
      return entries;
    },
  };
}
