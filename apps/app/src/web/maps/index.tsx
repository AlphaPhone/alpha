// spec/maps/screen.md, "Story: Find a place"; spec/maps/guidance.md, "Story: Guide me along the route I started"
import { Map as MapIcon } from "lucide-react";
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { MapsScreen } from "./MapsScreen.tsx";
import { NavigationChip } from "./NavigationChip.tsx";

export { MapsCard, type MapsCardProps } from "./MapsCard.tsx";
export { mapsRuntime } from "./runtime.ts";

/** Maps, on every variant. */
export const screens: AppScreen[] = [{ id: "maps", title: "Maps", icon: MapIcon, availability: "everywhere", Screen: MapsScreen }];

/** The ongoing guidance chip, shown over other apps while guidance runs. */
export const surfaces: AppSurface[] = [{ id: "maps-navigation", slot: "top", availability: "everywhere", Surface: NavigationChip }];
