// spec/app/clock/world.md, "Story: Track times around the world"

/** One selectable world city in the World Clock catalog. */
export interface CityEntry {
  readonly id: number;
  readonly city: string;
  readonly region: string;
  readonly timeZone: string;
}

/** Live formatted reading for a world city at a given instant. */
export interface CityClockReading {
  readonly time: string;
  readonly period: string;
  readonly offsetLabel: string;
  readonly dayDelta: "Today" | "Tomorrow" | "Yesterday";
  readonly zoneAbbr: string;
}

const RAW_CITIES: ReadonlyArray<readonly [string, string, string]> = [
  ["New York", "United States", "America/New_York"],
  ["Los Angeles", "United States", "America/Los_Angeles"],
  ["Chicago", "United States", "America/Chicago"],
  ["Denver", "United States", "America/Denver"],
  ["Phoenix", "United States", "America/Phoenix"],
  ["San Francisco", "United States", "America/Los_Angeles"],
  ["Seattle", "United States", "America/Los_Angeles"],
  ["Miami", "United States", "America/New_York"],
  ["Boston", "United States", "America/New_York"],
  ["Atlanta", "United States", "America/New_York"],
  ["Dallas", "United States", "America/Chicago"],
  ["Houston", "United States", "America/Chicago"],
  ["Anchorage", "United States", "America/Anchorage"],
  ["Honolulu", "United States", "Pacific/Honolulu"],
  ["Toronto", "Canada", "America/Toronto"],
  ["Vancouver", "Canada", "America/Vancouver"],
  ["Montreal", "Canada", "America/Toronto"],
  ["Calgary", "Canada", "America/Edmonton"],
  ["Halifax", "Canada", "America/Halifax"],
  ["St. John's", "Canada", "America/St_Johns"],
  ["Mexico City", "Mexico", "America/Mexico_City"],
  ["Monterrey", "Mexico", "America/Monterrey"],
  ["Tijuana", "Mexico", "America/Tijuana"],
  ["Guatemala City", "Guatemala", "America/Guatemala"],
  ["San Jose", "Costa Rica", "America/Costa_Rica"],
  ["Panama City", "Panama", "America/Panama"],
  ["Havana", "Cuba", "America/Havana"],
  ["Kingston", "Jamaica", "America/Jamaica"],
  ["San Juan", "Puerto Rico", "America/Puerto_Rico"],
  ["Bogota", "Colombia", "America/Bogota"],
  ["Lima", "Peru", "America/Lima"],
  ["Quito", "Ecuador", "America/Guayaquil"],
  ["Caracas", "Venezuela", "America/Caracas"],
  ["Santiago", "Chile", "America/Santiago"],
  ["Buenos Aires", "Argentina", "America/Argentina/Buenos_Aires"],
  ["Montevideo", "Uruguay", "America/Montevideo"],
  ["Sao Paulo", "Brazil", "America/Sao_Paulo"],
  ["Rio de Janeiro", "Brazil", "America/Sao_Paulo"],
  ["Reykjavik", "Iceland", "Atlantic/Reykjavik"],
  ["London", "United Kingdom", "Europe/London"],
  ["Dublin", "Ireland", "Europe/Dublin"],
  ["Lisbon", "Portugal", "Europe/Lisbon"],
  ["Madrid", "Spain", "Europe/Madrid"],
  ["Barcelona", "Spain", "Europe/Madrid"],
  ["Paris", "France", "Europe/Paris"],
  ["Brussels", "Belgium", "Europe/Brussels"],
  ["Amsterdam", "Netherlands", "Europe/Amsterdam"],
  ["Berlin", "Germany", "Europe/Berlin"],
  ["Munich", "Germany", "Europe/Berlin"],
  ["Frankfurt", "Germany", "Europe/Berlin"],
  ["Zurich", "Switzerland", "Europe/Zurich"],
  ["Geneva", "Switzerland", "Europe/Zurich"],
  ["Vienna", "Austria", "Europe/Vienna"],
  ["Rome", "Italy", "Europe/Rome"],
  ["Milan", "Italy", "Europe/Rome"],
  ["Prague", "Czechia", "Europe/Prague"],
  ["Warsaw", "Poland", "Europe/Warsaw"],
  ["Budapest", "Hungary", "Europe/Budapest"],
  ["Copenhagen", "Denmark", "Europe/Copenhagen"],
  ["Oslo", "Norway", "Europe/Oslo"],
  ["Stockholm", "Sweden", "Europe/Stockholm"],
  ["Helsinki", "Finland", "Europe/Helsinki"],
  ["Tallinn", "Estonia", "Europe/Tallinn"],
  ["Riga", "Latvia", "Europe/Riga"],
  ["Vilnius", "Lithuania", "Europe/Vilnius"],
  ["Athens", "Greece", "Europe/Athens"],
  ["Bucharest", "Romania", "Europe/Bucharest"],
  ["Sofia", "Bulgaria", "Europe/Sofia"],
  ["Kyiv", "Ukraine", "Europe/Kyiv"],
  ["Istanbul", "Turkey", "Europe/Istanbul"],
  ["Moscow", "Russia", "Europe/Moscow"],
  ["Casablanca", "Morocco", "Africa/Casablanca"],
  ["Algiers", "Algeria", "Africa/Algiers"],
  ["Tunis", "Tunisia", "Africa/Tunis"],
  ["Cairo", "Egypt", "Africa/Cairo"],
  ["Lagos", "Nigeria", "Africa/Lagos"],
  ["Accra", "Ghana", "Africa/Accra"],
  ["Nairobi", "Kenya", "Africa/Nairobi"],
  ["Addis Ababa", "Ethiopia", "Africa/Addis_Ababa"],
  ["Johannesburg", "South Africa", "Africa/Johannesburg"],
  ["Cape Town", "South Africa", "Africa/Johannesburg"],
  ["Jerusalem", "Israel", "Asia/Jerusalem"],
  ["Tel Aviv", "Israel", "Asia/Jerusalem"],
  ["Beirut", "Lebanon", "Asia/Beirut"],
  ["Amman", "Jordan", "Asia/Amman"],
  ["Riyadh", "Saudi Arabia", "Asia/Riyadh"],
  ["Doha", "Qatar", "Asia/Qatar"],
  ["Kuwait City", "Kuwait", "Asia/Kuwait"],
  ["Dubai", "United Arab Emirates", "Asia/Dubai"],
  ["Muscat", "Oman", "Asia/Muscat"],
  ["Tehran", "Iran", "Asia/Tehran"],
  ["Tbilisi", "Georgia", "Asia/Tbilisi"],
  ["Baku", "Azerbaijan", "Asia/Baku"],
  ["Karachi", "Pakistan", "Asia/Karachi"],
  ["Lahore", "Pakistan", "Asia/Karachi"],
  ["Tashkent", "Uzbekistan", "Asia/Tashkent"],
  ["Almaty", "Kazakhstan", "Asia/Almaty"],
  ["Mumbai", "India", "Asia/Kolkata"],
  ["New Delhi", "India", "Asia/Kolkata"],
  ["Bengaluru", "India", "Asia/Kolkata"],
  ["Colombo", "Sri Lanka", "Asia/Colombo"],
  ["Kathmandu", "Nepal", "Asia/Kathmandu"],
  ["Dhaka", "Bangladesh", "Asia/Dhaka"],
  ["Yangon", "Myanmar", "Asia/Yangon"],
  ["Bangkok", "Thailand", "Asia/Bangkok"],
  ["Ho Chi Minh City", "Vietnam", "Asia/Ho_Chi_Minh"],
  ["Hanoi", "Vietnam", "Asia/Bangkok"],
  ["Jakarta", "Indonesia", "Asia/Jakarta"],
  ["Singapore", "Singapore", "Asia/Singapore"],
  ["Kuala Lumpur", "Malaysia", "Asia/Kuala_Lumpur"],
  ["Manila", "Philippines", "Asia/Manila"],
  ["Hong Kong", "China", "Asia/Hong_Kong"],
  ["Taipei", "Taiwan", "Asia/Taipei"],
  ["Shanghai", "China", "Asia/Shanghai"],
  ["Beijing", "China", "Asia/Shanghai"],
  ["Shenzhen", "China", "Asia/Shanghai"],
  ["Seoul", "South Korea", "Asia/Seoul"],
  ["Tokyo", "Japan", "Asia/Tokyo"],
  ["Osaka", "Japan", "Asia/Tokyo"],
  ["Perth", "Australia", "Australia/Perth"],
  ["Adelaide", "Australia", "Australia/Adelaide"],
  ["Brisbane", "Australia", "Australia/Brisbane"],
  ["Sydney", "Australia", "Australia/Sydney"],
  ["Melbourne", "Australia", "Australia/Melbourne"],
  ["Auckland", "New Zealand", "Pacific/Auckland"],
  ["Wellington", "New Zealand", "Pacific/Auckland"],
  ["Suva", "Fiji", "Pacific/Fiji"],
  ["UTC", "Coordinated Universal Time", "UTC"],
];

