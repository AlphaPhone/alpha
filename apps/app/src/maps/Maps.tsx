// spec/app/maps/index.md, "Story: Find a place"; spec/app/maps/index.md, "Story: Plan directions and choose a route"; spec/app/maps/guidance.md, "Story: Guide me along the route I started"; spec/app/maps/saved.md, "Story: Keep the places I care about on this phone"
import { Alert, Banner, Button, Input, ListGroup, ListRow, SearchField, Spinner } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Crosshair, Info, MapPin, Navigation, Star } from "lucide-react";
import type { Machine as ScreenMachine, Place } from "../../gen/app__maps.effect.vibe";
import { useMachine as useScreen } from "../../gen/app__maps.react.ts";
import { noPlace } from "../../gen/app__maps.ts";
import type { Machine as ConnectionMachine } from "../../gen/app__maps__connection.effect.vibe";
import { useMachine as useConnection } from "../../gen/app__maps__connection.react.ts";
import type { Machine as GuidanceMachine } from "../../gen/app__maps__guidance.effect.vibe";
import { useMachine as useGuidance } from "../../gen/app__maps__guidance.react.ts";
import type { Machine as PlaneMachine } from "../../gen/app__maps__plane.effect.vibe";
import { useMachine as usePlane } from "../../gen/app__maps__plane.react.ts";
import type { Machine as SavedMachine } from "../../gen/app__maps__saved.effect.vibe";
import { useMachine as useSaved } from "../../gen/app__maps__saved.react.ts";
import type { Travel } from "../../gen/app__maps__vocabulary.ts";
import { offers } from "../../gen/app__maps__vocabulary.ts";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import type { Time } from "../runtime/time.vibe";
import { pointIn } from "./geometry.ts";

export interface MapsProps {
  /** Provides the machines of `maps` in maps.vibe, and Alpha's time, at which `can` is asked. */
  runtime: ManagedRuntime.ManagedRuntime<ScreenMachine | ConnectionMachine | GuidanceMachine | PlaneMachine | SavedMachine | Time, unknown>;
}

const modes: ReadonlyArray<{ travel: Travel; label: string }> = [
  { travel: "Drive", label: "Drive" }, { travel: "Transit", label: "Transit" }, { travel: "Walk", label: "Walk" }, { travel: "Bicycle", label: "Bike" },
];

const failures = {
  NoFailure: "",
  SignedOut: "Sign in to Alpha Cloud to use Maps.",
  NotOffered: "Maps is not offered for this account.",
  Transient: "Maps could not be reached.",
  Invalid: "Maps answered with something it could not use.",
} as const;

const endings = {
  NotEnded: "",
  EndedByOwner: "",
  EndedFromNotification: "Navigation stopped from the notification.",
  EndedByLocation: "Navigation stopped: the location was lost.",
  EndedByProvider: "Navigation stopped: the Maps account changed.",
  PausedInBackground: "Navigation paused while Alpha was in the background. Tap Start to resume.",
} as const;

