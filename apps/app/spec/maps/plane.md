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
pure val resultValues = Set(PlaneReady, PlaneFailed)
```

## Story: See the map for what I am looking at

> As the owner, I want the map to draw the provider's tiles for the place I
> look at, and to recover when drawing fails, without an old plane's report
> changing what I see.

### Google content is drawn only on the Google raster, and other content on the world or open raster

```quint
pure def basemapFor(kind: ProviderKind, raster: bool, googleContent: bool): Basemap =
  if (kind == GoogleProvider and raster) GoogleRaster
  else if (googleContent) NoBasemap
  else if (kind == OpenProvider and raster) OpenRaster
  else WorldMap
pure def creditsFor(basemap: Basemap): Credits = if (basemap == GoogleRaster) BadgeOnly else CreditLinks
pure def lawGoogleContentNeverOnTheWorldMap(kind: ProviderKind, raster: bool): bool =
  basemapFor(kind, raster, true) == GoogleRaster or basemapFor(kind, raster, true) == NoBasemap
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
pure def canPlaneReports(s: MapPlane, owner: int, result: PlaneState): bool = s.built and owner == s.generation and result != PlaneLoading
pure def planeReports(s: MapPlane, owner: int, result: PlaneState): MapPlane = { ...s, state: result }
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

### A failed tile never fails a plane whose style has loaded, and a cancelled tile fails nothing

Tiles draw as they arrive. Once the plane's style has loaded, a tile the provider refused or could
not send leaves the rest of the map in place and is asked again when it is next in view; a tile
MapLibre stopped asking for is cancelled, and its request with it. Only an error before the style
loaded, or one that is not a tile's, fails the plane and offers Retry. The plane never zooms out
below the provider's least zoom or in past its greatest, so it never asks for a tile the provider
does not serve.

```quint
pure def failsThePlane(styleLoaded: bool, tileError: bool, cancelled: bool): bool =
  not(cancelled) and not(tileError and styleLoaded)
pure def lawATileNeverFailsALoadedPlane(cancelled: bool): bool = not(failsThePlane(true, true, cancelled))
pure def lawACancelFailsNothing(styleLoaded: bool, tileError: bool): bool = not(failsThePlane(styleLoaded, tileError, true))
pure def zoomServed(zoom: int, minZoom: int, maxZoom: int): bool = zoom >= minZoom and zoom <= maxZoom
```

### Tiles in flight are bounded by the native request pool, and a cancelled tile gives its place back

A tile is fetched through the Cloud client over the phone's native Cloud plugin, whose pool runs at
most four requests at once; the rest wait their turn. A tile MapLibre stops asking for is cancelled
with its request, so it never holds a place in the pool. Raising the pool to the previous Alpha's
sixteen is a change to the upstream plugin.

```quint
pure val tileWorkers = 4
pure def tilesRunning(wanted: int, dropped: int): int = {
  val live = if (wanted > dropped) wanted - dropped else 0
  if (live < tileWorkers) live else tileWorkers
}
pure val wantedValues = Set(0, 3, 4, 16)
pure val droppedValues = Set(0, 1, 16)
pure def lawTilesRunAtMostThePool(wanted: int, dropped: int): bool =
  tilesRunning(wanted, dropped) >= 0 and tilesRunning(wanted, dropped) <= tileWorkers
pure def lawACancelledTileHoldsNoPlace(wanted: int): bool = tilesRunning(wanted, wanted) == 0
```

### The camera goes to what the owner picked, on every map

Every map Alpha draws, the world map and the Cloud rasters alike, covers the world, so the camera
treats them alike. Guidance following the phone owns the camera. Otherwise a new route is fitted
into view up to street zoom (17); a newly picked place is centred at zoom 14 above the sheets; and
a new set of result pins, with no place picked and no route, is fitted into view up to zoom 14.
Leaving guidance turns the map north up again. Anything else keeps the camera where the owner left it.

```quint
type CameraAim = KeepCamera | CenterOnPlace | FitResults | FitRoute | FollowPhone
pure val placeZoom = 14
pure val resultsMaxZoom = 14
pure val routeMaxZoom = 17
pure def cameraAim(following: bool, routed: bool, newRoute: bool, selected: bool, newSelection: bool, newPins: bool, pins: int): CameraAim =
  if (following) FollowPhone
  else if (routed) (if (newRoute) FitRoute else KeepCamera)
  else if (selected) (if (newSelection) CenterOnPlace else KeepCamera)
  else if (newPins and pins >= 1) FitResults
  else KeepCamera
pure def northUpAfterGuidance(wasFollowing: bool, following: bool): bool = wasFollowing and not(following)
pure val pinsValues = Set(0, 1, 2)
pure def lawFollowingOwnsTheCamera(routed: bool, newRoute: bool, selected: bool, newSelection: bool, newPins: bool, pins: int): bool =
  cameraAim(true, routed, newRoute, selected, newSelection, newPins, pins) == FollowPhone
pure def lawANewPlaceIsCentred(newPins: bool, pins: int): bool = cameraAim(false, false, false, true, true, newPins, pins) == CenterOnPlace
pure def lawNewResultsAreFitted(pins: int): bool = pins >= 1 implies cameraAim(false, false, false, false, false, true, pins) == FitResults
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

On a portrait screen the credits, My location and the sheets beneath them end
above the assistant dock's measured footprint (`--alpha-dock-clearance`), so a
taller composer never covers them; in guidance, Recenter sits in the guidance
bar at the top.

```quint
pure def canOpenInfo(s: MapPlane): bool = s.built and not(s.infoOpen)
pure def openInfo(s: MapPlane): MapPlane = { ...s, infoOpen: true }
pure def canCloseInfo(s: MapPlane): bool = s.infoOpen
pure def closeInfo(s: MapPlane): MapPlane = { ...s, infoOpen: false }
pure def alwaysInfoNeedsAPlane(s: MapPlane): bool = s.infoOpen implies s.built
```
