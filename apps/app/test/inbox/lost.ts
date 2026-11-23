// A fake Cloud route whose answer is lost after the route already acted: the fake Cloud answers a
// route that throws with HTTP 500, so a dispatch can land and its answer never arrive.

/**
 * `route`, run in full, then its answer lost when `lose()` says so.
 * @throws {never}
 */
export function losingAnswer<A>(route: (body: unknown) => A, lose: () => boolean): (body: unknown) => A {
  return (body) => {
    const answer = route(body);
    if (lose()) throw new Error("connection reset");
    return answer;
  };
}
