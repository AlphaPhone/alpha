// spec/notes/previousDevice.md, "Story: Read Notes kept by an earlier installation of Alpha"
export const previousDeviceSlots = {
  saved: "notes-records:v1:device",
  draft: "notes-draft:v1:device",
} as const;

type PreviousDeviceSlot = typeof previousDeviceSlots[keyof typeof previousDeviceSlots];

interface PreviousNote {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly details: readonly string[];
}

type EarlierNotes =
  | { readonly status: "available"; readonly notes: readonly PreviousNote[]; readonly pendingRemovals: number }
  | { readonly status: "empty" | "unavailable" };

export interface PreviousDeviceNotes {
  readonly saved: EarlierNotes;
  readonly draft: EarlierNotes;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parse(text: string): unknown {
  return JSON.parse(text);
}

function textItems(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.flatMap((item: unknown) => {
    if (typeof item === "string") return [item];
    if (!isObject(item) || typeof item.t !== "string") return [];
    return typeof item.done === "boolean" ? [`${item.done ? "✓" : "○"} ${item.t}`] : [item.t];
  }) : [];
}

function decodeNotes(value: unknown, pendingRemovals = 0): EarlierNotes {
  if (!Array.isArray(value)) return { status: "unavailable" };
  const notes: PreviousNote[] = [];
  const seen = new Set<string>();
  for (const entry of value as unknown[]) {
    if (!isObject(entry) || typeof entry.id !== "string" || seen.has(entry.id) ||
      typeof entry.title !== "string" || (entry.body !== undefined && typeof entry.body !== "string")) {
      return { status: "unavailable" };
    }
    seen.add(entry.id);
    notes.push({
      id: entry.id,
      title: entry.title,
      body: entry.body ?? "",
      details: [
        ...(typeof entry.url === "string" ? [entry.url] : []),
        ...textItems(entry.items), ...textItems(entry.lines), ...textItems(entry.summary),
        ...textItems(entry.actions), ...textItems(entry.clips),
      ],
    });
  }
  return notes.length === 0 && pendingRemovals === 0
    ? { status: "empty" }
    : { status: "available", notes, pendingRemovals };
}

async function readEarlierNotes(
  read: (slot: PreviousDeviceSlot) => Promise<unknown>,
  slot: PreviousDeviceSlot,
  signal: AbortSignal,
): Promise<EarlierNotes> {
  try {
    signal.throwIfAborted();
    const answer = await read(slot);
    signal.throwIfAborted();
    if (!isObject(answer)) return { status: "unavailable" };
    if (answer.value === null) return { status: "empty" };
    if (typeof answer.value !== "string") return { status: "unavailable" };
    const payload = parse(answer.value);
    if (!isObject(payload) || payload.version !== 1) return { status: "unavailable" };
    if (slot === previousDeviceSlots.draft) {
      const removed: unknown = payload.removed;
      if (!Array.isArray(removed) || removed.some((id: unknown) => typeof id !== "string")) return { status: "unavailable" };
      return decodeNotes(payload.records, removed.length);
    }
    if (typeof payload.currentRaw !== "string") return { status: "unavailable" };
    const current = parse(payload.currentRaw);
    return isObject(current) && current.version === 2
      ? decodeNotes(current.records)
      : { status: "unavailable" };
  } catch {
    signal.throwIfAborted();
    return { status: "unavailable" };
  }
}

export async function readPreviousDeviceNotes(
  read: (slot: PreviousDeviceSlot) => Promise<unknown>,
  signal: AbortSignal,
): Promise<PreviousDeviceNotes> {
  const saved = await readEarlierNotes(read, previousDeviceSlots.saved, signal);
  const draft = await readEarlierNotes(read, previousDeviceSlots.draft, signal);
  return { saved, draft };
}
