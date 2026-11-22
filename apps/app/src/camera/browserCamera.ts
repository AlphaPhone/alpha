// spec/camera/recorder.md, "Story: Keep every recording I make, within its limit"; spec/camera/focus.md, "Story: Focus where I tap"; spec/camera/scanDialogs.md, "A new browser file picker retires the one before it, and a retired picker never delivers"
import { Capacitor } from "@capacitor/core";
import { admitChunk } from "../../gen/camera__recorder.ts";

type Direction = "front" | "back";
type Preview = { width: number; height: number; deviceId: string; captureSize: { width: number; height: number }; minZoom: number; maxZoom: number; zoom: number; hasFlash: boolean; flash: string };
type Photo = { format: string; base64: string; thumbnail: string; width: number; height: number };
type RecorderEvent = { type: "chunk"; size: number } | { type: "trackEnded" } | { type: "stopped" } | { type: "error" } | { type: "prefix"; ok: boolean };

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 16 * 1024 * 1024;

let stream: MediaStream | undefined;
let video: HTMLVideoElement | undefined;
let frame: HTMLElement | null = null;
let direction: Direction = "back";
let zoom = 1;
let recorder: { media: MediaRecorder; chunks: Blob[]; bytes: number; full: boolean; truncated: boolean; started: number; limit: number; type: string; audio?: MediaStream; done: Promise<void> } | undefined;
let recorderListener: (event: RecorderEvent) => void = () => {};
let previewEnded: () => void = () => {};
const focusWrites = new WeakMap<MediaStreamTrack, Promise<void>>();

/**
 * Mount the live preview into the viewfinder element the Camera screen renders.
 * @throws {never}
 */
export function attachViewfinder(element: HTMLElement | null): void {
  frame = element;
  if (frame && video && video.parentElement !== frame) frame.prepend(video);
}

/**
 * Hear the browser recorder's chunks and stops, for the recorder machine.
 * @throws {never}
 */
export function observeRecorder(listener: (event: RecorderEvent) => void): void {
  recorderListener = listener;
}

/**
 * Hear the camera track ending on its own: unplugged, revoked or taken by another page.
 * @throws {never}
 */
export function onPreviewEnded(listener: () => void): void {
  previewEnded = listener;
}

function track(): MediaStreamTrack | undefined {
  return stream?.getVideoTracks()[0];
}

function receipt(): Preview {
  const settings = track()?.getSettings() ?? {};
  const capabilities = (track()?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
  const width = settings.width ?? video?.videoWidth ?? 0, height = settings.height ?? video?.videoHeight ?? 0;
  return { width, height, deviceId: settings.deviceId ?? "", captureSize: { width, height }, minZoom: 1, maxZoom: 8, zoom, hasFlash: capabilities.torch === true, flash: "off" };
}

async function open(lens: Direction): Promise<Preview> {
  if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("Camera access is unavailable here."), { code: "UNAVAILABLE" });
  let next: MediaStream;
  try {
    next = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: lens === "front" ? "user" : "environment", width: { ideal: 1920 }, height: { ideal: 1440 } } });
  } catch (error) {
    const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
    throw Object.assign(new Error(denied ? "Camera access is off." : "The camera didn’t start."), { code: denied ? "CAMERA_PERMISSION_DENIED" : "PREVIEW_STOPPED" });
  }
  release();
  stream = next;
  direction = lens;
  zoom = 1;
  video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.setAttribute("aria-hidden", "true");
  video.style.cssText = `position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:${lens === "front" ? "scaleX(-1)" : "none"}`;
  video.srcObject = next;
  if (frame) frame.prepend(video);
  track()?.addEventListener("ended", () => {
    if (stream === next) previewEnded();
  }, { once: true });
  await video.play().catch(() => undefined);
  return receipt();
}

function release(): void {
  for (const t of stream?.getTracks() ?? []) t.stop();
  stream = undefined;
  video?.remove();
  video = undefined;
}

