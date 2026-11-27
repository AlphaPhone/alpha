import { area } from "../runtime/ui.tsx";
import { Camera } from "./Camera.tsx";
import { camera, cameraBack } from "./camera.vibe";

/** The Camera app owns the full viewfinder and its chrome. */
export default area(camera, Camera, { back: cameraBack });
