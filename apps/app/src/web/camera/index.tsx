// spec/camera/index.md; spec/camera/scanDialogs.md, "Back leaves an open document first; every other close ends the review and its document"; spec/camera/recorder.md, "The shutter, Back, the recording poll or leaving finalises once, and finalisation saves one row for a settled recording"; spec/camera/videoEdit.md, "Close, Back and a hidden page dispose the editor and abort its save"
import { Effect } from "effect";
import { Camera, Images } from "lucide-react";
import { AgentPhotos } from "../../camera/agentPhotos.vibe";
import { MediaEditor } from "../../camera/editor.vibe";
import { PhotoLibrary } from "../../camera/library.vibe";
import { Scanner } from "../../camera/scanner.vibe";
import { Viewfinder } from "../../camera/viewfinder.vibe";
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { CameraScreen } from "./CameraScreen.tsx";
import { PhotosScreen } from "./PhotosScreen.tsx";
import { ask } from "../shell/services.ts";

/** Back in Camera: the scan's innermost dialog closes first, then a recording stops and is kept; false when Back leaves Camera. */
export const cameraBack = (): Promise<boolean> =>
  ask(Effect.gen(function* () {
    const scanner = yield* Effect.service(Scanner);
    if (yield* scanner.back()) return true;
    const viewfinder = yield* Effect.service(Viewfinder);
    return yield* viewfinder.back();
  }), false);

/** Back in Photos: an editor, the scan's dialogs, the assistant's review card, then the library's own dialogs, viewer, selection and album; false when Back leaves Photos. */
export const photosBack = (): Promise<boolean> =>
  ask(Effect.gen(function* () {
    const editor = yield* Effect.service(MediaEditor);
    if (yield* editor.back()) return true;
    const scanner = yield* Effect.service(Scanner);
    if (yield* scanner.back()) return true;
    const agent = yield* Effect.service(AgentPhotos);
    if (yield* agent.back()) return true;
    const library = yield* Effect.service(PhotoLibrary);
    return yield* library.back();
  }), false);

/** Camera and Photos, on every build. */
export const screens: AppScreen[] = [
  { id: "camera", title: "Camera", icon: Camera, availability: "everywhere", Screen: CameraScreen, back: cameraBack },
  { id: "photos", title: "Photos", icon: Images, availability: "everywhere", Screen: PhotosScreen, back: photosBack },
];

/** Camera and Photos keep no surface mounted across screens. */
export const surfaces: AppSurface[] = [];
