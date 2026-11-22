// spec/notes/index.md
import { NotebookText } from "lucide-react";
import type { AppScreen, AppSurface } from "../app-screen.ts";
import { NotesRecordingIndicator } from "./NotesRecordingIndicator.tsx";
import { NotesScreen } from "./NotesScreen.tsx";

/** The Notes app. */
export const screens: AppScreen[] = [{ id: "notes", title: "Notes", icon: NotebookText, availability: "everywhere", Screen: NotesScreen }];

/** The recording indicator above every screen. */
export const surfaces: AppSurface[] = [
  { id: "notes-recording", slot: "top", availability: "everywhere", Surface: NotesRecordingIndicator },
];
