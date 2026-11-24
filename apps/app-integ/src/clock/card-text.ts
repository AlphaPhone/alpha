// spec/clock/agentReview.md, "A reminder card names the time, alert and repeat it saves, and its receipt says when its alert could not be arranged"
// What the agent's reminder card and receipt say: the due time, the alert and the repeat the owner approves, and a delivery
// problem the phone reported. Plain TypeScript, since Intl formatting is ordinary JavaScript.

/** A reminder schedule as the agent's operation carries it: epoch milliseconds, the alert lead and the repeat. */
export interface CardSchedule {
  readonly at: number;
  readonly dueAt?: number;
  readonly alertMinutes?: number | null;
  readonly recurrence: { readonly rule: "daily" | "weekdays" | "weekly"; readonly zone: string; readonly time: string } | null;
}

/** The fields a reminder create or update carries. */
export interface CardFields {
  readonly title: string;
  readonly body: string;
  readonly schedule?: CardSchedule;
}

/**
 * Minute-precision time for the card: a relative reminder carries a millisecond instant only the receipt prints exactly.
 * @throws {never}
 */
export function reviewDateTime(at: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(at));
}

/**
 * The exact instant for the receipt: seconds and milliseconds only where it has them.
 * @throws {never}
 */
export function exactDateTime(at: number, timeZone: string): string {
  const date = new Date(at);
  return new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
    ...(date.getUTCSeconds() || date.getUTCMilliseconds() ? { second: "2-digit" as const } : {}),
    ...(date.getUTCMilliseconds() ? { fractionalSecondDigits: 3 as const } : {}),
    timeZoneName: "short",
  }).format(date);
}

/**
 * The card's timing lines: when it is due in which zone, its alert (delivery may be approximate) or none, and its repeat.
 * @throws {never}
 */
export function timingLines(schedule: CardSchedule, phoneZone: string): readonly string[] {
  const zone = schedule.recurrence?.zone ?? phoneZone;
  const repeat = schedule.recurrence;
  return [
    `Due ${reviewDateTime(schedule.dueAt ?? schedule.at, zone)} (${zone}).`,
    schedule.alertMinutes === null ? "No alert; saved task only." : `Alert ${reviewDateTime(schedule.at, zone)}. Notification delivery may be approximate.`,
    repeat === null ? "Does not repeat." : `Repeats ${repeat.rule === "weekdays" ? "on weekdays" : repeat.rule} at ${repeat.time} (${zone}).`,
  ];
}

/**
 * The detail of a reminder create or update card: the title, a body that says more than the title, and the timing, or
 * "Timing unchanged." for an update that keeps it.
 * @throws {never}
 */
export function reminderCardDetail(fields: CardFields, phoneZone: string): string {
  const body = fields.body.trim();
  return [
    `“${fields.title}”`,
    ...(body !== "" && body.toLowerCase() !== fields.title.trim().toLowerCase() ? [fields.body] : []),
    ...(fields.schedule === undefined ? ["Timing unchanged."] : timingLines(fields.schedule, phoneZone)),
  ].join("\n");
}

/**
 * The exact due instant a created or rescheduled reminder's receipt confirms, or undefined for an update that kept its timing.
 * @throws {never}
 */
export function exactDue(fields: CardFields, phoneZone: string): string | undefined {
  if (fields.schedule === undefined) return undefined;
  const zone = fields.schedule.recurrence?.zone ?? phoneZone;
  return `${exactDateTime(fields.schedule.dueAt ?? fields.schedule.at, zone)} (${zone})`;
}

const CHANGE_DONE: Readonly<Record<string, string>> = {
  reminder_create: "Reminder saved",
  reminder_update: "Reminder updated",
  reminder_snooze: "Reminder snoozed",
  reminder_complete: "Reminder completed",
  reminder_read_selected: "Reminder read",
};

const DELIVERY_PROBLEMS: Readonly<Record<string, string>> = {
  "permission-denied": "notifications are disabled",
  "scheduling-failed": "notification scheduling failed",
};

/**
 * The receipt for a saved reminder whose notification the phone could not arrange, or undefined for any other status.
 * @throws {never}
 */
export function deliveryProblem(operationType: string, status: string | undefined): string | undefined {
  const problem = status === undefined ? undefined : DELIVERY_PROBLEMS[status];
  return problem === undefined ? undefined : `${CHANGE_DONE[operationType] ?? "Reminder changed"}, but ${problem}.`;
}
