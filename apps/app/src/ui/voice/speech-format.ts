export const SPEECH_CREDENTIAL_PATTERN = /`|-----BEGIN|\b(?:csk-|sk[-_]|gh[pousr]_|xox[baprs]-|AKIA|ASIA)[A-Za-z0-9_-]{8,}|\b(?:password|passphrase|api[_ -]?key|access[_ -]?token|secret|recovery[_ -]?(?:code|phrase)|seed phrase)\s*(?::|=|is\b)|\b[A-Za-z0-9_-]{32,}\b|(?:\d[ -]?){12,19}/i;

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ordinals = [
  '', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
  'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth',
  'eighteenth', 'nineteenth', 'twentieth', 'twenty-first', 'twenty-second', 'twenty-third',
  'twenty-fourth', 'twenty-fifth', 'twenty-sixth', 'twenty-seventh', 'twenty-eighth', 'twenty-ninth',
  'thirtieth', 'thirty-first',
];
const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty'];

function numberWords(n: number): string {
  if (n < 20) return ones[n]!;
  return n % 10 === 0 ? tens[n / 10]! : tens[Math.floor(n / 10)] + ' ' + ones[n % 10];
}

function namesPattern(names: string[]): string {
  return names.flatMap(name => name.length > 3 ? [name, name.slice(0, 3)] : [name]).join('|');
}

const namedDate = new RegExp(
  String.raw`\b(?:(${namesPattern(weekdays)})\.?[,]?[ \t]+)?(${namesPattern(months)}|Sept)\.?[ \t]+(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?(?![\p{L}\d/-]|[.:]\d)`,
  'giu',
);
const clock = String.raw`(?:0?[1-9]|1[0-2])(?::[0-5]\d)?`;
const bareClock = String.raw`(?:[01]?\d|2[0-3]):[0-5]\d`;
const meridiem = String.raw`[ \t]*[aApP]\.?[ \t]*[mM](?:\.(?=[ \t]*[,;–—−-]|[ \t]+[tT][oO][ \t]))?`;
const rangeSeparator = String.raw`(?:[ \t]*[-–—−][ \t]*|[ \t]+to[ \t]+)`;
const clockTimeEnd = String.raw`(?![\p{L}\d:/-]|\.\d)`;
const clockRange = new RegExp(
  String.raw`(?<![\p{L}\d:+./-])(?:(${clock}(?:${meridiem})?)${rangeSeparator}(${clock}${meridiem})|(${bareClock})${rangeSeparator}(${bareClock}))${clockTimeEnd}`,
  'giu',
);
const clockWithMeridiem = new RegExp(
  String.raw`(?<![\p{L}\d:+./-])(${clock}${meridiem})(?:\.(?=[ \t]+\p{Ll}))?${clockTimeEnd}`,
  'gu',
);
const bareClockTime = new RegExp(String.raw`(?<![\p{L}\d:+./-])${bareClock}${clockTimeEnd}`, 'gu');
const contextualClockTime = new RegExp(String.raw`(?<=\bat )${bareClock}${clockTimeEnd}`, 'giu');

function clockWords(value: string): string {
  const match = /^(\d{1,2})(?::(\d{2}))?[ \t]*([ap])?/i.exec(value)!;
  const clockHour = Number(match[1]);
  const hour = clockHour % 12 || 12;
  const minute = Number(match[2] ?? '0');
  const period = match[3]?.toUpperCase() ?? (clockHour >= 13 ? 'P' : clockHour === 0 ? 'A' : undefined);
  if (minute === 0 && hour === 12 && period) return period === 'P' ? 'noon' : 'midnight';
  const minutes = minute ? ` ${minute < 10 ? 'oh ' : ''}${numberWords(minute)}` : '';
  const suffix = period ? ` ${period} M` : minute === 0 && match[2] ? " o'clock" : '';
  return numberWords(hour) + minutes + suffix;
}

/** Render display dates, clock times and prose pauses at the audio boundary. */
export function formatSpeechText(text: string, standaloneClocks = false): string {
  // Keep labels intact for downstream checks that refuse to speak likely credentials.
  if (SPEECH_CREDENTIAL_PATTERN.test(text)) return text;
  return text
    .replace(namedDate, (_, day: string | undefined, month: string, date: string) => {
      const fullDay = day && weekdays.find(name => name.toLowerCase().startsWith(day.toLowerCase()));
      const fullMonth = months.find(name => name.toLowerCase().startsWith(month.toLowerCase()));
      return `${fullDay ? fullDay + ', ' : ''}${fullMonth} ${ordinals[Number(date)]}`;
    })
    .replace(clockRange, (_, from, to, fromBare, toBare) => `${clockWords(from ?? fromBare)} to ${clockWords(to ?? toBare)}`)
    .replace(clockWithMeridiem, clockWords)
    .replace(standaloneClocks ? bareClockTime : contextualClockTime, clockWords)
    .replace(/(?<=\d)%(?![\p{L}\d])/gu, ' percent')
    .replace(/(?<=\p{L}):(?=[ \t]+\S)/gu, ',')
    .replace(/(?<=\p{L}):(?=$|[ \t]*\r?\n)/gu, '.');
}
