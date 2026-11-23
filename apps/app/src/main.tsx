import { Alert } from "@repo/ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { boot } from "./boot.tsx";
import { native } from "./platform/device.vibe";
import { browserPlatform, phonePlatform } from "./platform/platform.vibe";
import { single } from "./runtime/single.ts";
import "./main.css";

const root = createRoot(document.getElementById("root")!);

// One page per store: a second window is told so, and opens nothing.
if (await single()) root.render(<StrictMode><App alpha={boot(native() ? phonePlatform() : browserPlatform(location.origin))} /></StrictMode>);
else root.render(<Alert variant="warn" className="m-6">Alpha is open in another window</Alert>);
