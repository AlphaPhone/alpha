# The map and its credits

The map [Maps](./index.md) draws: one plane per element and basemap, built
for what the owner looks at, and the credits that belong to it. Every report
of a plane belongs to the generation it was built under; a plane that was
retired reports nothing. Google content is drawn only on the Google raster
served through Cloud, never on the world map, and with no raster the screen
says the Google map is missing. On a Google map the Google Maps badge is the
only credit; tapping it opens the full copyright of the view and who
receives searches and route points, with no prompt for coordinates. Other
maps keep their credit links and an information button.

## Story: See the map for what I am looking at

> As the owner, I want the map to draw the provider's tiles for the place I
> look at, and to recover when drawing fails, without an old plane's report
> changing what I see.

### A plane is built for an element and a basemap, and holds the copyright of the view it shows

`view` counts the settled camera moves that left the area the shown
copyright covers; `pending` is the copyright request on its way, for
`requestedView`.

```quint
import vocabulary.* from "./vocabulary"

type Basemap = NoBasemap | WorldMap | GoogleRaster | OpenRaster
type Look = Drawing | Drawn | Broken
type Credits = BadgeOnly | CreditLinks
type Plane = {
  generation: int, element: int, basemap: Basemap, built: bool, drawn: Look, retries: int,
  view: int, nextToken: int, pending: int, requestedView: int, shownView: int, copyrightShown: bool, copyrightFailed: bool, infoOpen: bool,
  copyright: str,
}
type Effect = Copyright({ token: int })
type Moved = { state: Plane, out: List[Effect] }

pure val initial: Plane = {
  generation: 0, element: 0, basemap: NoBasemap, built: false, drawn: Drawing, retries: 0,
  view: 0, nextToken: 1, pending: 0, requestedView: -1, shownView: -1, copyrightShown: false, copyrightFailed: false, infoOpen: false,
  copyright: "",
}

pure def rasterBasemap(basemap: Basemap): bool = basemap == GoogleRaster or basemap == OpenRaster

pure def retiredPlane(element: int, s: Plane): Plane = {
  ...s, generation: s.generation + 1, element: element, built: false, drawn: Drawing,
  pending: 0, requestedView: -1, shownView: -1, copyrightShown: false, copyrightFailed: false, infoOpen: false, copyright: "",
}

pure val elementValues = Set(0, 1, 2)
pure val ownerValues = Set(0, 1, 2, 3)
pure val tokenValues = Set(1, 2, 3)
pure val resultValues = Set(Drawn, Broken)
```

### Google content is drawn only on the Google raster, other content on the world map or the open raster, and a Google map credits only the badge

```quint
pure def basemapFor(kind: ProviderKind, raster: bool, googleContent: bool): Basemap =
  if (kind == GoogleProvider and raster) GoogleRaster
  else if (googleContent) NoBasemap
  else if (kind == OpenProvider and raster) OpenRaster
  else WorldMap

pure def creditsFor(basemap: Basemap): Credits = if (basemap == GoogleRaster) BadgeOnly else CreditLinks

pure def lawGoogleContentIsNeverOnTheWorldMap(kind: ProviderKind, raster: bool): bool =
  basemapFor(kind, raster, true) == GoogleRaster or basemapFor(kind, raster, true) == NoBasemap

pure def lawAGoogleMapShowsOnlyTheBadge(kind: ProviderKind): bool =
  (creditsFor(basemapFor(kind, true, false)) == BadgeOnly) iff (kind == GoogleProvider)
```

### A plane is built again only when its element or basemap changes, and reports only for its own generation

Retry drops the broken plane and builds a new one. Leaving Maps, hiding it
or a change of provider releases the plane.

