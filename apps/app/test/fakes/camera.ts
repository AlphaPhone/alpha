// spec/app/camera/index.md, "Story: Open the camera"; spec/app/camera/index.md, "Story: Take photos and videos"
import type { CameraGrant, CameraPlugin, CameraPreviewOptions, CameraPreviewResult, CameraSettings, PhotoCaptureOptions } from "@elizaos/os-bridges";
import { plugin, rejection, type Faked } from "./phone.ts";

/** The camera reported by Android, with the native preview and camera output independently observable. */
export interface CameraScene {
  permission: CameraGrant;
  microphone: CameraGrant;
  preview: CameraPreviewOptions | undefined;
  startGate: Promise<unknown>;
  recordingGate?: Promise<void>;
  volumeShutter: boolean;
  readonly photos: PhotoCaptureOptions[];
  readonly modes: string[];
  readonly focus: Array<{ x: number; y: number }>;
  readonly savedVideos: string[];
}

export const cameraScene = (): CameraScene => ({
  permission: "granted", microphone: "granted", preview: undefined, startGate: Promise.resolve(), volumeShutter: false, photos: [], modes: [], focus: [], savedVideos: [],
});

/** The native key interceptor records the latest setting sent by Camera. */
export function cameraKeys(world: CameraScene) {
  return {
    setVolumeShutter({ enabled }: { enabled: boolean }) {
      world.volumeShutter = enabled;
      return Promise.resolve();
    },
  };
}

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
  let recording = false;
  return plugin<CameraPlugin>(() => ({
    checkCameraPermission: permission,
    requestCameraPermission: permission,
    checkPermissions: permissions,
    requestPermissions: permissions,
    getDevices: () => Promise.resolve({
      devices: (["back", "front"] as const).map((direction) => ({
        deviceId: direction, direction, label: direction, hasZoom: direction === "back", hasFlash: direction === "back",
        maxZoom: direction === "back" ? 5 : 1, supportedResolutions: [{ width: 1280, height: 720 }],
        supportedFrameRates: [30], supportedCaptureAspectRatios: ["4:3", "16:9"],
      })),
    }),
    async startPreview(options) {
      if (world.permission !== "granted") throw rejection("Camera off", "CAMERA_PERMISSION_DENIED");
      await world.startGate;
      world.preview = options;
      return preview(options);
    },
    stopPreview: () => {
      world.preview = undefined;
      return Promise.resolve();
    },
    switchCamera: (options) => {
      world.preview = options;
      return Promise.resolve(preview(options));
    },
    setCaptureMode: ({ mode }) => {
      world.modes.push(mode);
      return Promise.resolve();
    },
    capturePhoto: (options = {}) => {
      if (world.preview === undefined) return Promise.reject(rejection("No live view", "PREVIEW_STOPPED"));
      if (options.thumbnailOnly && (!options.saveToGallery || options.quality !== undefined || options.width !== undefined || options.height !== undefined)) {
        return Promise.reject(rejection("Incompatible thumbnail options", "INVALID_OPTIONS"));
      }
      world.photos.push(options);
      if (!options.saveToGallery) return Promise.resolve({ base64: "YQ==", format: "jpeg", width: options.width ?? 3000, height: options.height ?? 4000 });
      const id = `image-${world.photos.length}`;
      return Promise.resolve({
        thumbnail: "YQ==", format: "jpeg", width: 1280, height: 720,
        path: `content://media/external/images/media/${world.photos.length}`, libraryId: id,
      });
    },
    async startRecording() {
      if (world.preview === undefined) throw rejection("No live view", "PREVIEW_STOPPED");
      recording = true;
      await world.recordingGate;
    },
    stopRecording: () => {
      recording = false;
      const path = `content://media/external/video/media/${world.savedVideos.length + 1}`;
      world.savedVideos.push(path);
      return Promise.resolve({ path, duration: 1, width: 1280, height: 720, fileSize: 10_000, mimeType: "video/mp4" });
    },
    getRecordingState: () => Promise.resolve({ isRecording: recording, duration: recording ? 1 : 0, fileSize: recording ? 10_000 : 0 }),
    getSettings: () => Promise.resolve({ settings }),
    setSettings: ({ settings: update }) => {
      Object.assign(settings, update);
      return Promise.resolve();
    },
    setZoom: ({ zoom }) => {
      settings.zoom = zoom;
      return Promise.resolve();
    },
    setFocusPoint: (point) => {
      world.focus.push(point);
      return Promise.resolve();
    },
    setExposurePoint: () => Promise.resolve(),
    removeAllListeners: () => Promise.resolve(),
  }));
}
