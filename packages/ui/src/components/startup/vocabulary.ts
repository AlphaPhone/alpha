/** An access the walkthrough asks for, in the order it asks. */
export type StartupAccess = "Notifications" | "Microphone" | "Camera" | "Location" | "Calendar" | "Photos" | "Files";

/** What a row says of its access: Steps' `Word`. */
export type StartupAccessWord =
  | "Allowed"
  | "Precise"
  | "Approximate"
  | "AllPhotos"
  | "SelectedPhotos"
  | "Limited"
  | "Off"
  | "AskFirst"
  | "Reading"
  | "CouldNotCheck";

/** The one action a row offers for its access. */
export type StartupAccessAction = "Allow" | "Settings" | "Check" | "Try again";

/** What the walkthrough says after a press or an answer: Access' `Notice`, without the quiet one. */
export type StartupAccessNotice = "AllowFirst" | "StillOff" | "NotConfirmed" | "NotSaved";

/** What went wrong that "All set" says: Finish's `Trouble`, without none. */
export type StartupTrouble = "ConnectionFailed" | "SignInNeedsAttention";

/** How the connection to the resident agent ended, or `Pending` while it has not. */
export type StartupConnection = "Pending" | "Connected" | "Unreachable" | "Offline" | "Recovering";

/** The surface Alpha shows: Home as the launcher, only chat and close, or a plain page. */
export type StartupPresentation = "Launcher" | "AssistantOnly" | "Plain";

/** What a failure screen is about: the journal's kinds Alpha sees itself. */
export type StartupFailure = "FailedToStart" | "FailedToDraw" | "Uncaught" | "KeptFailing";

/** Every kind the journal holds, those Android reports too. */
export type StartupJournalKind = StartupFailure | "Crashed" | "StoppedAnswering";