```quint
pure def canMountPlane(s: Plane, element: int, basemap: Basemap): bool = element > 0 and basemap != NoBasemap

pure def mountPlane(s: Plane, element: int, basemap: Basemap): Plane =
  if (s.built and element == s.element and basemap == s.basemap) s
  else { ...retiredPlane(element, s), basemap: basemap, built: true }

pure def canPlaneReports(s: Plane, owner: int, result: Look): bool = s.built and owner == s.generation and result != Drawing

pure def planeReports(s: Plane, owner: int, result: Look): Plane = { ...s, drawn: result }

pure def canRetryMap(s: Plane): bool = s.built and s.drawn == Broken

pure def retryMap(s: Plane): Plane = { ...retiredPlane(s.element, s), basemap: s.basemap, built: true, retries: s.retries + 1 }

pure def canReleasePlane(s: Plane): bool = s.built or s.element > 0

pure def releasePlane(s: Plane): Plane = { ...retiredPlane(0, s), basemap: NoBasemap }

pure def alwaysABuiltPlaneHasItsMount(s: Plane): bool = s.built implies (s.element > 0 and s.basemap != NoBasemap)

pure def stepOnlyTheCurrentPlaneReports(before: Plane, via: str, after: Plane): bool =
  (via == "planeReports" and after.drawn != before.drawn) implies after.generation == before.generation

pure def sometimesRetriedAndDrawn(s: Plane): bool = s.retries >= 1 and s.drawn == Drawn
```

### A failed tile never breaks a plane whose style has loaded, and a cancelled tile breaks nothing

Tiles draw as they arrive. Once the style has loaded, a tile the provider
refused or could not send leaves the rest of the map in place and is asked
again when it is next in view; a tile no longer in view is cancelled, and
its request with it. Only an error before the style loaded, or one that is
not a tile's, breaks the plane and offers Retry. The plane never zooms
outside the provider's least and greatest zoom, so it never asks for a tile
the provider does not serve.

```quint
pure def breaksThePlane(styleLoaded: bool, tileError: bool, cancelled: bool): bool =
  not(cancelled) and not(tileError and styleLoaded)

pure def lawATileNeverBreaksALoadedPlane(cancelled: bool): bool = not(breaksThePlane(true, true, cancelled))

pure def lawACancelBreaksNothing(styleLoaded: bool, tileError: bool): bool = not(breaksThePlane(styleLoaded, tileError, true))

pure def zoomServed(zoom: int, minZoom: int, maxZoom: int): bool = zoom >= minZoom and zoom <= maxZoom

pure def clampedZoom(zoom: int, minZoom: int, maxZoom: int): int = if (zoom < minZoom) minZoom else if (zoom > maxZoom) maxZoom else zoom

pure val zoomValues = Set(-1, 0, 3, 22, 23)
pure val minZoomValues = Set(0, 3)
pure val maxZoomValues = Set(19, 22)

pure def lawTheZoomIsAlwaysServed(zoom: int, minZoom: int, maxZoom: int): bool =
  minZoom <= maxZoom implies zoomServed(clampedZoom(zoom, minZoom, maxZoom), minZoom, maxZoom)
```

### The compass shows only while the map is turned or tilted and guidance is not following, and puts north up

Bearing and pitch are whole degrees. Tapping the compass turns the map north
up and flat, and focus moves to the map.

```quint
pure def turned(bearing: int, pitch: int): bool = bearing >= 1 or bearing <= -1 or pitch >= 1

pure def compassShown(bearing: int, pitch: int, following: bool): bool = turned(bearing, pitch) and not(following)

pure val bearingValues = Set(-90, -1, 0, 1, 90)
pure val pitchValues = Set(0, 1, 30)

pure def lawANorthUpMapHasNoCompass(following: bool): bool = not(compassShown(0, 0, following))

pure def lawFollowingHidesTheCompass(bearing: int, pitch: int): bool = not(compassShown(bearing, pitch, true))
```

### The camera goes to what the owner picked, on every map

Every map Alpha draws, the world map and the Cloud rasters alike, covers the
world, so the camera treats them alike. Guidance following the phone owns
the camera. Otherwise a new route is fitted into view up to street zoom
(17); a newly picked place is centred at zoom 14 above the sheets; and a new
set of result pins, with no place picked and no route, is fitted into view
up to zoom 14. Leaving guidance turns the map north up again. Anything else
keeps the camera where the owner left it.

