/**
 * What the camera and the document page capture say when the shared native camera
 * (`CameraPlugin.kt` in plugin-native-camera, registered as `ElizaCamera`) refuses a photo. The
 * plugin rejects with a stable code and an English sentence that can carry Android exception
 * text; Alpha words the code here and never shows the plugin's sentence.
 */
import { isNativeRejection } from "../utils/native-refusal";

/** Keyed by every code `CameraPlugin.capturePhoto` (and the preview it needs) rejects with. */
export const CAMERA_CAPTURE_CODES: Readonly<Record<string, string>> = {
  CAMERA_DESTROYED: "Camera closed. Open it again to capture.",
  CAMERA_INACTIVE: "Camera isn’t ready. Wait for the preview, then try again.",
  CAMERA_NOT_READY: "Camera isn’t ready. Wait for the preview, then try again.",
  PREVIEW_STOPPED: "The camera preview stopped. Start Camera again.",
  PREVIEW_CANCELLED: "The camera preview stopped before it started. Start Camera again.",
  CAPTURE_CANCELLED: "Camera stopped before the photo was taken. Try again.",
  CAPTURE_ERROR: "The photo couldn’t be taken. Try again.",
  PHOTO_PROCESSING_FAILED: "The photo couldn’t be processed. Try again.",
  GALLERY_WRITE_FAILED: "The photo couldn’t be saved to Photos.",
  PERMISSION_DENIED: "Allow storage access in Android Settings to save photos on this Android version.",
  CAMERA_PERMISSION_DENIED: "Allow camera access in Android Settings to take photos.",
  INVALID_ARGUMENT: "The camera couldn’t use these photo settings.",
  INVALID_OPTIONS: "The camera couldn’t use these photo settings.",
};

/**
 * Alpha's sentence for a failed capture: a native rejection by its code, else `fallback`. A plain
 * error is Alpha's own (thrown by the camera adapter) and keeps its message.
 */
export function cameraCaptureErrorText(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && Object.hasOwn(CAMERA_CAPTURE_CODES, code))
    return CAMERA_CAPTURE_CODES[code];
  if (isNativeRejection(error) || typeof code === "string") return fallback;
  return error.message.trim() || fallback;
}
