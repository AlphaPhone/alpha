import { createElement, type ReactNode } from "react";
import { ListGroup } from "../ListGroup.tsx";
import type { StatusDotProps } from "../StatusDot.tsx";
import type { Reading } from "./vocabulary.ts";

export const waiting: Reading = { word: "waiting" };

export const unavailable: Reading = { word: "unavailable" };

export const reported = (value: string, status?: StatusDotProps["status"]): Reading => ({ word: "reported", value, status });

/** Shows a row where it lives, on the card of a group. */
export const inGroup = (story: () => ReactNode) => createElement(ListGroup, null, story());

/** Sizes a page to the viewport, as the app shell does. */
export const fullHeight = (story: () => ReactNode) => createElement("div", { className: "h-dvh" }, story());
