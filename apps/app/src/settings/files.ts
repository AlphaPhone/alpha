// spec/settings/diagnostics.md, "One export runs at a time, and it is shared only when Android's chooser opened"; spec/settings/diagnostics.md, "The notices load once from the app itself, never from a remote source"; spec/settings/appearance.md, "The system's scheme and another tab's saved choice are followed as they change"; spec/settings/facts.md, "In a browser, each permission is the browser's own answer"
import { Effect, Queue, Stream } from "effect";

/** The licence notices the build ships beside the page. */
export async function shippedNotices(): Promise<unknown> {
  const response = await fetch("licenses/third-party-notices.json", { cache: "no-cache" });
  if (!response.ok) throw new Error("License notices unavailable");
  return response.json();
}

/** Save `text` as a JSON file in a browser build. */
export function saveFile(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  queueMicrotask(() => URL.revokeObjectURL(url));
}

function scheme(): MediaQueryList | undefined {
  return typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : undefined;
}

/** Whether the system scheme is dark now; an unreadable scheme is light. @throws {never} */
export function systemDark(): boolean {
  return scheme()?.matches === true;
}

/** Each change of the system scheme, as whether it is now dark. */
export function schemeChanges(): Stream.Stream<boolean> {
  return Stream.callback<boolean>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const query = scheme();
        const listener = () => { Queue.offerUnsafe(queue, query?.matches === true); };
        query?.addEventListener("change", listener);
        return () => query?.removeEventListener("change", listener);
      }),
      (stop) => Effect.sync(stop),
    ),
  );
}

/** Each time another tab changed `key` (or cleared storage), or the page was shown again. */
export function savedElsewhere(key: string): Stream.Stream<void> {
  return Stream.callback<void>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const stored = (event: StorageEvent) => { if (event.key === key || event.key === null) Queue.offerUnsafe(queue, undefined); };
        const shown = () => { Queue.offerUnsafe(queue, undefined); };
        window.addEventListener("storage", stored);
        window.addEventListener("pageshow", shown);
        return () => { window.removeEventListener("storage", stored); window.removeEventListener("pageshow", shown); };
      }),
      (stop) => Effect.sync(stop),
    ),
  );
}

/** The `theme` query of the page, the preview a build with test mocks starts on. @throws {never} */
export function themeQuery(): "light" | "dark" | undefined {
  const value = typeof location === "object" ? new URLSearchParams(location.search).get("theme") : null;
  return value === "light" || value === "dark" ? value : undefined;
}

/** The browser's permission answers, by name; a name it does not answer is missing. */
export async function browserGrants(): Promise<unknown> {
  const names = ["camera", "microphone", "geolocation"] as const;
  const answers: Record<string, string> = {};
  for (const name of names) {
    try {
      const status = await navigator.permissions.query({ name: name as PermissionName });
      answers[name] = status.state;
    } catch {
      continue;
    }
  }
  if (typeof Notification === "function") answers.notifications = Notification.permission === "default" ? "prompt" : Notification.permission;
  return answers;
}
