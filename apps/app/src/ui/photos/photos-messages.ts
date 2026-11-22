/**
 * What Photos and the camera's Keep show when Alpha's native Photos bridge refuses or answers
 * with a sentence. Android's `AlphaPhotosPlugin` (forked from plugin-native-media `PhotosPlugin`)
 * and the stores it calls (`OwnedPhotoEdits`, `VideoCopyEdits`, `VideoEditSpec`, `OwnedAlbums`,
 * `OwnedMediaLibrary`, `OwnedMediaSelection`, `TrashDeleteRequest`, `OwnedCaptures`,
 * `CaptureAdmission`, `PhotoCrop`, `PermittedPhotosPlugin`) answer in English; each sentence is
 * worded by Alpha here and the bridge's text is never shown. A share result is worded by the
 * selected-document outcomes (`files/selected-document-messages.ts`), which the bridge reuses.
 */
import { SELECTED_DOCUMENT_OUTCOMES } from "../files/selected-document-messages";
import { refusalText, resultText } from "../utils/native-refusal";

const RECOVERY = "An earlier video copy needs recovery. Review it in Photos first.";
const NOT_RECORDED = "The save couldn’t be recorded. Try again.";
const KEEP_NOT_RECORDED = "Keeping the photo couldn’t be recorded. Try again.";

