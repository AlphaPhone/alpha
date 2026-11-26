import { cameraScan, scanBack } from "../files/scan.vibe";
import { together } from "../runtime/index.vibe";
import { area } from "../runtime/ui.tsx";
import { Camera } from "./Camera.tsx";
import { camera } from "./camera.vibe";

/** The Camera app owns the full viewfinder and its chrome. */
export default area(together(camera, cameraScan), Camera, { back: scanBack });
