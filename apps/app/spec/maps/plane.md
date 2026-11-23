# Map plane and credits

The map is drawn by one MapLibre plane per mounted element and basemap. Every
callback of a plane belongs to the generation it was built under; a plane
that was retired reports nothing. Google content is drawn only on the Google
raster served through Cloud: it never falls back to the world map, and with
no raster the screen says the Google map is missing. On a Google map the
Google Maps badge is the only credit; tapping it opens the full viewport
copyright, who receives searches and route points, and Enter coordinates.
Other maps keep their credit links and an information button.

## Domain

### A plane is built for an element and basemap, and holds the copyright of the view it shows

`view` counts settled camera moves that left the area the shown copyright
covers. `pending` is the copyright request in flight, for `requestedView`.

```quint
import vocabulary.* from "./vocabulary"

type Basemap = NoBasemap | WorldMap | GoogleRaster | OpenRaster
type PlaneState = PlaneLoading | PlaneReady | PlaneFailed
type Credits = BadgeOnly | CreditLinks
type MapPlane = {
  generation: int, element: int, basemap: Basemap, built: bool, state: PlaneState, retries: int,
  view: int, nextToken: int, pending: int, requestedView: int, shownView: int, copyrightShown: bool, copyrightFailed: bool, infoOpen: bool,
}
pure val initial: MapPlane = {
  generation: 0, element: 0, basemap: NoBasemap, built: false, state: PlaneLoading, retries: 0,
  view: 0, nextToken: 1, pending: 0, requestedView: -1, shownView: -1, copyrightShown: false, copyrightFailed: false, infoOpen: false,
}
pure def rasterBasemap(basemap: Basemap): bool = basemap == GoogleRaster or basemap == OpenRaster
pure def retiredPlane(element: int, s: MapPlane): MapPlane = {
  ...s, generation: s.generation + 1, element: element, built: false, state: PlaneLoading,
  pending: 0, requestedView: -1, shownView: -1, copyrightShown: false, copyrightFailed: false, infoOpen: false,
}
pure val elementValues = Set(0, 1, 2)
pure val ownerValues = Set(0, 1, 2, 3)
pure val tokenValues = Set(1, 2, 3)
pure val outcomeValues = Set(PlaneReady, PlaneFailed)
```

## Story: See the map for what I am looking at

> As the owner, I want the map to draw the provider's tiles for the place I
> look at, and to recover when drawing fails, without an old plane's report
> changing what I see.

### Google content is drawn only on the Google raster, and other content on the world or open raster

```quint
pure def basemapFor(kind: ProviderKind, map: bool, googleContent: bool): Basemap =
  if (kind == GoogleProvider and map) GoogleRaster
  else if (googleContent) NoBasemap
  else if (kind == OpenProvider and map) OpenRaster
  else WorldMap
pure def creditsFor(basemap: Basemap): Credits = if (basemap == GoogleRaster) BadgeOnly else CreditLinks
pure def lawGoogleContentNeverOnTheWorldMap(kind: ProviderKind, map: bool): bool =
  basemapFor(kind, map, true) == GoogleRaster or basemapFor(kind, map, true) == NoBasemap
pure def lawGoogleMapShowsOnlyTheBadge(kind: ProviderKind): bool = creditsFor(basemapFor(kind, true, false)) == BadgeOnly iff kind == GoogleProvider
```

### A plane is rebuilt only when its element or basemap changes, and reports only for its own generation

Retry drops the failed plane and builds a new one. Leaving Maps, hiding it or
a provider change releases the plane.

```quint
pure def canMountPlane(s: MapPlane, element: int, basemap: Basemap): bool = element > 0 and basemap != NoBasemap
pure def mountPlane(s: MapPlane, element: int, basemap: Basemap): MapPlane =
  if (s.built and element == s.element and basemap == s.basemap) s
  else { ...retiredPlane(element, s), basemap: basemap, built: true }
pure def canPlaneReports(s: MapPlane, owner: int, outcome: PlaneState): bool = s.built and owner == s.generation and outcome != PlaneLoading
pure def planeReports(s: MapPlane, owner: int, outcome: PlaneState): MapPlane = { ...s, state: outcome }
pure def canRetryMap(s: MapPlane): bool = s.built and s.state == PlaneFailed
pure def retryMap(s: MapPlane): MapPlane = { ...retiredPlane(s.element, s), basemap: s.basemap, built: true, retries: s.retries + 1 }
pure def canReleasePlane(s: MapPlane): bool = s.built or s.element > 0
pure def releasePlane(s: MapPlane): MapPlane = { ...retiredPlane(0, s), basemap: NoBasemap }
pure def alwaysABuiltPlaneHasItsMount(s: MapPlane): bool = s.built implies s.element > 0 and s.basemap != NoBasemap
pure def stepOnlyTheCurrentPlaneReports(before: MapPlane, via: str, after: MapPlane): bool =
  (via == "planeReports" and after.state != before.state) implies after.generation == before.generation
pure def sometimesRetriedAndReady(s: MapPlane): bool = s.retries >= 1 and s.state == PlaneReady
```

