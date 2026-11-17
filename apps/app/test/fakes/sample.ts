// spec/app/sample/index.md, "Story: See and dismiss reminders"
import { type Route, feed } from "./routes.ts";

/** What the fake agent holds for Reminders, and how it behaves; a journey changes it between steps. */
export interface SampleScene {
  titles: string[];
  /** Every title a deletion was asked for, and those deleted. */
  readonly asked: string[];
  readonly deleted: string[];
  /** GET answers 503, as an agent that is starting does. */
  down: boolean;
  /** A deletion is taken and never answered, as when the phone dies before the agent replies. */
  stalled: boolean;
  /** The open feeds, each told every list the agent pushes. */
  readonly feeds: Set<(data: unknown) => void>;
}

export function sampleScene(): SampleScene {
  return { titles: ["Water the plants", "Call the bank"], asked: [], deleted: [], down: false, stalled: false, feeds: new Set() };
}

/** The agent pushes `titles` to every open feed. */
export function push(scene: SampleScene, titles: string[]) {
  scene.titles = titles;
  for (const send of scene.feeds) send({ titles });
}

export function sampleRoutes(scene: SampleScene): Route[] {
  return [
    (request, url) => {
      if (request.method !== "GET" || url.pathname !== "/api/reminders") return;
      return scene.down ? Response.json({ error: "starting" }, { status: 503 }) : Response.json({ titles: scene.titles });
    },
    (request, url) => {
      if (request.method !== "GET" || url.pathname !== "/api/reminders/feed") return;
      return feed((send) => {
        scene.feeds.add(send);
        return () => scene.feeds.delete(send);
      });
    },
    (request, url) => {
      if (request.method !== "DELETE" || url.pathname !== "/api/reminders") return;
      const title = url.searchParams.get("title") ?? "";
      scene.asked.push(title);
      if (scene.stalled) return new Promise<Response>(() => {});
      scene.deleted.push(title);
      scene.titles = scene.titles.filter((kept) => kept !== title);
      return new Response(null, { status: 204 });
    },
  ];
}
