// spec/camera/index.md
import { Camera, Images } from "lucide-react";
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { CameraScreen } from "./CameraScreen.tsx";
import { PhotosScreen } from "./PhotosScreen.tsx";

/** Camera and Photos, on every build. */
export const screens: AppScreen[] = [
  { id: "camera", title: "Camera", icon: Camera, availability: "everywhere", Screen: CameraScreen },
  { id: "photos", title: "Photos", icon: Images, availability: "everywhere", Screen: PhotosScreen },
];

/** Camera and Photos keep no surface mounted across screens. */
export const surfaces: AppSurface[] = [];
