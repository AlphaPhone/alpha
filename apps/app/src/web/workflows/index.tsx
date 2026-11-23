// spec/workflows/index.md
import { Workflow } from "lucide-react";
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { ResultNoticeSurface } from "./ResultNoticeSurface.tsx";
import { WorkflowsScreen } from "./WorkflowsScreen.tsx";

/** Workflows' one app screen. */
export const screens: AppScreen[] = [
  { id: "workflows", title: "Workflows", icon: Workflow, availability: "everywhere", Screen: WorkflowsScreen },
];

/** The tapped result notice, kept over every screen. */
export const surfaces: AppSurface[] = [
  { id: "workflows-result-notice", slot: "notices", availability: "everywhere", Surface: ResultNoticeSurface },
];
