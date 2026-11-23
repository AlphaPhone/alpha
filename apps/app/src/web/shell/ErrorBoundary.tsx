// spec/shell/recovery.md, "Before Alpha has rendered, an uncaught failure shows recovery; after, only a failed shell does"; spec/shell/recovery.md, "A failed app closes and Home says which one"
import { Effect } from "effect";
import { Component, type ReactNode } from "react";
import type { AppId } from "../app-screen.ts";
import { Recovery } from "../../shell/recovery.vibe";
import { perform } from "./useLayer.ts";

/** The app whose render is caught, by id and title. */
export interface ViewBoundaryProps {
  app: AppId;
  title: string;
  children: ReactNode;
}

/** Catches a failed render of one app: the app closes and Home stays usable. */
export class ViewBoundary extends Component<ViewBoundaryProps, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch(error: unknown) {
    const { app, title } = this.props;
    perform(Effect.flatMap(Effect.service(Recovery), (recovery) => recovery.viewFailed(app, title, error)));
  }
  override render() { return this.state.failed ? null : this.props.children; }
}

/** The shell under the boundary and the recovery screen that stands in for it. */
export interface ShellBoundaryProps {
  /** What stands in once the shell itself failed: the recovery screen. */
  fallback: ReactNode;
  children: ReactNode;
}

/** Catches a failed render of the shell itself and hands it to recovery. */
export class ShellBoundary extends Component<ShellBoundaryProps, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch(error: unknown) {
    perform(Effect.flatMap(Effect.service(Recovery), (recovery) => recovery.rootFailed(error)));
  }
  override render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