/** Curated catalog of major IANA world cities with stable positive numeric ids. */
export const WORLD_CITIES: ReadonlyArray<CityEntry> = RAW_CITIES.map(([city, region, timeZone], index) => ({
  id: index + 1,
  city,
  region,
  timeZone,
}));

const byId = new Map<number, CityEntry>(WORLD_CITIES.map((entry) => [entry.id, entry]));

/**
 * Look up a catalog city by its numeric spec id.
 * @throws {never}
 */
export function cityById(id: number): CityEntry | undefined {
  return byId.get(id);
}

/**
 * Find the first catalog city matching an IANA timezone or city name.
 * @throws {never}
 */
export function findCityMatch(timeZone: string, city?: string): CityEntry | undefined {
  const cleanCity = city?.trim().toLowerCase() ?? "";
  if (cleanCity !== "") {
    const exact = WORLD_CITIES.find((entry) => entry.city.toLowerCase() === cleanCity && entry.timeZone === timeZone);
    if (exact) return exact;
  }
  return WORLD_CITIES.find((entry) => entry.timeZone === timeZone)
    ?? (cleanCity !== "" ? WORLD_CITIES.find((entry) => entry.city.toLowerCase() === cleanCity) : undefined);
}

/** Filter catalog cities by city name, country/region, or timezone substring. */
export function searchCities(query: string): ReadonlyArray<CityEntry> {
  const needle = query.trim().toLowerCase();
  if (needle === "") return WORLD_CITIES;
  return WORLD_CITIES.filter((entry) =>
    entry.city.toLowerCase().includes(needle)
    || entry.region.toLowerCase().includes(needle)
    || entry.timeZone.toLowerCase().includes(needle));
}

