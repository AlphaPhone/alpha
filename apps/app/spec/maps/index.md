# Maps

Maps is Alpha's own map screen over Eliza Cloud Maps, served by Google Maps
Platform in production (PRD AP-10, P-64). The owner searches places, opens a
place, plans a route with alternatives, and starts turn-by-turn guidance
themselves; guidance continues with the screen off only for the session the
owner started. The agent may show a place, prepare a route and read what the
screen shows, never start guidance. Google content follows Google's
attribution and caching terms: the Google Maps badge is the only credit on a
Google map, no Google place is saved on the phone, and no tile or provider
detail outlives the screen.

The rules here are what the renderer must do. Geometry (distances, route
projection) is measured by the shell and enters the models as whole meters and
milliseconds.

| Area | Specifications |
| --- | --- |
| Vocabulary | [Travel modes, fix quality, guidance thresholds, Google terms](./vocabulary.md) |
| Provider | [Cloud Maps connection, account binding and request pause](./connection.md) |
| Screen | [Search, place, directions, origin and route choice](./screen.md), [map plane and credits](./plane.md), [saved places](./savedPlaces.md) |
| Location | [Location custody, one-shot and continuous fixes](./location.md); the network position when GPS has no fix and the phone location sent with chat are the assistant's [turn context](../assistant/context.md) |
| Guidance | [Turn-by-turn guidance, reroute and screen-off service](./guidance.md); voice follows `@elizaos/plugin-maps` guidance speech |
| Agent | [Bringing Maps forward and device navigation](./agentSurface.md), [selected read and context](./selectedRead.md), [relay delivery and redelivery](./delivery.md) |
| Hand-offs | [Chat cards and share choices](./cards.md), [return to a Calendar event](./eventReturn.md), [notification open](./notificationOpen.md) |
