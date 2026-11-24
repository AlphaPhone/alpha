// spec/camera/scan.md, "Only a complete, bounded scan request starts a scan, and only over the visible Camera"; spec/camera/media.md, "A frame question needs the ready, idle preview, and its frame is reviewed before it joins the draft"; spec/camera/scanDialogs.md, "Only an explicit click on a link shown in the current text leaves the scan"; spec/camera/scanDialogs.md, "An event suggestion opens Calendar's own form; repeats need an explicit tick and Calendar's Save stays the only write"

const SCAN_REQUEST = /^(?:hey alpha,? )?(?:(?:can|could|would|will) you (?:please )?|please )?(?:scan|digitize)(?: (?:(?:this|that|the|my|a) )?(?:document|doc|receipt|qr(?: code)?|code|poster|page|letter|form|card|menu|sign|passport|whiteboard|text)| (?:this|that|it))?(?:,? (?:for me|please|now|right now))*[\s?.!]*$/
const FRAME_QUESTION = /^(?:hey alpha,? )?(?:please )?(?:what am i looking at|what(?:'s| is) (?:this|that|in front of me)|what do you see|describe (?:this|that|what you see)|what does (?:this|that|it) say|read (?:this|that)(?: (?:to me|for me))?)(?:,? (?:here|right now|now|please))*[\s?.!]*$/

/** Whether a whole short chat message asks to scan what Camera sees.
 * @throws {never}
 */
export function scanRequested(text: string): boolean {
  return text.length <= 200 && SCAN_REQUEST.test(text.toLowerCase().trim())
}

/** Whether a whole short chat message asks about what Camera sees now.
 * @throws {never}
 */
export function frameQuestionRequested(text: string): boolean {
  return text.length <= 200 && FRAME_QUESTION.test(text.toLowerCase().replace(/[‘’]/g, "'").trim())
}

/** The explicit `http(s)://` and `www.` links in scanned text, at most ten; nothing is repaired or opened by itself.
 * @throws {never}
 */
export function scannedLinks(text: string): string[] {
  if (text.length > 100_000) return []
  const result: string[] = []
  for (const match of text.matchAll(/(?:^|[\s([{"'])((?:https?:\/\/|www\.)[^\s<>"'`]+)/gi)) {
    let raw = (match[1] ?? "").replace(/[.,;]+$/, "")
    for (const [close, open] of [[")", "("], ["]", "["], ["}", "{"]] as const) {
      while (raw.endsWith(close) && raw.split(close).length > raw.split(open).length) raw = raw.slice(0, -1)
    }
    if (/^https?:\/\/[/?#]/i.test(raw) || raw.length > 2048 || /[\\\u0000-\u001f\u007f]/.test(raw)) continue
    let url: URL
    try {
      url = new URL(/^www\./i.test(raw) ? `https://${raw}` : raw)
    } catch {
      continue
    }
    if (!["https:", "http:"].includes(url.protocol) || url.hostname === "" || url.username !== "" || url.password !== "") continue
    if (!result.includes(url.href)) result.push(url.href)
    if (result.length === 10) break
  }
  return result
}

/** An event suggested from scanned text, with every inference disclosed. */
export interface EventSuggestion {
  readonly title: string
  readonly date: string
  readonly time: string
  readonly minutes: number
  readonly location: string
  readonly allDay: boolean
  readonly repeat: "none" | "daily" | "weekdays" | "weekly"
  readonly repeatEvidence: string
  readonly disclosures: readonly string[]
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]

function civil(year: number, month: number, day: number): string | undefined {
  const date = new Date(Date.UTC(year, month - 1, day))
  if (year < 1970 || year > 2100 || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function clock(text: string): string | undefined {
  const meridiem = /^(\d{1,2})(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)$/i.exec(text.trim())
  if (meridiem !== null) {
    const hour = Number(meridiem[1])
    if (hour < 1 || hour > 12) return undefined
    return `${String((hour % 12) + (/^p/i.test(meridiem[3] ?? "") ? 12 : 0)).padStart(2, "0")}:${meridiem[2] ?? "00"}`
  }
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text.trim()) ? text.trim() : undefined
}

function explicitDate(text: string, now: Date): { readonly date: string; readonly inferred?: string } | undefined {
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(text)
  if (iso !== null) {
    const date = civil(Number(iso[1]), Number(iso[2]), Number(iso[3]))
    if (date !== undefined) return { date }
  }
  const named = new RegExp(`\\b(${MONTHS.join("|")}|${MONTHS.map((m) => m.slice(0, 3)).join("|")})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, "i").exec(text)
    ?? new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS.join("|")}|${MONTHS.map((m) => m.slice(0, 3)).join("|")})\\.?(?:,?\\s+(\\d{4}))?\\b`, "i").exec(text)
  if (named === null) return undefined
  const monthWord = /^\d/.test(named[1] ?? "") ? named[2] ?? "" : named[1] ?? ""
  const dayText = /^\d/.test(named[1] ?? "") ? named[1] ?? "" : named[2] ?? ""
  const month = MONTHS.findIndex((m) => m.startsWith(monthWord.toLowerCase().slice(0, 3))) + 1
  if (named[3] !== undefined) {
    const date = civil(Number(named[3]), month, Number(dayText))
    return date === undefined ? undefined : { date }
  }
  const thisYear = civil(now.getFullYear(), month, Number(dayText))
  if (thisYear === undefined) return undefined
  const ahead = thisYear >= civil(now.getFullYear(), now.getMonth() + 1, now.getDate())! ? thisYear : civil(now.getFullYear() + 1, month, Number(dayText))
  return ahead === undefined ? undefined : { date: ahead, inferred: `Year ${ahead.slice(0, 4)} assumed from today’s date` }
}

/** Suggest a Calendar event from scanned text: explicit dates and times only, an inferred year disclosed, a repeat only with its evidence.
 * @throws {never}
 */
export function suggestScanEvent(text: string, now: Date): EventSuggestion | undefined {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== "")
  const found = explicitDate(text, now)
  if (found === undefined || lines.length === 0) return undefined
  const window = /(\d{1,2}(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)|(?:[01]\d|2[0-3]):[0-5]\d)(?:\s*(?:[-–—]|to)\s*(\d{1,2}(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)|(?:[01]\d|2[0-3]):[0-5]\d))?/i.exec(text)
  const start = window === null ? undefined : clock(window[1] ?? "")
  const end = window?.[2] === undefined ? undefined : clock(window[2])
  const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3))
  const span = start !== undefined && end !== undefined ? toMinutes(end) - toMinutes(start) : 60
  const place = lines.find((line) => /^(?:at|location|where|venue)[:\s]/i.test(line))?.replace(/^(?:at|location|where|venue)[:\s]+/i, "") ?? ""
  const repeat = /\bevery (?:weekday|monday through friday)\b/i.exec(text) !== null ? "weekdays" as const
    : /\bevery (?:day|morning|evening)\b|\bdaily\b/i.exec(text) !== null ? "daily" as const
    : /\bevery (?:week|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b|\bweekly\b/i.exec(text) !== null ? "weekly" as const : "none" as const
  const evidence = repeat === "none" ? "" : /\b(?:every [a-z]+(?: through [a-z]+)?|daily|weekly)\b/i.exec(text)?.[0] ?? ""
  return {
    title: (lines[0] ?? "").slice(0, 100), date: found.date, time: start ?? "", minutes: span >= 15 && span <= 1440 ? span : 60,
    location: place.slice(0, 200), allDay: start === undefined, repeat, repeatEvidence: evidence,
    disclosures: [...(found.inferred === undefined ? [] : [found.inferred]), ...(start === undefined ? ["No time printed: all day"] : []), ...(repeat === "none" ? [] : [`Repeats ${repeat}: “${evidence}”`])],
  }
}

/** A reviewed text line placed behind its page, in fractions of the page with a top-left origin. */
export interface TextLine { readonly text: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number }

/** Whether a page's text layer is complete and in bounds: at most 2,000 lines and 100,000 characters.
 * @throws {never}
 */
export function textLayerValid(lines: readonly TextLine[]): boolean {
  if (lines.length > 2000) return false
  let length = 0
  for (const line of lines) {
    if (line.text.length > 4000 || /[\r\n\u0000-\u0008\u000b-\u001f]/.test(line.text)) return false
    if (![line.x, line.y, line.width, line.height].every(Number.isFinite) || line.x < 0 || line.y < 0 || line.width <= 0 || line.height <= 0) return false
    if (line.x + line.width > 1.000001 || line.y + line.height > 1.000001) return false
    length += line.text.length
  }
  return length <= 100_000
}