/** Keyed by every bridge sentence a Photos screen can receive. */
export const PHOTOS_MESSAGES: ReadonlyMap<string, string> = new Map([
  // PhotosPlugin.
  ["Only still photos support edit copies", "Only photos can be edited here, not videos."],
  ["Edit copies support source files up to 32 MB", "Only photos up to 32 MB can be edited."],
  ["Photo editor unavailable", "Photo editor isn’t available."],
  ["Preview unavailable", "Preview isn’t available."],
  ["Replace outcome unknown; inspect Photos before retrying", "Alpha can’t tell whether the original was replaced. Check Photos before trying again."],
  ["Save outcome unknown; inspect Photos before retrying", "Alpha can’t tell whether the photo was saved. Check Photos before trying again."],
  ["Saved-copy outcome could not be confirmed", "The saved copy couldn’t be confirmed. Check Photos."],
  ["Video copy preservation refused", "The unfinished video copy couldn’t be kept for recovery."],
  ["Video editor is unavailable. Original unchanged.", "Video editor isn’t available. The original is unchanged."],
  ["Video edit could not start. Original unchanged.", "Video editing couldn’t start. The original is unchanged."],
  ["Android trash requires Android 11 or later", "Trash needs Android 11 or later."],
  ["Favorites require Android 11 or later", "Favorites need Android 11 or later."],
  ["Saved media could not be loaded", "Saved photos and videos couldn’t be loaded."],
  ["Select 1-24 listed items.", "Select 1 to 24 items from the list."],
  ["This saved media is no longer available", "This photo or video is no longer available."],
  ["Invalid keep request", "This photo couldn’t be kept."],
  ["Return to Photos and share the selection again", "Return to Photos and share the selection again."],
  ["Android sharing could not open", "Android couldn’t open sharing."],
  [
    "A selected item changed or is unavailable. Reselect the media before sharing.",
    "A selected item changed or isn’t available. Select it again before sharing.",
  ],
  [
    "This media changed or could not be verified. Refresh Photos before trying again.",
    "This item changed or couldn’t be checked. Refresh Photos, then try again.",
  ],
  ["Select 1–20 unchanged deleted items again.", "Select 1 to 20 deleted items again; the selection changed."],
  ["Select 1–20 distinct owned items with current revisions.", "Select 1 to 20 different items again; the selection is out of date."],
  ["Album counts could not be loaded", "Album counts couldn’t be loaded."],
  ["Select deleted items again. The selection was not a list of items.", "Select deleted items again."],
  [
    "More than 500 owned items are in trash. Manage a smaller batch in Android Photos.",
    "Trash holds more than 500 of Alpha’s items. Manage them in smaller batches in Android Photos.",
  ],
  ["Trash could not be prepared for confirmation", "Trash couldn’t be prepared for your confirmation."],
  ["Delete confirmation expired. Review trash again.", "The delete confirmation expired. Review trash again."],
  ["Owned albums require Android 11 or later", "Albums need Android 11 or later."],
  ["Owned albums could not be loaded", "Albums couldn’t be loaded."],
  ["Photo library closed", "Photos closed. Open it again to continue."],
  ["Album could not be saved. Reload albums before trying again", "The album couldn’t be saved. Reload albums, then try again."],
  // OwnedAlbums, OwnedMediaLibrary, OwnedMediaSelection, TrashDeleteRequest.
  ["Album is no longer available", "This album is no longer available."],
  ["Album changed", "This album changed. Reopen it and try again."],
  ["At most 24 custom albums are supported", "You can have up to 24 albums."],
  ["Album changed. Reopen it before trying again", "This album changed. Reopen it and try again."],
  ["Select owned media first", "Select photos or videos saved by Alpha first."],
  ["Media is no longer in this album", "That item is no longer in this album."],
  ["Unsupported album operation", "Albums can’t do that."],
  ["Album could not be saved", "The album couldn’t be saved."],
  ["Use an album name of 1–80 characters", "Use an album name of 1 to 80 characters."],
  ["Unknown album", "This album no longer exists."],
  ["Trash has no albums", "Trash has no albums."],
  ["Media is no longer available", "This item is no longer available."],
  ["Media changed. Reselect it before trying again", "This item changed. Select it again, then try again."],
  ["Select deleted items again", "Select deleted items again."],
  // OwnedPhotoEdits, PhotoCrop, PhotoFilter.
  ["Only saved still photos can be edited", "Only saved photos can be edited."],
  ["Animated images cannot be edited here", "Animated images can’t be edited here."],
  ["This photo can only be saved as a copy", "This photo can only be saved as a copy."],
  ["Photo changed. Cancel and reopen the editor.", "The photo changed. Cancel and reopen the editor."],
  ["Photo changed. Reload Photos.", "The photo changed. Reload Photos."],
  ["Photo editor closed", "Photo editor closed."],
  ["Photo edit session expired", "The edit session expired. Reopen the editor."],
  ["Photo no longer available. Reload Photos.", "This photo is no longer available. Reload Photos."],
  ["Original could not be kept", "The original couldn’t be kept."],
  ["Original could not be opened for writing", "The original couldn’t be changed."],
  ["Replacing the original was not confirmed. Inspect Photos.", "Alpha couldn’t confirm the original was replaced. Check Photos."],
  ["Edited photo could not be encoded", "The edited photo couldn’t be saved."],
  ["Copy could not be created", "The copy couldn’t be created."],
  ["Copy could not be written", "The copy couldn’t be written."],
  ["Copy publication was not confirmed", "Alpha couldn’t confirm the copy was saved. Check Photos."],
  ["Ambiguous saved copy; inspect Photos before retrying", "More than one saved copy matches. Check Photos before trying again."],
  ["This save identity already has a different edit", "This save was already used for a different edit. Reopen the editor."],
  ["Saved-copy lookup is unavailable", NOT_RECORDED],
  ["Save receipt could not be reserved", NOT_RECORDED],
  ["Save receipt could not be persisted", NOT_RECORDED],
  ["Saved-copy receipt could not be persisted", NOT_RECORDED],
  ["Use a quarter-turn rotation", "Rotate in quarter turns."],
  ["Choose a crop area inside the photo", "Choose a crop area inside the photo."],
  ["Photo has no pixels", "This photo has no image to edit."],
  // VideoCopyEdits and VideoEditSpec.
  ["Choose an available video up to 100 MB", "Choose a video of up to 100 MB."],
  ["Choose a video up to 100 MB", "Choose a video of up to 100 MB."],
  ["Video is unavailable", "This video isn’t available."],
  ["Video editor closed", "Video editor closed."],
  ["Video changed while opening", "The video changed while opening. Try again."],
  ["Video changed. Close and reopen the editor.", "The video changed. Close and reopen the editor."],
  ["This video cannot be edited.", "This video can’t be edited."],
  ["This video's orientation is unsupported", "This video’s orientation can’t be edited."],
  ["More than one copy matches this request. Inspect Photos.", "More than one copy matches. Check Photos."],
  ["Recorded video copy needs recovery review", RECOVERY],
  ["Pending video copy needs recovery review", RECOVERY],
  ["Video copy history needs recovery", RECOVERY],
  ["Free at least 400 MB to edit a video", "Free up at least 400 MB to edit a video."],
  ["Resolve earlier video copies before editing another", "Finish recovering earlier video copies before editing another."],
  ["Close the current video editor first", "Close the open video editor first."],
  ["Reopen the video editor", "Reopen the video editor."],
  ["This copy request already has different edits", "This copy was already started with different edits. Reopen the editor."],
  ["Video export stopped. Original unchanged.", "Video export stopped. The original is unchanged."],
  ["Video copy is empty or exceeds 100 MB", "The video copy is empty or over 100 MB."],
  ["Video copy exceeds 100 MB", "The video copy is over 100 MB."],
  ["Video copy could not be created", "The video copy couldn’t be created."],
  ["Video edit storage is unavailable", "Video editing storage isn’t available."],
  ["Video edit storage changed", "Video editing storage changed. Try again."],
  ["Video publication could not be confirmed", "Alpha couldn’t confirm the video copy was saved. Check Photos."],
  ["Video edit output already exists", "This video copy already exists. Check Photos."],
  [
    "Choose a video range of at least 0.1 seconds, within a five-minute video.",
    "Choose a range of at least 0.1 seconds, in a video of up to five minutes.",
  ],
  ["Choose a video range of at least 0.1 seconds.", "Choose a range of at least 0.1 seconds."],
  // OwnedCaptures and CaptureAdmission (Keep).
  ["The unfinished capture was removed. Capture it again to retry.", "The unfinished photo was removed. Take it again to retry."],
  ["This capture identity already belongs to different image bytes.", "This photo was already kept with a different image. Take it again."],
  ["Photo save could not be confirmed. Check Photos before trying again.", "Alpha couldn’t confirm the photo was kept. Check Photos before trying again."],
  ["Only a captured JPEG up to 16 MB can be kept.", "Only a photo taken here, up to 16 MB, can be kept."],
  ["Photo could not be created", "The photo couldn’t be saved."],
  ["Photo could not be opened", "The photo couldn’t be saved."],
  ["Photo publication was not confirmed", "Alpha couldn’t confirm the photo was kept. Check Photos."],
  ["Capture receipt could not be persisted", KEEP_NOT_RECORDED],
  ["Capture lookup is unavailable", KEEP_NOT_RECORDED],
  // PermittedPhotosPlugin.
  ["Photo library changed or is unavailable. Refresh Photos and check its access.", "Photos changed or isn’t available. Refresh Photos and check its access."],
  ["Unlock and reopen Photos before reading the library.", "Unlock the phone, then reopen Photos."],
  // AlphaMediaReview (favorite, trash, restore, delete forever and replace reviews of device photos).
  ["Photo change cancelled or expired. No change was dispatched.", "The photo change was cancelled or timed out. Nothing changed."],
  ["Photos closed before dispatch. Review the selection again.", "Photos closed before the change was made. Review the selection again."],
  ["Select 1–20 distinct permitted items.", "Select 1 to 20 different items you’ve allowed Alpha to use."],
  ["Select 1–500 distinct permitted items.", "Select 1 to 500 different items you’ve allowed Alpha to use."],
  ["Finish the current photo review first.", "Finish the open photo review first."],
  ["Return to Photos to review this change.", "Go back to Photos to review this change. Nothing changed."],
  ["Photo change cancelled. No change was dispatched.", "Photo change cancelled. Nothing changed."],
  ["Photo review expired.", "The photo review timed out. Nothing changed."],
  ["Selected media changed or is unavailable. Refresh Photos.", "A selected item changed or isn’t available. Refresh Photos. Nothing changed."],
  ["Replacing other apps' photos requires Android 11 or later.", "Replacing photos from other apps needs Android 11 or later."],
  ["Return to Photos to replace this photo.", "Go back to Photos to replace this photo. Nothing was replaced."],
  ["Photo changed or is unavailable. Nothing was replaced.", "The photo changed or isn’t available. Nothing was replaced."],
  ["Photo outcome could not be verified. Refresh before reviewing a new change.", "Alpha couldn’t confirm what changed. Refresh Photos before reviewing another change."],
  ["Photo outcome could not be verified. Refresh Photos.", "Alpha couldn’t confirm what changed. Refresh Photos."],
  ["Photos closed. No reviewed change will be replayed.", "Photos closed. The reviewed change won’t be made again."],
  // Alpha's own late-launch answer (AlphaPhotosPlugin.closedMessage).
  [
    "Android could not show this request; Alpha may have closed. Reopen Alpha and try again.",
    "Android could not show this request; Alpha may have closed. Reopen Alpha and try again.",
  ],
]);

/** Alpha's sentence for a failed Photos call: the bridge sentence it names, else `fallback`. */
export function photosErrorText(error: unknown, fallback: string): string {
  return refusalText(error, PHOTOS_MESSAGES, fallback);
}

/** Alpha's sentence for a Photos result message (Keep, share): the sentence it names, else `fallback`. */
export function photosResultText(message: unknown, fallback: string): string {
  return resultText(message, PHOTOS_MESSAGES, resultText(message, SELECTED_DOCUMENT_OUTCOMES, fallback));
}
