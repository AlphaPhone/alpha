// spec/app/maps/guidance.md, "A fix guides only when it is usable, and only for the current session"

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
const radians = (micro: number) => (micro / 1e6) * (Math.PI / 180);

/** Where `p` lies in meters east and north of `origin`, flat over the short distances guidance measures. */
function local(origin: Point, p: Point): [number, number] {
  return [(radians(p.lng) - radians(origin.lng)) * Math.cos(radians(origin.lat)) * earth, (radians(p.lat) - radians(origin.lat)) * earth];
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
  let nearest = Number.POSITIVE_INFINITY;
  for (let at = 1; at < line.length; at++) nearest = Math.min(nearest, toSegment(p, line[at - 1]!, line[at]!).away);
  return Math.round(line.length === 1 ? meters(p, line[0]!) : nearest);
}

/**
 * A fix measured against the step a session is on: the meters to the next turn, how far past the turn it stands
 * along the route, to the route and to its end. Each is a whole number of meters, as guidance.md's `Reading` holds.
 * @throws {never}
 */
export function measured(p: Point, shape: Shape, step: number): { toStep: number; beyond: number; toRoute: number; toEnd: number } {
  const end = shape.line.at(-1) ?? p;
  const ahead = shape.turns[step + 1] ?? end;
  const after = shape.turns[step + 2] ?? end;
  const passed = meters(p, after) < meters(ahead, after);
  return { toStep: meters(p, ahead), beyond: passed ? meters(p, ahead) : 0, toRoute: toLine(p, shape.line), toEnd: meters(p, end) };
}

/** `text` as a point when it reads `latitude, longitude` within the globe. @throws {never} */
export function pointIn(text: string): Point | undefined {
  const found = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(text);
  if (!found) return undefined;
  const [lat, lng] = [Number(found[1]), Number(found[2])];
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat: Math.round(lat * 1e6), lng: Math.round(lng * 1e6) };
}

/** A point as Cloud's coordinate, in degrees. @throws {never} */
export function coordinateOf(p: Point) {
  return { latitude: p.lat / 1e6, longitude: p.lng / 1e6 };
}

/** Cloud's coordinate as a point. @throws {never} */
export function pointOf(c: { readonly latitude: number; readonly longitude: number }): Point {
  return { lat: Math.round(c.latitude * 1e6), lng: Math.round(c.longitude * 1e6) };
}
