import { Alert, Button } from "@repo/ui";
import { Component, type ReactNode } from "react";

export interface ContainedProps {
  /** What to call the screen in what the owner is told and in the log: the place it is drawn at. */
  place: string;
  /** Whether the owner is told that it stopped: a page says so, and a layer over the page just goes. */
  told: boolean;
  /** Told what stopped the screen, once. */
  onStopped: (place: string, cause: unknown) => void;
  /** Changing this value clears a stopped boundary in place, for persistent slots that never unmount. */
  resetKey?: unknown;
  /** Called when the owner retries or a boundary resets in place. */
  onReset?: () => void;
  children: ReactNode;
}

interface ContainedState {
  stopped: boolean;
  resetKey: unknown;
}

/**
 * One screen, contained: a screen that throws while it draws, or whose code cannot be loaded, stops alone. Home, the
 * other apps and the layers over them go on, so no area can take Alpha away from the owner. A stopped boundary can
 * recover in place via its retry action or a changing `resetKey`.
 */
export class Contained extends Component<ContainedProps, ContainedState> {
  override state: ContainedState = { stopped: false, resetKey: this.props.resetKey };

  static getDerivedStateFromProps(props: ContainedProps, state: ContainedState): ContainedState | null {
    if (props.resetKey !== state.resetKey) return { stopped: false, resetKey: props.resetKey };
    return null;
  }

  static getDerivedStateFromError(): Pick<ContainedState, "stopped"> {
    return { stopped: true };
  }

  override componentDidCatch(cause: unknown) {
    this.props.onStopped(this.props.place, cause);
  }

  /** Clears the stopped state so the screen can render again in place. */
  reset = () => {
    this.setState({ stopped: false });
    this.props.onReset?.();
  };

  override render() {
    if (!this.state.stopped) return this.props.children;
    if (!this.props.told) return null;
    return (
      <div className="m-4 flex flex-col gap-3">
        <Alert variant="destructive">This part of Alpha stopped. Go back, and open it again.</Alert>
        <div>
          <Button variant="secondary" size="sm" onClick={this.reset}>Try again</Button>
        </div>
      </div>
    );
  }
}
