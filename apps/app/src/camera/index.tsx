import { cameraScan, scanBack } from "../files/scan.vibe";
import { together } from "../runtime/reactor.vibe";
import { area } from "../runtime/area.tsx";
import { Camera } from "./Camera.tsx";
import { camera } from "./camera.vibe";

/** The Camera app owns the full viewfinder and its chrome. */
export const cameraArea = area(together(camera, cameraScan), Camera, { back: scanBack });
export default cameraArea;