/** Current host IANA time zone name. */
export function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function zonedDateParts(nowMs: number, timeZone: string): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(nowMs));
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: read("year"), month: read("month"), day: read("day"), hour: read("hour") % 24, minute: read("minute") };
}

function zoneOffsetMinutes(nowMs: number, timeZone: string): number {
  const zoned = zonedDateParts(nowMs, timeZone);
  const asUtc = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute);
  const roundedNow = Math.floor(nowMs / 60_000) * 60_000;
  return Math.round((asUtc - roundedNow) / 60_000);
}

function formatRelativeOffset(diffMinutes: number): string {
  if (diffMinutes === 0) return "Same time";
  const sign = diffMinutes > 0 ? "+" : "−";
  const abs = Math.abs(diffMinutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  if (mins === 0) return `${sign}${hours} hr`;
  return `${sign}${hours} hr ${mins} min`;
}

/** Format a world city's live wall time, relative offset from local time, and day delta. */
export function formatCityClock(timeZone: string, nowMs: number, hour24: boolean, hostZone = localTimeZone()): CityClockReading {
  const timeParts = new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: hour24 ? "2-digit" : "numeric",
    minute: "2-digit",
    hour12: !hour24,
  }).formatToParts(new Date(nowMs));
  const period = timeParts.find((part) => part.type === "dayPeriod")?.value ?? "";
  const time = timeParts.filter((part) => part.type !== "dayPeriod").map((part) => part.value).join("").trim();
  const zoneParts = new Intl.DateTimeFormat(undefined, { timeZone, timeZoneName: "short" }).formatToParts(new Date(nowMs));
  const zoneAbbr = zoneParts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
  const target = zonedDateParts(nowMs, timeZone);
  const local = zonedDateParts(nowMs, hostZone);
  const targetDay = Date.UTC(target.year, target.month - 1, target.day);
  const localDay = Date.UTC(local.year, local.month - 1, local.day);
  const dayDelta = targetDay > localDay ? "Tomorrow" : targetDay < localDay ? "Yesterday" : "Today";
  const diffMinutes = zoneOffsetMinutes(nowMs, timeZone) - zoneOffsetMinutes(nowMs, hostZone);
  return { time, period, offsetLabel: formatRelativeOffset(diffMinutes), dayDelta, zoneAbbr };
}