```quint
type Aim = KeepCamera | CenterOnPlace | FitResults | FitRoute | FollowPhone

pure val placeZoom = 14
pure val resultsMaxZoom = 14
pure val routeMaxZoom = 17

pure def cameraAim(following: bool, routed: bool, newRoute: bool, selected: bool, newSelection: bool, newPins: bool, pins: int): Aim =
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

### When the camera settles outside the area the shown copyright covers, the copyright is asked for that view, and within it nothing changes

The copyright is asked for the view with one view of margin on each side,
and only of a raster. Moving outside the covered area hides the shown
copyright and forgets the request before.

```quint
pure def canCameraSettled(s: Plane, covered: bool): bool = s.built

pure def cameraSettled(s: Plane, covered: bool): Moved = {
  val away: Plane = { ...s, view: s.view + 1, pending: 0, copyrightShown: false, shownView: -1, copyrightFailed: false, copyright: "" }
  if (covered and s.copyrightShown) { state: s, out: List() }
  else if (rasterBasemap(s.basemap))
    { state: { ...away, pending: s.nextToken, nextToken: s.nextToken + 1, requestedView: away.view }, out: List(Copyright({ token: s.nextToken })) }
  else { state: away, out: List() }
}

pure def stepNoCopyrightIsAskedWithinTheCoveredArea(before: Plane, via: str, after: Plane, out: List[Effect]): bool =
  (via == "cameraSettled" and before.copyrightShown and after.view == before.view) implies out == List()
```

### Only the answer to the latest copyright request, for the view in place, is shown, and a failed one never breaks the map

A failed answer leaves the standing attribution in the credits panel.

```quint
pure def canCopyrightAnswered(s: Plane, token: int, success: bool, text: str): bool = token > 0 and token < s.nextToken

pure def copyrightAnswered(s: Plane, token: int, success: bool, text: str): Plane =
  if (s.built and token == s.pending)
    { ...s, pending: 0, shownView: if (success) s.requestedView else -1, copyrightShown: success, copyrightFailed: not(success), copyright: if (success) text else "" }
  else s

pure val textValues = Set("", "Map data ©2026 Google")

pure def alwaysAPendingRequestIsForTheView(s: Plane): bool = s.pending > 0 implies (s.requestedView == s.view and s.built and s.pending < s.nextToken)

pure def alwaysTheShownCopyrightMatchesTheView(s: Plane): bool =
  s.copyrightShown implies (s.built and not(s.copyrightFailed) and s.pending == 0 and s.shownView == s.view)

pure def alwaysACopyrightIsShownOnlyForTheView(s: Plane): bool = s.copyright != "" implies s.copyrightShown

pure def stepTheCopyrightNeverBreaksTheMap(before: Plane, via: str, after: Plane): bool =
  (via == "copyrightAnswered" or via == "cameraSettled") implies after.drawn == before.drawn

pure def sometimesCopyrightShown(s: Plane): bool = s.copyrightShown and s.view > 1 and s.basemap == GoogleRaster

pure def sometimesRecoveredAfterAFailure(s: Plane): bool = s.copyrightShown and s.nextToken > 2
```

### The credits panel opens from the badge or the information button of a built plane

On a portrait screen the credits, My location and the sheets beneath them
end above Ask Alpha's bar, so a taller composer never covers them; in
guidance, Recenter sits in the guidance bar at the top.

```quint
pure def canOpenInfo(s: Plane): bool = s.built and not(s.infoOpen)

pure def openInfo(s: Plane): Plane = { ...s, infoOpen: true }

pure def canCloseInfo(s: Plane): bool = s.infoOpen

pure def closeInfo(s: Plane): Plane = { ...s, infoOpen: false }

pure def alwaysTheInfoNeedsAPlane(s: Plane): bool = s.infoOpen implies s.built
```
