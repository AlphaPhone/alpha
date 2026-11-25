# Reminder recurrence

Pure civil-date recurrence rules for reminders: daily, weekdays (Monday through
Friday), weekly, monthly with end-of-month clamping (for example, January 31
advances to February 28 or February 29), and yearly with leap-day clamping
(February 29 advances to February 28 in a non-leap year).

## Story: Repeat reminders cleanly across months and leap years

> As the owner, I want a repeating reminder to advance to its next real calendar
> date when I complete it, never skipping a month because a shorter month has
> fewer days and never landing on a weekend for a weekday repeat.

### A civil date is a Gregorian year, month and day, and a reminder repeats daily, on weekdays, weekly, monthly, yearly or not at all

Days of the week are numbered 0 (Sunday) through 6 (Saturday).

```quint
type Repeat = NoRepeat | Daily | Weekdays | Weekly | Monthly | Yearly
type CivilDate = { year: int, month: int, day: int }

pure def isLeapYear(year: int): bool =
  (year % 4 == 0 and year % 100 != 0) or year % 400 == 0

pure def daysInMonth(year: int, month: int): int =
  if (month == 2) (if (isLeapYear(year)) 29 else 28)
  else if (month == 4 or month == 6 or month == 9 or month == 11) 30
  else 31

pure def validDate(d: CivilDate): bool =
  d.year >= 1970 and d.year <= 9999
    and d.month >= 1 and d.month <= 12
    and d.day >= 1 and d.day <= daysInMonth(d.year, d.month)

pure def dateOrd(d: CivilDate): int =
  d.year * 10000 + d.month * 100 + d.day

pure val dValues = Set(
  { year: 2024, month: 2, day: 29 },
  { year: 2025, month: 1, day: 31 },
  { year: 2025, month: 12, day: 31 },
  { year: 2026, month: 3, day: 15 },
  { year: 2026, month: 8, day: 31 },
)
pure val dowValues = Set(0, 1, 2, 3, 4, 5, 6)
```

### Adding one day moves to the next calendar day, rolling months and years cleanly

```quint
pure def addOneDay(d: CivilDate): CivilDate =
  val dim = daysInMonth(d.year, d.month)
  if (d.day < dim) { ...d, day: d.day + 1 }
  else if (d.month < 12) { year: d.year, month: d.month + 1, day: 1 }
  else { year: d.year + 1, month: 1, day: 1 }

pure def addSmallDays(d: CivilDate, days: int): CivilDate =
  val d1 = addOneDay(d)
  val d2 = addOneDay(d1)
  val d3 = addOneDay(d2)
  val d4 = addOneDay(d3)
  val d5 = addOneDay(d4)
  val d6 = addOneDay(d5)
  val d7 = addOneDay(d6)
  if (days <= 1) d1
  else if (days == 2) d2
  else if (days == 3) d3
  else if (days == 4) d4
  else if (days == 5) d5
  else if (days == 6) d6
  else d7

pure def lawAddOneDayValidAndLater(d: CivilDate): bool =
  (validDate(d) and d.year < 9999) implies (validDate(addOneDay(d)) and dateOrd(addOneDay(d)) > dateOrd(d))
```

### A weekday repeat skips Saturday and Sunday and advances to Monday

```quint
pure def weekdayStep(dow: int): int =
  if (dow == 5) 3 else if (dow == 6) 2 else 1

pure def lawWeekdaysNeverLandsOnWeekend(dow: int): bool =
  val landed = (dow + weekdayStep(dow)) % 7
  (0 <= dow and dow <= 6) implies (landed >= 1 and landed <= 5)
```

### Monthly and yearly repeats advance by one month or one year and clamp the day to the target month's length

```quint
pure def clampDay(year: int, month: int, day: int): int =
  val dim = daysInMonth(year, month)
  if (day > dim) dim else day

pure def nextMonthly(d: CivilDate): CivilDate =
  val ny = if (d.month == 12) d.year + 1 else d.year
  val nm = if (d.month == 12) 1 else d.month + 1
  { year: ny, month: nm, day: clampDay(ny, nm, d.day) }

pure def nextYearly(d: CivilDate): CivilDate =
  val ny = d.year + 1
  { year: ny, month: d.month, day: clampDay(ny, d.month, d.day) }

pure def nextOccurrence(d: CivilDate, dow: int, repeat: Repeat): CivilDate =
  match repeat {
    | NoRepeat => d
    | Daily => addOneDay(d)
    | Weekdays => addSmallDays(d, weekdayStep(dow))
    | Weekly => addSmallDays(d, 7)
    | Monthly => nextMonthly(d)
    | Yearly => nextYearly(d)
  }
```

### Monthly advancement moves exactly one calendar month forward and clamps to valid days

```quint
pure def lawMonthlyAdvancesOneMonthClamped(d: CivilDate): bool =
  val nxt = nextMonthly(d)
  (validDate(d) and d.year < 9999) implies (
    validDate(nxt)
      and nxt.year == (if (d.month == 12) d.year + 1 else d.year)
      and nxt.month == (if (d.month == 12) 1 else d.month + 1)
      and nxt.day <= d.day
      and dateOrd(nxt) > dateOrd(d))
```

### Yearly advancement moves exactly one calendar year forward and clamps leap days

```quint
pure def lawYearlyAdvancesOneYearClamped(d: CivilDate): bool =
  val nxt = nextYearly(d)
  (validDate(d) and d.year < 9999) implies (
    validDate(nxt)
      and nxt.year == d.year + 1
      and nxt.month == d.month
      and nxt.day <= d.day
      and dateOrd(nxt) > dateOrd(d))
```

### Every repeating rule produces a strictly later valid calendar date

```quint
pure def lawNextOccurrenceStrictlyLater(d: CivilDate, dow: int, repeat: Repeat): bool =
  val nxt = nextOccurrence(d, dow, repeat)
  (validDate(d) and d.year < 9999 and 0 <= dow and dow <= 6 and repeat != NoRepeat) implies (
    validDate(nxt) and dateOrd(nxt) > dateOrd(d))
```