const minutes = (seconds: number) => `${Math.max(1, Math.round(seconds / 60))} min`;
const distance = (meters: number) => (meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`);
const coordinates = (p: Place) => `${(p.lat / 1e6).toFixed(5)}, ${(p.lng / 1e6).toFixed(5)}`;
const routeName = (index: number) => (index === 0 ? "Recommended" : `Alternative ${index}`);

/** A pin at coordinates the owner typed. */
function pinAt(text: string): Place | undefined {
  const point = pointIn(text);
  return point === undefined ? undefined : { ...noPlace, name: text.trim(), ...point };
}

/**
 * Maps: the search and its results, the place open, its directions with their start, modes and routes, guidance along
 * the route the owner started, the saved places and the map's credits. Each control is offered exactly when its event is.
 * @model spec/app/maps/index.md
 */
export function Maps({ runtime }: MapsProps) {
  const screen = useTimed(runtime, useScreen);
  const connection = useConnection(runtime);
  const guidance = useGuidance(runtime);
  const plane = usePlane(runtime);
  const saved = useSaved(runtime);
  const { state, can, send } = screen;
  if (screen.cause ?? connection.cause ?? saved.cause) return <Alert variant="destructive" className="m-4">Alpha could not open Maps</Alert>;
  if (!state || !connection.state || !guidance.state || !plane.state || !saved.state) return null;
  const owner = "Owner" as const;
  const offer = connection.state.coverage.offer;
  const google = connection.state.coverage.kind === "GoogleProvider";
  const guiding = guidance.state.phase !== "NotGuiding";
  const keeping = { label: state.place.name, lat: state.place.lat, lng: state.place.lng, provider: state.place.ref === "" ? "" : state.place.kind, ref: state.place.ref, kind: state.place.kind };
  const kept = saved.state.items.find((item) => item.lat === state.place.lat && item.lng === state.place.lng);
  const submit = () => {
    const pin = pinAt(state.query);
    if (pin) return void send({ type: "pick", choice: "PinChoice", point: pin }, owner);
    const search = { type: "submitSearch", len: state.query.length, key: state.query.trim().toLowerCase() } as const;
    if (can(search, owner)) void send(search, owner);
  };
  const leg = state.routes[state.chosen];
  const start = leg && { type: "start", route: state.route.ticket * 10 + state.chosen + 1, steps: leg.steps } as const;
  return (
    <section aria-label="Maps" className="flex flex-col gap-3 p-4">
      {connection.state.phase === "ReadFailed" && (
        <Banner variant="warn" action={connection.can({ type: "retryCoverage" }) && <Button size="sm" variant="outline" onClick={() => void connection.send({ type: "retryCoverage" })}>Retry</Button>}>
          {failures[connection.state.failure] || failures.Transient}
        </Banner>
      )}
      {connection.state.phase === "Reading" && <Spinner label="Reaching Maps" />}
      {connection.state.pausedUntil > 0 && connection.state.phase === "Installed" && (
        <Banner variant="info">{`Maps asked Alpha to wait. Try again after ${new Date(connection.state.pausedUntil).toLocaleTimeString()}.`}</Banner>
      )}
      {guiding && (
        <Banner
          variant={guidance.state.offRoute ? "warn" : "info"}
          action={<Button size="sm" variant="outline" onClick={() => void guidance.send({ type: "endGuidance" })}>End</Button>}
        >
          {guidance.state.phase === "Arrived" ? "You have arrived."
            : guidance.state.offRoute ? "Off route. End navigation to plan a new route."
            : !guidance.state.fixUsable ? "Waiting for a precise, up-to-date location."
            : `Step ${guidance.state.step + 1} of ${guidance.state.lastStep + 1}`}
        </Banner>
      )}
      {guidance.can({ type: "recenter" }) && <Button variant="outline" onClick={() => void guidance.send({ type: "recenter" })}><Crosshair />Recenter</Button>}
      {endings[guidance.state.ended] !== "" && <Alert variant="warn">{endings[guidance.state.ended]}</Alert>}

      {!state.directions && (
        <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <SearchField
            aria-label="Search Maps"
            placeholder="Search Maps"
            value={state.query}
            onValueChange={(text) => void send({ type: "typeQuery", text, now: untimed }, owner)}
            disabled={!can({ type: "typeQuery", text: "", now: untimed }, owner)}
          />
        </form>
      )}
      {can({ type: "locate" }, owner) && !state.directions && (
        <Button variant="outline" onClick={() => void send({ type: "locate" }, owner)}><Crosshair />My location</Button>
      )}
      {state.locate.status === "Loading" && <Spinner label="Finding your location" />}
      {state.locate.status === "Failed" && <Alert variant="warn">Alpha could not find your location.</Alert>}

      {state.searching && state.choice === "NoChoice" && (
        <>
          {state.search.status === "Loading" && <Spinner label="Searching" />}
          {state.search.status === "Failed" && <Alert variant="warn">The search failed. Press Enter to try again.</Alert>}
          {state.search.status === "Loaded" && state.results.length === 0 && <Alert variant="info">No places found.</Alert>}
          {state.results.length > 0 && (
            <ListGroup heading="Results">
              {state.results.map((place) => (
                <ListRow key={place.ref} asChild title={place.name} detail={place.category || coordinates(place)} leading={<MapPin />}>
                  <button type="button" aria-label={place.name} onClick={() => void send({ type: "pick", choice: "ResultChoice", point: place }, owner)} />
                </ListRow>
              ))}
            </ListGroup>
          )}
        </>
      )}

      {state.choice === "NoChoice" && state.query === "" && state.recent.length > 0 && (
        <ListGroup heading="Recent">
          {state.recent.map((recent) => (
            <ListRow key={recent.key} asChild title={recent.text}>
              <button type="button" aria-label={recent.text} onClick={() => { void send({ type: "typeQuery", text: recent.text, now: untimed }, owner).then(() => send({ type: "submitSearch", len: recent.text.length, key: recent.key }, owner)); }} />
            </ListRow>
          ))}
        </ListGroup>
      )}

      {state.choice === "NoChoice" && !state.searching && saved.state.items.length > 0 && (
        <ListGroup heading="Saved">
          {saved.state.items.map((item) => {
            const point = { ...noPlace, ref: item.ref, name: item.label, lat: item.lat, lng: item.lng, kind: item.provider === "OpenProvider" ? "OpenProvider" : item.provider === "" ? "NoProvider" : "GoogleProvider" } as const;
            return (
              <ListRow key={item.id} asChild title={item.label} leading={<Star />}>
                <button type="button" aria-label={item.label} onClick={() => void send({ type: "pick", choice: "SavedChoice", point }, owner)} />
              </ListRow>
            );
          })}
        </ListGroup>
      )}

      {state.choice !== "NoChoice" && !state.directions && (
        <section aria-label={state.place.name} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{state.place.name}</h2>
          {state.place.category !== "" && <p>{state.place.category}</p>}
          {state.details.status === "Loading" && <Spinner label="Reading the place" />}
          {state.details.status === "Failed" && <Alert variant="warn">The place's details could not be read.</Alert>}
          <div className="flex flex-wrap gap-2">
            {can({ type: "openDirections", offered: offers(offer, state.travel) }, owner) && (
              <Button onClick={() => void send({ type: "openDirections", offered: offers(offer, state.travel) }, owner)}><Navigation />Directions</Button>
            )}
            {kept === undefined && saved.can({ type: "savePlace", place: keeping }) && (
              <Button variant="outline" onClick={() => void saved.send({ type: "savePlace", place: keeping })}><Star />Save</Button>
            )}
            {kept !== undefined && (
              <Button variant="outline" onClick={() => void saved.send({ type: "removePlace", id: kept.id })}>Remove from saved</Button>
            )}
            {can({ type: "closePlace" }, owner) && <Button variant="ghost" onClick={() => void send({ type: "closePlace" }, owner)}>Close</Button>}
          </div>
        </section>
      )}

      {state.directions && (
        <section aria-label="Directions" className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{`To ${state.place.name}`}</h2>
          <form onSubmit={(event) => { event.preventDefault(); if (can({ type: "submitOrigin" }, owner)) void send({ type: "submitOrigin" }, owner); }}>
            <Input
              aria-label="Starting point"
              placeholder={state.originKind === "LocatedOrigin" ? "Your location" : "Starting point"}
              value={state.originText}
              onChange={(event) => void send({ type: "editOrigin", text: event.target.value, point: pinAt(event.target.value) ?? noPlace, now: untimed }, owner)}
            />
          </form>
          {can({ type: "locate" }, owner) && <Button variant="outline" onClick={() => void send({ type: "locate" }, owner)}><Crosshair />Your location</Button>}
          {state.choosingOrigin && state.originSearch.status === "Loading" && <Spinner label="Finding the starting point" />}
          {state.choosingOrigin && state.candidates.length > 0 && (
            <ListGroup heading="Start from">
              {state.candidates.map((place) => (
                <ListRow key={place.ref} asChild title={place.name} detail={coordinates(place)}>
                  <button type="button" aria-label={place.name} onClick={() => void send({ type: "chooseOrigin", kind: "ChosenOrigin", point: place }, owner)} />
                </ListRow>
              ))}
            </ListGroup>
          )}
          <div role="group" aria-label="Travel mode" className="flex flex-wrap gap-2">
            {modes.map(({ travel, label }) => (
              <Button
                key={travel}
                size="sm"
                variant={state.travel === travel ? "primary" : "outline"}
                aria-pressed={state.travel === travel}
                disabled={!can({ type: "setTravel", travel, offered: offers(offer, travel) }, owner)}
                onClick={() => void send({ type: "setTravel", travel, offered: offers(offer, travel) }, owner)}
              >
                {label}
              </Button>
            ))}
          </div>
          {state.route.status === "Loading" && <Spinner label="Planning the route" />}
          {state.route.status === "Failed" && <Alert variant="warn">No route was found.</Alert>}
          {state.routes.length > 0 && (
            <ListGroup heading="Routes">
              {state.routes.map((route, index) => (
                <ListRow key={routeName(index)} asChild selected={index === state.chosen} title={`${routeName(index)}, ${minutes(route.seconds)}`} detail={distance(route.meters)}>
                  <button type="button" aria-label={routeName(index)} aria-pressed={index === state.chosen} onClick={() => { if (can({ type: "chooseRoute", index }, owner)) void send({ type: "chooseRoute", index }, owner); }} />
                </ListRow>
              ))}
            </ListGroup>
          )}
          <div className="flex flex-wrap gap-2">
            {start && guidance.can(start) && <Button onClick={() => void guidance.send(start)}><Navigation />Start</Button>}
            {can({ type: "swapEnds" }, owner) && !guiding && <Button variant="outline" onClick={() => void send({ type: "swapEnds" }, owner)}>Swap ends</Button>}
          </div>
        </section>
      )}

      {plane.state.built && (
        <footer className="flex items-center gap-2">
          {google
            ? plane.can({ type: "openInfo" }) && <Button size="sm" variant="ghost" onClick={() => void plane.send({ type: "openInfo" })}>Google Maps</Button>
            : plane.can({ type: "openInfo" }) && <Button size="icon" variant="ghost" aria-label="Map credits" onClick={() => void plane.send({ type: "openInfo" })}><Info /></Button>}
          {plane.can({ type: "retryMap" }) && <Button size="sm" variant="outline" onClick={() => void plane.send({ type: "retryMap" })}>Retry the map</Button>}
        </footer>
      )}
      {plane.state.infoOpen && (
        <Alert variant="info" role="dialog" aria-label="Map credits">
          <p>{plane.state.copyrightShown ? plane.state.copyright : connection.state.coverage.kind === "GoogleProvider" ? "Map data from Google" : "Map data from the Maps provider"}</p>
          <p>Searches and route points are sent to the Maps provider through Alpha Cloud.</p>
          <Button size="sm" variant="ghost" onClick={() => void plane.send({ type: "closeInfo" })}>Close</Button>
        </Alert>
      )}
    </section>
  );
}
