// spec/app/camera/index.md, "Story: Open the camera"; spec/app/camera/index.md, "Story: Take photos and videos"
import type { CameraGrant, CameraPlugin, CameraPreviewOptions, CameraPreviewResult, CameraSettings, PhotoCaptureOptions } from "@elizaos/os/bridges/definitions/camera";
import { plugin, rejection, type Faked } from "./phone.ts";

/** The camera reported by Android, with the native preview and camera output independently observable. */
export interface CameraScene {
  permission: CameraGrant;
  microphone: CameraGrant;
  preview: CameraPreviewOptions | undefined;
  startGate: Promise<unknown>;
  readonly photos: PhotoCaptureOptions[];
  readonly modes: string[];
  readonly focus: Array<{ x: number; y: number }>;
  readonly savedVideos: string[];
}

export const cameraScene = (): CameraScene => ({
  permission: "granted", microphone: "granted", preview: undefined, startGate: Promise.resolve(), photos: [], modes: [], focus: [], savedVideos: [],
});

export function elizaCamera(world: CameraScene): Faked {
  const settings: CameraSettings = {
    flash: "off", zoom: 1, focusMode: "auto", exposureMode: "auto", exposureCompensation: 0, whiteBalance: "auto",
  };
  const permission = () => Promise.resolve({ camera: world.permission });
  const permissions = () => Promise.resolve({ camera: world.permission, microphone: world.microphone, photos: "granted" as const });
  const preview = (options: CameraPreviewOptions): CameraPreviewResult => ({
    width: 1280, height: 720, captureSize: { width: 3000, height: 4000 }, deviceId: options.direction ?? "back", minZoom: 1,
    maxZoom: options.direction === "front" ? 1 : 5, zoom: 1, hasFlash: options.direction !== "front", flash: "off",
  });
  return plugin<CameraPlugin>(() => ({
    checkCameraPermission: permission,
    requestCameraPermission: permission,
    checkPermissions: permissions,
    requestPermissions: permissions,
    async getDevices() {
      return { devices: (["back", "front"] as const).map((direction) => ({
        deviceId: direction, direction, label: direction, hasZoom: direction === "back", hasFlash: direction === "back",
        maxZoom: direction === "back" ? 5 : 1, supportedResolutions: [{ width: 1280, height: 720 }],
        supportedFrameRates: [30], supportedCaptureAspectRatios: ["4:3", "16:9"],
      })) };
    },
    async startPreview(options) {
      if (world.permission !== "granted") throw rejection("Camera off", "CAMERA_PERMISSION_DENIED");
      await world.startGate;
      world.preview = options;
      return preview(options);
    },
    async stopPreview() { world.preview = undefined; },
    async switchCamera(options) { world.preview = options; return preview(options); },
    async setCaptureMode({ mode }) { world.modes.push(mode); },
    async capturePhoto(options = {}) {
      if (world.preview === undefined) throw rejection("No live view", "PREVIEW_STOPPED");
      if (options.thumbnailOnly && (!options.saveToGallery || options.quality !== undefined || options.width !== undefined || options.height !== undefined)) {
        throw rejection("Incompatible thumbnail options", "INVALID_OPTIONS");
      }
      world.photos.push(options);
      if (!options.saveToGallery) return { base64: "YQ==", format: "jpeg", width: options.width ?? 3000, height: options.height ?? 4000 };
      const id = `image-${world.photos.length}`;
      return {
        thumbnail: "YQ==", format: "jpeg", width: 1280, height: 720,
        path: `content://media/external/images/media/${world.photos.length}`, libraryId: id,
      };
    },
    async startRecording() {
      if (world.preview === undefined) throw rejection("No live view", "PREVIEW_STOPPED");
    },
    async stopRecording() {
      const path = `content://media/external/video/media/${world.savedVideos.length + 1}`;
      world.savedVideos.push(path);
      return { path, duration: 1, width: 1280, height: 720, fileSize: 10_000, mimeType: "video/mp4" };
    },
    async getRecordingState() { return { isRecording: false, duration: 0, fileSize: 0 }; },
    async getSettings() { return { settings }; },
    async setSettings({ settings: update }) { Object.assign(settings, update); },
    async setZoom({ zoom }) { settings.zoom = zoom; },
    async setFocusPoint(point) { world.focus.push(point); },
    async setExposurePoint() {},
    async removeAllListeners() {},
  }));
}