### The compass shows only while the map is turned or tilted and guidance is not following, and puts north up

Bearing and pitch are whole degrees, measured as the map turns. Tapping the
compass turns the map north up and flat, and focus moves to the map.

```quint
pure def turned(bearing: int, pitch: int): bool = bearing >= 1 or bearing <= -1 or pitch >= 1
pure def compassShown(bearing: int, pitch: int, following: bool): bool = turned(bearing, pitch) and not(following)
pure val bearingValues = Set(-90, -1, 0, 1, 90)
pure val pitchValues = Set(0, 1, 30)
pure def lawANorthUpMapHasNoCompass(following: bool): bool = not(compassShown(0, 0, following))
pure def lawFollowingHidesTheCompass(bearing: int, pitch: int): bool = not(compassShown(bearing, pitch, true))
```

## Story: Show the right copyright for the map I am looking at

> As the owner, I want the credits on the map to belong to the area I look
> at, never to an area I moved away from, and the map never to wait for them.

### Only the reply to the latest copyright request, for the view in place, is shown, and a failed one never fails the map

Tiles draw as they arrive; the copyright is asked once the camera settles,
for the view and one view of margin on each side. Moving outside the covered
area hides the shown copyright and forgets the request; within it, nothing
changes. A failed reply leaves the standing attribution in the badge panel.

```quint
pure def canMoveView(s: MapPlane): bool = s.built
pure def moveView(s: MapPlane): MapPlane = { ...s, view: s.view + 1, pending: 0, copyrightShown: false, shownView: -1 }
pure def canRequestCopyright(s: MapPlane): bool = s.built and rasterBasemap(s.basemap)
pure def requestCopyright(s: MapPlane): MapPlane =
  { ...s, pending: s.nextToken, nextToken: s.nextToken + 1, requestedView: s.view, copyrightShown: false, shownView: -1 }
pure def canCopyrightReply(s: MapPlane, token: int, success: bool): bool = token > 0 and token < s.nextToken
pure def copyrightReply(s: MapPlane, token: int, success: bool): MapPlane =
  if (s.built and token == s.pending)
    { ...s, pending: 0, shownView: if (success) s.requestedView else -1, copyrightShown: success, copyrightFailed: not(success) }
  else s
pure def alwaysAPendingRequestIsForTheView(s: MapPlane): bool = s.pending > 0 implies s.requestedView == s.view and s.built
pure def alwaysTheShownCopyrightMatchesTheView(s: MapPlane): bool =
  s.copyrightShown implies s.built and not(s.copyrightFailed) and s.pending == 0 and s.shownView == s.view
pure def stepCopyrightNeverFailsTheMap(before: MapPlane, via: str, after: MapPlane): bool =
  (via == "copyrightReply" or via == "requestCopyright" or via == "moveView") implies after.state == before.state
pure def sometimesCopyrightShown(s: MapPlane): bool = s.copyrightShown and s.view > 0 and s.basemap == GoogleRaster
pure def sometimesRecoveredAfterFailure(s: MapPlane): bool = s.copyrightShown and s.nextToken > 2
```

### The credits panel opens from the badge or the information button of a built plane

```quint
pure def canOpenInfo(s: MapPlane): bool = s.built and not(s.infoOpen)
pure def openInfo(s: MapPlane): MapPlane = { ...s, infoOpen: true }
pure def canCloseInfo(s: MapPlane): bool = s.infoOpen
pure def closeInfo(s: MapPlane): MapPlane = { ...s, infoOpen: false }
pure def alwaysInfoNeedsAPlane(s: MapPlane): bool = s.infoOpen implies s.built
```
