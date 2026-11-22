// spec/shell/navigation.md, "Each app keeps one place, and an app opened from elsewhere starts on its first page"
import type { Nav } from "../../../gen/shell__navigation.ts";
import { appInert, placeOf } from "../../../gen/shell__navigation.ts";
import type { AppScreen } from "../app-screen.ts";
import { ViewBoundary } from "./ErrorBoundary.tsx";

export interface AppFrameProps {
  nav: Nav;
  /** The screens this build offers. */
  screens: readonly AppScreen[];
  /** Failures recorded so far; a failed app starts afresh after one. */
  failures: number;
  onClose: () => void;
}

/**
 * The apps the owner visited, kept mounted so their place survives leaving and coming back; only the open one is shown.
 * @model spec/shell/navigation.md
 */
export function AppFrame({ nav, screens, failures, onClose }: AppFrameProps) {
  const visited = screens.filter((screen) => screen.id === nav.app || nav.places.some((place) => place.app === screen.id));
  return (
    <>
      {visited.map(({ id, title, Screen }) => {
        const shown = id === nav.app;
        const place = placeOf(nav, id);
        return (
          <section
            key={id}
            role="region"
            aria-label={title}
            hidden={!shown}
            inert={!shown || appInert(nav) || undefined}
            data-alpha-layer="app"
            data-alpha-app={id}
            data-alpha-focus-target={shown ? "region" : undefined}
            className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-background"
          >
            <ViewBoundary key={`${id}:${failures}`} app={id} title={title}>
              <Screen route={place.route === "" ? undefined : place.route} onClose={onClose} />
            </ViewBoundary>
          </section>
        );
      })}
    </>
  );
}
