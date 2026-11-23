// spec/maps/screen.md, "Story: Find a place"; spec/maps/screen.md, "Call is offered only for a dialable number on the build that has Phone, and Copy number only for a place that is not Google's"; spec/maps/screen.md, "A place outside every region the provider covers keeps its coordinates and says so"; spec/maps/screen.md, "Story: Plan directions and choose a route"; spec/maps/guidance.md, "Story: Guide me along the route I started"; spec/maps/plane.md, "Story: See the map for what I am looking at"; spec/maps/eventReturn.md, "Story: Go back to the event whose place I opened"; spec/maps/plane.md, "The credits panel opens from the badge or the information button of a built plane"
import { Effect } from "effect";
import { CalendarDays, LocateFixed, RotateCw } from "lucide-react";
import { useCallback, useState } from "react";
import { useMachine as useGuidance } from "../../../gen/maps__guidance.react.ts";
import { useMachine as useLocator } from "../../../gen/maps__location.react.ts";
import { useMachine as usePlane } from "../../../gen/maps__plane.react.ts";
import { useMachine as useReturn } from "../../../gen/maps__eventReturn.react.ts";
import { offered as returnOffered } from "../../../gen/maps__eventReturn.ts";
import { creditsFor } from "../../../gen/maps__plane.ts";
import { useMachine as useSaved } from "../../../gen/maps__savedPlaces.react.ts";
import { canBack, mode, initial as screenStart } from "../../../gen/maps__screen.ts";
import { useMachine as useScreen } from "../../../gen/maps__screen.react.ts";
import { maySpeak, restricted } from "../../../gen/maps__vocabulary.ts";
import { basemapFor } from "../../../gen/maps__plane.ts";
import { offered, outsideShown, savedFor } from "../../maps/screen.vibe";
import { buildInfo } from "../shell/services.ts";
import type { ScreenProps } from "../app-screen.ts";
import { Button } from "../components/ui/index.ts";
import { DirectionsSheet } from "./DirectionsSheet.tsx";
import { MapCredits } from "./MapCredits.tsx";
import { MapPlane } from "./MapPlane.tsx";
import { NavigationView } from "./NavigationView.tsx";
import { PlaceSheet } from "./PlaceSheet.tsx";
import { ResultsSheet } from "./ResultsSheet.tsx";
import { SearchBar } from "./SearchBar.tsx";
import { act, ask, useMapsContent } from "./actions.ts";
import { runtime } from "./runtime.ts";

/**
 * The Maps app: the map, search, the place sheet, directions and guidance.
 * @model spec/maps/screen.md
 * @design design.md
 */
