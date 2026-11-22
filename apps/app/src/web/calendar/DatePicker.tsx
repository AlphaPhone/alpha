// spec/calendar/presentation.md, "The date picker is a modal over the view; a month offset exists only in the month view or the picker"
import type { CalendarRow } from "../../calendar/model.vibe";
import { formatMonthName, midnightAfter } from "../../calendar/time.ts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent } from "../components/ui/index.ts";
import { MonthGrid } from "./MonthGrid.tsx";

export type DatePickerProps = {
  open: boolean;
  rows: readonly CalendarRow[];
  day: number;
  month: number;
  zone: string;
  now: number;
  onMonth: (month: number) => void;
  onPickDay: (day: number) => void;
  onClose: () => void;
};

/**
 * "Choose date": a modal month and year choice over the view, which owns focus until it closes.
 * @model spec/calendar/presentation.md
 */
export function DatePicker({ open, rows, day, month, zone, now, onMonth, onPickDay, onClose }: DatePickerProps) {
  const selected = new Date(midnightAfter(now, zone, day));
  const shownYear = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth() + month, 1)).getUTCFullYear();
  const shownMonth = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth() + month, 1)).getUTCMonth();
  const choose = (year: number, monthIndex: number) => {
    if (Number.isInteger(year) && year >= 1 && year <= 9999 && monthIndex >= 0 && monthIndex < 12) {
      onMonth((year - selected.getUTCFullYear()) * 12 + monthIndex - selected.getUTCMonth());
    }
  };
  const years = Array.from({ length: 101 }, (_, index) => shownYear - 50 + index).filter((year) => year >= 1 && year <= 9999);
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="bottom" title="Choose date" hideTitle>
        <div className="flex gap-2 px-4">
          <Select value={String(shownMonth)} onValueChange={(value) => choose(shownYear, Number(value))}>
            <SelectTrigger aria-label="Month"><SelectValue /></SelectTrigger>
            <SelectContent>{Array.from({ length: 12 }, (_, index) => <SelectItem key={index} value={String(index)}>{formatMonthName(index)}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(shownYear)} onValueChange={(value) => choose(Number(value), shownMonth)}>
            <SelectTrigger aria-label="Year"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((year) => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <MonthGrid rows={rows} day={day} month={month} zone={zone} now={now} onMonth={onMonth} onPickDay={onPickDay} />
      </SheetContent>
    </Sheet>
  );
}
