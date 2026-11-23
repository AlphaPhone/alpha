import type { PermissionState } from '@capacitor/core';
import { registerPlugin } from '../platform-plugins';

export type CameraDirection = 'front' | 'back';
/** The bound preview, with the lens facts Android reported for it. */
export type PreviewReceipt = { width: number; height: number; deviceId: string; captureSize?: { width: number; height: number }; minZoom?: number; maxZoom?: number; hasFlash?: boolean; zoom?: number; flash?: string };
/** `thumbnail` (a JPEG of at most 256 px) replaces `base64` when a gallery capture asks for `thumbnailOnly`. */
export type Photo = { base64?: string; thumbnail?: string; format: string; width: number; height: number; path?: string };
export type VideoReceipt = { path: string; duration: number; width: number; height: number; fileSize: number };

/**
 * The shared CameraPlugin as Alpha's Android build calls it. Upstream's web-only arguments (an
 * HTMLElement, rectangles) are not part of the Android wire and are not sent.
 */
export interface ElizaCameraPlugin {
  checkPermissions(): Promise<{ camera: PermissionState; microphone: PermissionState; photos: 'granted' }>;
  startPreview(options: { direction: CameraDirection; resolution: { width: number; height: number }; mirror: boolean }): Promise<PreviewReceipt>;
  stopPreview(): Promise<void>;
  switchCamera(options: { direction: CameraDirection }): Promise<PreviewReceipt>;
  capturePhoto(options: { format: 'jpeg'; quality?: number; width?: number; height?: number; saveToGallery: boolean; thumbnailOnly?: boolean }): Promise<Photo>;
  /** Binds VideoCapture only for Video mode. */
  setCaptureMode(options: { mode: 'photo' | 'video'; quality?: string; bitrate?: number; frameRate?: number }): Promise<unknown>;
  startRecording(options: { audio: boolean; saveToGallery: boolean; quality: string; maxDuration: number; maxFileSize: number }): Promise<void>;
  stopRecording(): Promise<VideoReceipt>;
  getRecordingState(): Promise<{ isRecording: boolean; duration: number; fileSize: number }>;
  setZoom(options: { zoom: number }): Promise<void>;
  setSettings(options: { settings: { flash: 'off' | 'on' } }): Promise<void>;
  setFocusPoint(options: { x: number; y: number }): Promise<void>;
}
export const elizaCamera = registerPlugin<ElizaCameraPlugin>('ElizaCamera');