export function MapsScreen({ route, onClose }: ScreenProps) {
  const screen = useScreen(runtime).state ?? screenStart;
  const guidance = useGuidance(runtime).state;
  const plane = usePlane(runtime).state;
  const saved = useSaved(runtime).state?.items ?? [];
  const eventReturn = useReturn(runtime).state;
  const locator = useLocator(runtime).state;
  const c = useMapsContent();
  const [aosp] = useState(() => buildInfo().variant === "aosp");

  const opened = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    act((s) => s.session.open());
    act((s) => s.screen.open());
    const query = route?.startsWith("q=") ? decodeURIComponent(route.slice(2)) : undefined;
    if (query) act((s) => s.screen.handoff(query, false));
  }, [route]);

  const guiding = guidance !== undefined && guidance.phase !== "NotGuiding" && c.guidance !== undefined;
  const view = mode(screen);
  const coverage = c.coverage;
  const shown = c.shown && c.shown.id === screen.choiceId ? c.shown : undefined;
  const googleContent = coverage?.kind === "GoogleProvider" && (shown?.kind === "GoogleProvider" || c.results.places.length > 0 || c.routes.routes.length > 0);
  const basemap = basemapFor(coverage?.kind ?? "NoProvider", coverage?.offer.map ?? false, googleContent);
  const routes = c.routes.run === screen.routeRun ? c.routes.routes : [];
  const results = c.results.run === screen.queryRun ? c.results.places : [];
  const candidates = c.originResults.run === screen.originRun ? c.originResults.places : [];
  const savedShown = savedFor(shown, saved) !== undefined;
  const status = c.message || (shown && outsideShown(c) ? "This location is outside Cloud Maps coverage. Its coordinates are retained." : "")
    || (plane?.state === "PlaneFailed" ? "Map rendering is unavailable. Retry the map, or use coordinates and saved places." : "");
  const label = basemap === "GoogleRaster" ? "Google Maps" : basemap === "WorldMap" ? "World map" : basemap === "OpenRaster" ? "Cloud map" : "Map";

  const mountPlane = useCallback((node: HTMLSpanElement | null) => {
    if (!node || basemap === "NoBasemap") return;
    act((s) => s.plane.mount(1, basemap));
    return () => act((s) => s.plane.release());
  }, [basemap]);

  const back = () => { void ask((s) => s.screen.back()).then((handled) => { if (handled === false) onClose(); }); };

  return (
    <main ref={opened} aria-label="Maps" className="relative flex size-full flex-col bg-background">
      <div className="pointer-events-none relative z-10 flex flex-col gap-2 p-3 *:pointer-events-auto">
        {guiding && guidance && c.guidance ? (
          <NavigationView guidance={guidance} content={c.guidance} voiceOn={c.voiceOn} voiceAllowed={maySpeak(c.guidance.kind)} now={Date.now()}
            onEnd={() => act((s) => s.navigation.end())} onRecenter={() => act((s) => s.navigation.recenter())} onVoice={() => act((s) => s.navigation.toggleVoice())} />
        ) : view !== "DirectionsMode" && view !== "OriginMode" && (
          <SearchBar query={screen.query} canBack={canBack(screen)} canClear={screen.query !== ""}
            onType={(text) => act((s) => s.screen.typeQuery(text))} onSubmit={() => act((s) => s.screen.submitSearch())}
            onClear={() => act((s) => s.screen.clearQuery())} onLead={() => (canBack(screen) ? back() : onClose())} />
        )}
        {status && <p role="status" className="self-start rounded-xl bg-card px-3 py-1 text-sm shadow-sm">{status}</p>}
        {eventReturn && returnOffered(eventReturn) && !guiding && (
          <Button variant="secondary" size="sm" className="self-start" onClick={() => act((s) => s.handoff.returnToEvent())}><CalendarDays aria-hidden />Back to event</Button>
        )}
        {plane?.state === "PlaneFailed" && (
          <Button variant="secondary" size="sm" className="self-start" onClick={() => act((s) => s.plane.retry())}><RotateCw aria-hidden />Retry map</Button>
        )}
        {!coverage && c.message && <Button variant="secondary" size="sm" className="self-start" onClick={() => act((s) => s.session.retry())}>Retry</Button>}
      </div>

      <div data-alpha-maps-controls className="pointer-events-none relative z-10 mt-auto flex flex-col gap-2 p-3 pb-[min(max(7.75rem,calc(var(--alpha-dock-clearance,6.375rem)+1.375rem)),calc(100dvh-11rem))] *:pointer-events-auto [html.alpha-landscape_&]:pb-3">
        <div className="flex items-end justify-between">
          {plane && (
            <MapCredits credits={creditsFor(basemap)} copyright={c.copyright} attribution={coverage?.attribution ?? "OpenFreeMap · © OpenMapTiles · Data from OpenStreetMap"}
              recipients={coverage?.recipients ?? []} open={plane.infoOpen} onOpen={() => act((s) => s.plane.openInfo())} onClose={() => act((s) => s.plane.closeInfo())}
              onCoordinates={() => act((s) => Effect.andThen(s.plane.closeInfo(), s.screen.enterCoordinates()))}
              locationDenied={locator?.failure === "Denied"} onLocationSettings={() => act((s) => s.handoff.openSettings())} />
          )}
          {!guiding && view !== "DirectionsMode" && (
            <Button variant="secondary" size="icon" aria-label="My location" loading={screen.locating} onClick={() => act((s) => s.screen.locate())}><LocateFixed aria-hidden /></Button>
          )}
        </div>
        {!guiding && (
          <div className="max-h-[60vh] overflow-hidden rounded-xl bg-card shadow-lg">
            {(view === "BaseMode" || view === "ResultsMode") && (screen.searching || saved.length > 0) && (
              <ResultsSheet phase={screen.search} places={results} saved={saved} recent={c.recent} emptyQuery={screen.query === ""}
                here={c.position?.coordinate} onPick={(i) => act((s) => s.screen.pickResult(i))} onSaved={(id) => act((s) => s.screen.pickSaved(id))}
                onSearch={(text) => act((s) => Effect.andThen(s.screen.typeQuery(text), s.screen.submitSearch()))} onClearRecent={() => act((s) => s.screen.clearRecent())} />
            )}
            {view === "PlaceMode" && shown && (
              <PlaceSheet shown={shown} details={screen.details} restricted={restricted(shown.kind)} saved={savedShown}
                canDirections={screen.details === "Ready" && offered(c, screen.travel)} canCall={aosp}
                onDirections={() => act((s) => s.screen.openDirections())}
                onToggleSaved={(name) => act((s) => s.screen.toggleSaved(name))}
                onRename={(name) => act((s) => s.screen.renamePlace(name))}
                editing={c.renaming?.id === shown.id ? c.renaming.text : undefined}
                onEditing={(text) => act((s) => s.content.update((x) => ({ ...x, renaming: text === undefined ? undefined : { id: shown.id, text } })))}
                onShare={() => act((s) => s.handoff.sharePlace(shown))} onCall={(phone) => act((s) => s.handoff.call(phone))}
                onCopy={(phone) => act((s) => s.handoff.copyNumber(phone))} onWebsite={(url) => act((s) => s.handoff.openWebsite(url))}
                onClose={() => act((s) => s.screen.closePlace())} />
            )}
            {(view === "DirectionsMode" || view === "OriginMode") && shown && (
              <DirectionsSheet destination={shown.label} originText={screen.originKind === "LocatedOrigin" ? "Your location" : screen.originText} travel={screen.travel}
                offered={(t) => offered(c, t)} route={screen.route} routes={routes} chosen={screen.chosen} choosing={view === "OriginMode"} candidates={candidates}
                savedMatches={saved.filter((i) => screen.originText !== "" && i.label.toLowerCase().includes(screen.originText.toLowerCase()))}
                swapShown={screen.origin && !screen.choosingOrigin} canSwap={screen.route === "Ready" && screen.origin && !screen.choosingOrigin} canStart={screen.route === "Ready"} restricted={googleContent}
                onOriginText={(text) => act((s) => s.screen.editOrigin(text))} onSubmitOrigin={() => act((s) => s.screen.submitOrigin())}
                onUseLocation={() => act((s) => s.screen.locate())} onTravel={(t) => act((s) => s.screen.setTravel(t))}
                onChooseRoute={(i) => act((s) => s.screen.chooseRoute(i))} onChooseCandidate={(i) => act((s) => s.screen.chooseOrigin(i))}
                onChooseSaved={(id) => act((s) => s.screen.chooseSavedOrigin(id))} onSwap={() => act((s) => s.screen.swapEnds())}
                onStart={() => act((s) => s.navigation.start())}
                onShare={() => { const r = routes[screen.chosen]; if (r) act((s) => s.handoff.shareRoute(shown.label, r)); }}
                onClose={back} />
            )}
          </div>
        )}
      </div>
      <span ref={mountPlane} hidden />
      <div className="absolute inset-0 z-0">
        {plane?.built && (
          <MapPlane
            basemap={basemap} generation={plane.generation} tileSize={coverage?.tiles?.tileSize} minZoom={coverage?.tiles?.minZoom} maxZoom={coverage?.tiles?.maxZoom}
            label={label} follow={guiding && guidance.follow && c.guidance?.fix !== undefined}
            onPin={(id) => act((s) => id.startsWith("r") ? s.screen.pickResult(Number(id.slice(1))) : id.startsWith("o") ? s.screen.chooseOrigin(Number(id.slice(1))) : s.screen.closePlace())}
            onLongPress={(coordinate) => { if (!guiding) act((s) => s.screen.dropPin(coordinate)); }}
            onPressStart={(coordinate, x, y) => { if (!guiding) act((s) => s.plane.pressStarted(coordinate, x, y)); }}
            onPressMove={(x, y) => act((s) => s.plane.pressMoved(x, y))} onPressEnd={() => act((s) => s.plane.pressEnded())}
            onInteraction={() => { if (guiding) act((s) => s.navigation.stopFollowing()); }}
            onSettled={(center, zoom, width, height) => act((s) => Effect.andThen(s.screen.setViewport(center, zoom), s.plane.settled(center, zoom, width, height)))}
            onState={(generation, outcome) => act((s) => s.plane.report(generation, outcome))}
          />
        )}
      </div>
    </main>
  );
}
