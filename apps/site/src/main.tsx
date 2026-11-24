import { Layer, ManagedRuntime } from "effect";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Site } from "./Site.tsx";
import { browserPage, demo } from "./demo.vibe";
import "./main.css";

createRoot(document.getElementById("root")!).render(<StrictMode><Site runtime={ManagedRuntime.make(Layer.provide(demo, browserPage))} /></StrictMode>);
