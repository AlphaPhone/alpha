// States Camera and Photos reach, for the stories (`*.meta.tsx`).
import type { Camera } from "../../../gen/camera__viewfinder.ts";
import { initial } from "../../../gen/camera__viewfinder.ts";

/** A ready back camera in Photo mode with a flash and a 5× lens. */
export const readyPhoto: Camera = { ...initial, phase: "PreviewReady", epoch: 1, hasFlash: true, widest: 5, longest: 50, flash: "FlashAuto" };

/** Counting down the self-timer. */
export const countingDown: Camera = { ...readyPhoto, timer: 10, countdown: 7 };

/** Recording a video with the light on, near its limit. */
export const recording: Camera = { ...readyPhoto, mode: "VideoMode", bound: "VideoMode", light: true, recording: "RecordingActive", elapsed: 560, recordedBytes: 90_000_000 };

/** Stopped on a camera denial, offering Allow and Retry. */
export const denied: Camera = { ...initial, notice: "CameraNotice" };

/** A refused microphone in Video mode, offering Retry and No sound. */
export const microphone: Camera = { ...readyPhoto, mode: "VideoMode", micDenied: true, notice: "MicrophoneNotice" };
