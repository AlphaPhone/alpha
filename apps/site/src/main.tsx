import { Layer, ManagedRuntime } from "effect";
import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { Site } from "./Site.tsx";
import { browserPage, demo } from "./demo.vibe";
import "./main.css";

const root = document.getElementById("root")!;
const page = <StrictMode><Site runtime={ManagedRuntime.make(Layer.provide(demo, browserPage))} /></StrictMode>;
if (root.hasChildNodes()) hydrateRoot(root, page);
else createRoot(root).render(page);
