import { ManagedRuntime } from "effect";
import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { LegalPage, policyAt } from "./Legal.tsx";
import { Site } from "./Site.tsx";
import { demo } from "./demo.vibe";
import "./main.css";

const root = document.getElementById("root")!;
const policy = policyAt(window.location.pathname);
if (policy) document.title = policy.document.title;
const page = <StrictMode>{policy
  ? <LegalPage page={policy} />
  : <Site runtime={ManagedRuntime.make(demo)} />}</StrictMode>;
if (root.hasChildNodes()) hydrateRoot(root, page);
else createRoot(root).render(page);
