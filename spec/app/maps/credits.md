# The map's credits and camera

What the map surface of the [connection](./connection.md) shows beside its
tiles: the copyright of the view the owner looks at, the credits panel, the
compass and where the camera goes. Each surface the connection draws starts
with no copyright; the answer for an older surface or view shows nothing.
On Google's map the Google Maps badge is the only credit; tapping it opens
the full copyright of the view and who receives searches and route points.
Other maps keep their credit links and an information button.

## Story: See the map for what I am looking at

> As the owner, I want the map to draw what I look at, recover when drawing
> fails, and turn and move only as I ask, without an old surface's news.

### The credits hold the surface they belong to, the view the camera settled on, the copyright asked and shown, and whether the panel is open

`view` counts the settled camera moves that left the area the shown
copyright covers; `pending` is the copyright request on its way, for
`requestedView`. Only a raster map has a copyright to ask.

```quint
type Effect = Copyright({ token: int })
type Credits = {
  plane: int, raster: bool, drawn: bool, view: int, nextToken: int, pending: int, requestedView: int, shownView: int,
  copyrightShown: bool, copyrightFailed: bool, infoOpen: bool, copyright: str,
}
type Moved = { state: Credits, out: List[Effect] }

pure val initial: Credits = {
  plane: 0, raster: false, drawn: false, view: 0, nextToken: 1, pending: 0, requestedView: -1, shownView: -1,
  copyrightShown: false, copyrightFailed: false, infoOpen: false, copyright: "",
}

pure val planeValues = Set(1, 2, 3)
pure val tokenValues = Set(1, 2, 3)
pure val textValues = Set("", "Map data ©2026 Google")
```

### A new surface starts with no copyright and the panel closed

```quint
pure def canDrawnOn(s: Credits, plane: int, raster: bool): bool = plane > s.plane

pure def drawnOn(s: Credits, plane: int, raster: bool): Credits =
  { ...s, plane: plane, raster: raster, drawn: false, pending: 0, requestedView: -1, shownView: -1,
    copyrightShown: false, copyrightFailed: false, infoOpen: false, copyright: "" }
```

### A failed tile never breaks a surface whose style has loaded, and a cancelled tile breaks nothing

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
pure def canCameraSettled(s: Credits, covered: bool): bool = s.plane > 0

pure def cameraSettled(s: Credits, covered: bool): Moved = {
  val away: Credits = { ...s, view: s.view + 1, pending: 0, copyrightShown: false, shownView: -1, copyrightFailed: false, copyright: "" }
  if (covered and s.copyrightShown) { state: s, out: List() }
  else if (s.raster)
    { state: { ...away, pending: s.nextToken, nextToken: s.nextToken + 1, requestedView: away.view }, out: List(Copyright({ token: s.nextToken })) }
  else { state: away, out: List() }
}

pure def stepNoCopyrightIsAskedWithinTheCoveredArea(before: Credits, via: str, after: Credits, out: List[Effect]): bool =
  (via == "cameraSettled" and before.copyrightShown and after.view == before.view) implies out == List()
```

### Only the answer to the latest copyright request, for the view in place, is shown, and a failed one never breaks the map

A failed answer leaves the standing attribution in the credits panel.

```quint
pure def canCopyrightAnswered(s: Credits, token: int, success: bool, text: str): bool = token > 0 and token < s.nextToken

pure def copyrightAnswered(s: Credits, token: int, success: bool, text: str): Credits =
  if (token == s.pending)
    { ...s, pending: 0, shownView: if (success) s.requestedView else -1, copyrightShown: success, copyrightFailed: not(success), copyright: if (success) text else "" }
  else s

pure def alwaysAPendingRequestIsForTheView(s: Credits): bool = s.pending > 0 implies (s.requestedView == s.view and s.raster and s.pending < s.nextToken)

pure def alwaysTheShownCopyrightMatchesTheView(s: Credits): bool =
  s.copyrightShown implies (s.plane > 0 and not(s.copyrightFailed) and s.pending == 0 and s.shownView == s.view)

pure def alwaysACopyrightIsShownOnlyForTheView(s: Credits): bool = s.copyright != "" implies s.copyrightShown

pure def stepTheCopyrightStaysOnItsSurface(before: Credits, via: str, after: Credits): bool =
  (via == "copyrightAnswered" or via == "cameraSettled") implies (after.plane == before.plane and after.raster == before.raster)

pure def sometimesCopyrightShown(s: Credits): bool = s.copyrightShown and s.view > 1

pure def sometimesRecoveredAfterAFailure(s: Credits): bool = s.copyrightShown and s.nextToken > 2
```

### The credits panel opens from the badge or the information button of a drawn surface

A surface that is still drawing or could not be drawn offers neither. On a
portrait screen the credits, My location and the sheets beneath them
end above Ask Alpha's bar, so a taller composer never covers them; in
guidance, Recenter sits in the guidance bar at the top. Back closes an
open panel before it leaves anything else of Maps.

```quint
pure def canPlaneDrawn(s: Credits, plane: int): bool = plane == s.plane and plane > 0 and not(s.drawn)

pure def planeDrawn(s: Credits, plane: int): Credits = { ...s, drawn: true }

pure def canOpenInfo(s: Credits): bool = s.plane > 0 and s.drawn and not(s.infoOpen)

pure def openInfo(s: Credits): Credits = { ...s, infoOpen: true }

pure def canCloseInfo(s: Credits): bool = s.infoOpen

pure def closeInfo(s: Credits): Credits = { ...s, infoOpen: false }

pure def alwaysTheInfoNeedsASurface(s: Credits): bool = s.infoOpen implies (s.plane > 0 and s.drawn)
```
