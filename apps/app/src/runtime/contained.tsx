import { Alert } from "@repo/ui";
import { Component, type ReactNode } from "react";

export interface ContainedProps {
  /** What to call the screen in what the owner is told and in the log: the place it is drawn at. */
  place: string;
  /** Whether the owner is told that it stopped: a page says so, and a layer over the page just goes. */
  told: boolean;
  /** Told what stopped the screen, once. */
  onStopped: (place: string, cause: unknown) => void;
  children: ReactNode;
}

/**
 * One screen, contained: a screen that throws while it draws, or whose code cannot be loaded, stops alone. Home, the
 * other apps and the layers over them go on, so no area can take Alpha away from the owner.
 */
export class Contained extends Component<ContainedProps, { stopped: boolean }> {
  override state = { stopped: false };

  static getDerivedStateFromError() {
    return { stopped: true };
  }

  override componentDidCatch(cause: unknown) {
    this.props.onStopped(this.props.place, cause);
  }

  override render() {
    if (!this.state.stopped) return this.props.children;
    return this.props.told ? <Alert variant="destructive" className="m-4">This part of Alpha stopped. Go back, and open it again.</Alert> : null;
  }
}
