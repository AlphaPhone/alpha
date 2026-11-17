import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { boot } from "./boot.tsx";
import { browserPlatform, phonePlatform } from "./platform/platform.ts";
import "./main.css";

const alpha = boot("Capacitor" in globalThis ? phonePlatform() : browserPlatform(location.origin));

createRoot(document.getElementById("root")!).render(<StrictMode><App alpha={alpha} /></StrictMode>);
