// spec/app/maps/navigation.md, "A fix moves guidance only when it is precise, fresh and close: arrival within 25 meters, a turn passed within 40 meters or after two fixes beyond 60, the route left beyond 75"

/** A point in whole millionths of a degree, as every Maps machine keeps one. */
export interface Point {
  readonly lat: number;
  readonly lng: number;
}

/** A route's shape and the points where its steps begin, as the shell keeps them beside the machine's summary. */
export interface Shape {
  readonly line: readonly Point[];
  readonly turns: readonly Point[];
}

const earth = 6_371_000;
const farAway = 1_000_000;
const radians = (micro: number) => (micro / 1e6) * (Math.PI / 180);

/** Wrap longitude in degrees into `[-180, 180]`, preserving `+180` and avoiding `-0`. @throws {never} */
export function normalizeLng(lng: number): number {
  if (!Number.isFinite(lng)) return 0;
  let wrapped = ((lng + 180) % 360 + 360) % 360 - 180;
  if (wrapped === -180 && lng > 0) wrapped = 180;
  return wrapped || 0;
}

/** Where `p` lies in meters east and north of `origin`, wrapping across the antimeridian. */
function local(origin: Point, p: Point): [number, number] {
  let dlng = p.lng - origin.lng;
  if (dlng > 180_000_000) dlng -= 360_000_000;
  else if (dlng < -180_000_000) dlng += 360_000_000;
  return [radians(dlng) * Math.cos(radians(origin.lat)) * earth, radians(p.lat - origin.lat) * earth];
}

/** The distance between two points, in whole meters. @throws {never} */
export function meters(a: Point, b: Point): number {
  const [x, y] = local(a, b);
  return Math.round(Math.hypot(x, y));
}

/** The distance from `p` to the segment `a`–`b`, and how far along it the nearest point lies, in meters. */
function toSegment(p: Point, a: Point, b: Point): { away: number; along: number } {
  const [bx, by] = local(a, b);
  const [px, py] = local(a, p);
  const length = Math.hypot(bx, by);
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / (length * length)));
  return { away: Math.hypot(px - t * bx, py - t * by), along: t * length };
}

/** The distance from `p` to the nearest point of `line`, in whole meters. @throws {never} */
export function toLine(p: Point, line: readonly Point[]): number {
  const first = line[0];
  if (first === undefined) return farAway;
  if (line.length === 1) return meters(p, first);
  let nearest = Number.POSITIVE_INFINITY;
  for (let at = 1; at < line.length; at++) {
    const start = line[at - 1];
    const end = line[at];
    if (start !== undefined && end !== undefined) nearest = Math.min(nearest, toSegment(p, start, end).away);
  }
  return Math.round(nearest);
}

/**
 * A fix measured against the step a session is on: the meters to the next turn, how far past the turn it stands
 * along the route, to the route and to its end. Each is a whole number of meters, as guidance.md's `Reading` holds.
 * @throws {never}
 */
export function measured(p: Point, shape: Shape, step: number): { toStep: number; beyond: number; toRoute: number; toEnd: number } {
  const end = shape.line.at(-1);
  if (end === undefined) return { toStep: farAway, beyond: 0, toRoute: farAway, toEnd: farAway };
  const prev = shape.turns[step];
  const ahead = shape.turns[step + 1] ?? end;
  const after = shape.turns[step + 2] ?? end;
  const nextLeg = toSegment(p, ahead, after);
  const onNextLeg = nextLeg.along > 0 && (prev === undefined || nextLeg.away <= toSegment(p, prev, ahead).away);
  return { toStep: meters(p, ahead), beyond: onNextLeg ? Math.round(nextLeg.along) : 0, toRoute: toLine(p, shape.line), toEnd: meters(p, end) };
}

/** `text` as a point when it reads `latitude, longitude` within the globe. @throws {never} */
export function pointIn(text: string): Point | undefined {
  const found = /^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*$/.exec(text);
  if (!found) return undefined;
  const [lat, lng] = [Number(found[1]), Number(found[2])];
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat: Math.round(lat * 1e6) || 0, lng: Math.round(lng * 1e6) || 0 };
}

/** A point as Cloud's coordinate, in degrees. @throws {never} */
export function coordinateOf(p: Point) {
  return { latitude: p.lat / 1e6, longitude: p.lng / 1e6 };
}

/** Cloud's coordinate as a point. @throws {never} */
export function pointOf(c: { readonly latitude: number; readonly longitude: number }): Point {
  const lat = Math.max(-90, Math.min(90, Number.isFinite(c.latitude) ? c.latitude : 0));
  const lng = normalizeLng(c.longitude);
  return { lat: Math.round(lat * 1e6) || 0, lng: Math.round(lng * 1e6) || 0 };
}

/** A point as degrees, as the map draws it. @throws {never} */
export function degreesOf(p: Point): { lat: number; lng: number } {
  return { lat: p.lat / 1e6, lng: p.lng / 1e6 };
}
