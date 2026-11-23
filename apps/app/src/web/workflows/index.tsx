// spec/workflows/index.md; spec/workflows/place.md, "Back closes the overlay first, then returns to the list; at the bare list Back is the shell's"
import { Workflow } from "lucide-react";
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { back } from "./connect.ts";
import { ResultNoticeSurface } from "./ResultNoticeSurface.tsx";
import { WorkflowsScreen } from "./WorkflowsScreen.tsx";

/** Workflows' one app screen; Back closes its Clock draft, sheet or review, then returns to its list, before it is the shell's. */
export const screens: AppScreen[] = [
  { id: "workflows", title: "Workflows", icon: Workflow, availability: "everywhere", Screen: WorkflowsScreen, back },
];

/** The tapped result notice, kept over every screen. */
export const surfaces: AppSurface[] = [
  { id: "workflows-result-notice", slot: "notices", availability: "everywhere", Surface: ResultNoticeSurface },
];
