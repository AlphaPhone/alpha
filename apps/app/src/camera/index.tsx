import { area } from "../runtime/area.tsx";
import { Camera } from "./Camera.tsx";
import { camera } from "./camera.vibe";

/** The Camera app owns the full viewfinder and its chrome. */
export const cameraArea = area(camera, Camera);
export default cameraArea;