/** The same centred crop is used for saved photos and encoded video, and the front camera is mirrored. */
function drawFrame(canvas = document.createElement("canvas")): HTMLCanvasElement {
  if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) throw Object.assign(new Error("Camera isn’t ready."), { code: "CAMERA_NOT_READY" });
  const width = video.videoWidth, height = video.videoHeight;
  if (width * height > 32_000_000) throw Object.assign(new Error("Unsupported camera dimensions."), { code: "CAPTURE_ERROR" });
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw Object.assign(new Error("Camera encoding is unavailable."), { code: "CAPTURE_ERROR" });
  context.save();
  if (direction === "front") {
    context.translate(width, 0);
    context.scale(-1, 1);
  }
  const cropWidth = width / zoom, cropHeight = height / zoom;
  context.drawImage(video, (width - cropWidth) / 2, (height - cropHeight) / 2, cropWidth, cropHeight, 0, 0, width, height);
  context.restore();
  return canvas;
}

function encode(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL("image/jpeg", quality).replace(/^data:image\/jpeg;base64,/, "");
}

function thumbnailOf(canvas: HTMLCanvasElement): string {
  const scale = Math.min(1, 256 / Math.max(canvas.width, canvas.height));
  const small = document.createElement("canvas");
  small.width = Math.max(1, Math.round(canvas.width * scale));
  small.height = Math.max(1, Math.round(canvas.height * scale));
  small.getContext("2d")?.drawImage(canvas, 0, 0, small.width, small.height);
  return encode(small, 0.8);
}

async function blobBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let raw = "";
  for (let at = 0; at < bytes.length; at += 16384) raw += String.fromCharCode(...bytes.subarray(at, at + 16384));
  return btoa(raw);
}

/** Read a recording that a byte limit cut short: its timeline must decode before it is kept. */
async function measurePrefix(blob: Blob): Promise<number> {
  const probe = document.createElement("video");
  const url = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error("prefix")), 5000);
      probe.onloadeddata = () => {
        clearTimeout(deadline);
        resolve();
      };
      probe.onerror = () => {
        clearTimeout(deadline);
        reject(new Error("prefix"));
      };
      probe.preload = "auto";
      probe.src = url;
    });
    if (Number.isFinite(probe.duration) && probe.duration > 0) return probe.duration;
    const { BlobSource, Input, MP4, WEBM } = await import("mediabunny");
    const input = new Input({ source: new BlobSource(blob), formats: [blob.type === "video/mp4" ? MP4 : WEBM] });
    try {
      const end = await input.computeDuration();
      if (!Number.isFinite(end) || end <= 0) throw new Error("prefix");
      return end;
    } finally {
      input.dispose();
    }
  } finally {
    probe.removeAttribute("src");
    probe.load();
    URL.revokeObjectURL(url);
  }
}

function* recorders(media: MediaStream): Generator<MediaRecorder> {
  if (typeof MediaRecorder === "undefined") return;
  for (const mimeType of ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/mp4", "video/webm", undefined]) {
    try {
      if (mimeType && !MediaRecorder.isTypeSupported(mimeType)) continue;
      yield mimeType ? new MediaRecorder(media, { mimeType }) : new MediaRecorder(media);
    } catch {
      continue;
    }
  }
}

