import type { ComponentMeta } from "vibestack/stories";
import type { MapsScreenViewProps } from "./MapsScreenView.tsx";
import {
  covered, directionsContent, directionsScreen, emptyResultsScreen, failedResultsScreen, fromEvent, googlePlaceContent, guiding, guidingContent, idleScreen,
  locationDenied, locatorIdle, noReturn, placeContent, placeScreen, planeCredits, planeFailed, planeReady, resultsContent, resultsScreen, savedPlaces,
  searchingScreen, unreachable,
} from "./fixtures.ts";
import { MapsDrawn } from "./map-drawing.ts";

const none = () => undefined;
const unanswered = () => Promise.resolve(undefined);

export const meta: ComponentMeta<MapsScreenViewProps> = {
  args: {
    onClose: none, screen: idleScreen, guidance: undefined, plane: planeReady, saved: savedPlaces, eventReturn: noReturn, locator: locatorIdle,
    content: covered, aosp: false, now: Date.UTC(2026, 10, 20, 17), act: none, ask: unanswered,
  },
  examples: {
    Unreachable: { content: unreachable, plane: undefined, saved: [] },
    MapFailed: { plane: planeFailed },
    Searching: { screen: searchingScreen },
    Results: { screen: resultsScreen, content: resultsContent },
    NoResults: { screen: emptyResultsScreen },
    SearchFailed: { screen: failedResultsScreen },
    PlaceFromEvent: { screen: placeScreen, content: placeContent, eventReturn: fromEvent, aosp: true },
    GooglePlace: { screen: placeScreen, content: googlePlaceContent },
    Directions: { screen: directionsScreen, content: directionsContent },
    Guiding: { screen: directionsScreen, guidance: guiding, content: guidingContent },
    CreditsLocationDenied: { plane: planeCredits, locator: locationDenied },
  },
  decorator: (story) => <MapsDrawn value={false}>{story()}</MapsDrawn>,
};
