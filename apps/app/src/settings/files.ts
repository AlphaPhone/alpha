// spec/settings/diagnostics.md, "One export runs at a time, and it is shared only when Android's chooser opened"; spec/settings/diagnostics.md, "The notices load once from the app itself, never from a remote source"

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
  link.click();
  queueMicrotask(() => URL.revokeObjectURL(url));
}