/** The browser camera: the same calls as `ElizaCamera`, on the page's own camera. */
export const browserCamera = {
  startPreview: (lens: Direction) => open(lens),
  async stopPreview(): Promise<void> {
    if (recorder && recorder.media.state !== "inactive") recorder.media.stop();
    recorder?.audio?.getTracks().forEach((t) => t.stop());
    recorder = undefined;
    release();
  },
  switchCamera: (lens: Direction) => open(lens),
  async capturePhoto(options: { quality?: number; width?: number; height?: number }): Promise<Photo> {
    const canvas = drawFrame();
    let out = canvas;
    if (options.width && options.height) {
      out = document.createElement("canvas");
      out.width = options.width;
      out.height = options.height;
      out.getContext("2d")?.drawImage(canvas, 0, 0, out.width, out.height);
    }
    return { format: "jpeg", base64: encode(out, (options.quality ?? 85) / 100), thumbnail: thumbnailOf(out), width: out.width, height: out.height };
  },
  async startRecording(options: { audio: boolean; maxDuration: number; maxFileSize: number }): Promise<void> {
    if (!stream) throw Object.assign(new Error("Camera isn’t ready."), { code: "PREVIEW_STOPPED" });
    let audio: MediaStream | undefined;
    if (options.audio) {
      try {
        audio = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch {
        throw Object.assign(new Error("Microphone access is off."), { code: "MICROPHONE_DENIED" });
      }
    }
    const media = new MediaStream([...stream.getVideoTracks().map((t) => t.clone()), ...(audio?.getAudioTracks() ?? [])]);
    const chosen = recorders(media).next().value;
    if (!chosen) throw Object.assign(new Error("Recording is unavailable here."), { code: "UNAVAILABLE" });
    let settle!: () => void;
    const state = { media: chosen, chunks: [] as Blob[], bytes: 0, full: false, truncated: false, started: performance.now(), limit: options.maxFileSize, type: chosen.mimeType || "video/webm", audio, done: new Promise<void>((resolve) => { settle = resolve; }) };
    recorder = state;
    chosen.ondataavailable = (event) => {
      if (recorder !== state || !event.data.size) return;
      recorderListener({ type: "chunk", size: event.data.size });
      if (state.full) {
        state.truncated = true;
        return;
      }
      const admitted = admitChunk(state.bytes, event.data.size, state.limit);
      state.bytes = admitted.total;
      if (admitted.keep) state.chunks.push(event.data);
      else state.truncated = true;
      if (admitted.stop) {
        state.full = true;
        if (chosen.state === "recording") chosen.stop();
      }
    };
    chosen.onerror = () => recorderListener({ type: "error" });
    chosen.onstop = () => {
      recorderListener({ type: "stopped" });
      media.getTracks().forEach((t) => t.stop());
      settle();
    };
    media.getVideoTracks()[0]?.addEventListener("ended", () => {
      recorderListener({ type: "trackEnded" });
      if (chosen.state === "recording") chosen.stop();
    }, { once: true });
    setTimeout(() => {
      if (recorder === state && chosen.state === "recording") chosen.stop();
    }, options.maxDuration * 1000);
    chosen.start(1000);
  },
  async stopRecording(): Promise<{ path: string; duration: number; width: number; height: number; fileSize: number; mimeType: string; dataBase64: string }> {
    const state = recorder;
    if (!state) throw Object.assign(new Error("No recording."), { code: "NOT_RECORDING" });
    if (state.media.state !== "inactive") state.media.stop();
    await Promise.race([state.done, new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error("deadline"), { code: "STOP_DEADLINE" })), 10_000))]);
    recorder = undefined;
    const blob = new Blob(state.chunks, { type: state.type.split(";")[0] });
    if (!blob.size) throw Object.assign(new Error("The recording is empty."), { code: "EMPTY" });
    let duration = (performance.now() - state.started) / 1000;
    if (state.truncated) {
      try {
        duration = await measurePrefix(blob);
        recorderListener({ type: "prefix", ok: true });
      } catch {
        recorderListener({ type: "prefix", ok: false });
        throw Object.assign(new Error("The video at the size limit could not be read."), { code: "PREFIX_INVALID" });
      }
    }
    return { path: "browser-video:///pending", duration, width: video?.videoWidth ?? 0, height: video?.videoHeight ?? 0, fileSize: blob.size, mimeType: blob.type, dataBase64: await blobBase64(blob) };
  },
  async recordingState(): Promise<{ isRecording: boolean; duration: number; fileSize: number }> {
    return { isRecording: recorder?.media.state === "recording", duration: recorder ? (performance.now() - recorder.started) / 1000 : 0, fileSize: recorder?.bytes ?? 0 };
  },
  async setZoom(ratio: number): Promise<void> {
    if (!Number.isFinite(ratio) || ratio < 1 || ratio > 8) throw Object.assign(new Error("Digital zoom must be between 1× and 8×."), { code: "INVALID_ARGUMENT" });
    zoom = ratio;
    if (video) video.style.transform = `${direction === "front" ? "scaleX(-1) " : ""}scale(${ratio})`;
  },
  async setTorch(on: boolean): Promise<void> {
    await track()?.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
  },
  async setFocusPoint(x: number, y: number): Promise<boolean> {
    const current = track();
    if (!current || current.readyState !== "live") return false;
    const capabilities = current.getCapabilities() as MediaTrackCapabilities & { focusMode?: string[] };
    const mode = capabilities.focusMode?.includes("single-shot") ? "single-shot" : capabilities.focusMode?.includes("continuous") ? "continuous" : undefined;
    if (!mode) return false;
    const previous = focusWrites.get(current);
    let release!: () => void;
    const queued = new Promise<void>((resolve) => { release = resolve; });
    focusWrites.set(current, queued);
    try {
      if (previous) await previous;
      if (current.readyState !== "live") return false;
      await current.applyConstraints({ advanced: [{ focusMode: mode, pointsOfInterest: [{ x, y }] } as MediaTrackConstraintSet] });
      const settings = current.getSettings() as MediaTrackSettings & { focusMode?: string; pointsOfInterest?: { x: number; y: number }[] };
      const point = settings.pointsOfInterest?.[0];
      return settings.focusMode === mode && point !== undefined && Math.abs(point.x - x) < 0.01 && Math.abs(point.y - y) < 0.01;
    } catch {
      return false;
    } finally {
      release();
      if (focusWrites.get(current) === queued) focusWrites.delete(current);
    }
  },
  async checkAccess(): Promise<{ camera?: string }> {
    const status = await navigator.permissions?.query({ name: "camera" as PermissionName }).catch(() => undefined);
    return status ? { camera: status.state } : {};
  },
  async downloadPdf(title: string, dataBase64: string): Promise<{ status: string; message: string }> {
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${dataBase64}`;
    link.download = `${title.slice(0, 200)}.pdf`;
    link.click();
    return { status: "requested", message: "Download requested." };
  },
};

let pickerGeneration = 0;

/** One image from the browser's file picker; a newer picker retires this one, whose late result is dropped. */
export function pickBrowserImage(): Promise<Blob | undefined> {
  const generation = ++pickerGeneration;
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = IMAGE_TYPES.join(",");
    input.onchange = () => {
      const file = input.files?.[0];
      if (generation !== pickerGeneration) return resolve(undefined);
      if (!file) return resolve(undefined);
      if (!IMAGE_TYPES.includes(file.type) || file.size <= 0 || file.size > MAX_IMAGE_BYTES) return reject(Object.assign(new Error("Choose a JPEG, PNG or WebP image up to 16 MB."), { code: "UNSUPPORTED" }));
      resolve(file);
    };
    input.oncancel = () => resolve(undefined);
    input.click();
  });
}

/**
 * Retire the browser file picker in flight: back, a device change or a hidden page.
 * @throws {never}
 */
export function retireBrowserPicker(): void {
  pickerGeneration++;
}

/** The bytes of an image Android's picker returned, as a typed blob within the image limits. */
export async function readContentImage(uri: string, mimeType: string | undefined): Promise<Blob> {
  const response = await fetch(Capacitor.convertFileSrc(uri));
  if (!response.ok) throw new Error("The selected image could not be read.");
  const blob = await response.blob();
  const type = mimeType && IMAGE_TYPES.includes(mimeType) ? mimeType : blob.type;
  if (!IMAGE_TYPES.includes(type) || blob.size <= 0 || blob.size > MAX_IMAGE_BYTES) throw new Error("Choose a JPEG, PNG or WebP image up to 16 MB.");
  return blob.type === type ? blob : new Blob([blob], { type });
}
