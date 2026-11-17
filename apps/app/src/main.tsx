import { Layer, ManagedRuntime } from "effect";
import * as KeyValueStore from "effect/persistence/KeyValueStore";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { browserDevice } from "./platform/device.vibe";
import { admitted, shell } from "./shell/shell.vibe";
import "./main.css";

const runtime = ManagedRuntime.make(Layer.merge(Layer.provide(shell, KeyValueStore.layerStorage(() => localStorage)), browserDevice));

void runtime.runPromiseExit(admitted());

createRoot(document.getElementById("root")!).render(<StrictMode><App runtime={runtime} /></StrictMode>);
