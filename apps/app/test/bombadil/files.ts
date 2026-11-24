// spec/files/storage.md, "Only a complete read with no rows is empty; a partial read keeps its rows"; spec/files/storage.md, "An item's days left count down from 30 and never go below zero"; spec/files/browser.md, "Only the newest access read decides access, and without access nothing is listed"; spec/files/browser.md, "A press starts a selection with its row, a tap adds or removes a row, and an empty selection ends"; spec/files/browser.md, "Choosing the sort shown reverses it, choosing another starts it in its own order"; spec/files/trash.md, "A permanent deletion first shows the rows it will erase, and erases only those Trash still lists"; spec/files/share.md, "A selection reaches Android's share sheet only when it is one to 100 files that are all still there"; spec/files/filter.md, "A filter says it found nothing only after a complete query"; spec/files/storage.md, "The primary volume is listed first, and its used share is a whole percentage of what is known"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const files = extract(({ document }) => {
  const main = document.querySelector('main[aria-label="Files"]');
  if (!main) return null;
  const statuses = [...main.querySelectorAll('[role="status"], [role="alert"]')].map((node) => node.textContent ?? "").join(" ");
  const text = main.textContent ?? "";
  const empty = /is empty|No files match|No (downloads|images|videos|audio|documents)/.test(text);
  const selection = main.querySelector('[role="toolbar"][aria-label="Selection"]');
  const count = Number(/(\d+) selected/.exec(selection?.textContent ?? "")?.[1] ?? "0");
  const pressed = main.querySelectorAll('ul[aria-label="Files"] [aria-pressed="true"]').length;
  const share = selection?.querySelector<HTMLButtonElement>('button[aria-label="Share"]');
  const erase = document.querySelector('[role="alertdialog"]');
  const erasing = Number(/(\d+) items? will be deleted/.exec(erase?.textContent ?? "")?.[1] ?? "0");
  const listedToErase = erase?.querySelectorAll('ul[aria-label="Items to delete"] li').length ?? 0;
  const browse = main.querySelector('ul[aria-label="Categories"]') !== null;
  const sortOrView = main.querySelector('button[aria-label="Sort and more"], button[aria-label="Grid view"], button[aria-label="List view"]') !== null;
  const allow = [...main.querySelectorAll("button")].some((button) => /^Allow (all files|storage) access$/.test(button.textContent?.trim() ?? ""));
  const listed = main.querySelectorAll('ul[aria-label="Files"] li, ul[aria-label="Trash"] li, ol[aria-label="Results"] li').length;
  const days = [...main.querySelectorAll('ul[aria-label="Trash"] li')].map((row) => Number(/(\d+)d\s*$/.exec(row.textContent ?? "")?.[1] ?? "0"));
  const results = main.querySelectorAll('ol[aria-label="Results"] li').length;
  const chip = /· (\d+)(\+?)\s*$/.exec(main.querySelector('section[aria-label="Filter results"] span')?.textContent ?? "");
  return {
    incomplete: /incomplete|could not be read|could not finish/i.test(statuses), empty, selecting: selection !== null, count, pressed,
    shareDisabled: share?.disabled ?? true, erase: erase !== null, erasing, listedToErase, browse, sortOrView, allow, listed, days, results,
    chipCount: chip ? Number(chip[1]) : -1,
  };
});

/** Files never says a place is empty while it says the read was incomplete. */
export const filesNeverEmptyWhenIncomplete = always(() => {
  const f = files.current;
  return f === null || !(f.incomplete && f.empty);
});

/** The selection count Files shows is the rows it marks as selected. */
export const filesSelectionCountMatchesTheRows = always(() => {
  const f = files.current;
  return f === null || !f.selecting || f.count === f.pressed;
});

/** Share is offered only for a selection of at least one row. */
export const filesShareNeedsASelection = always(() => {
  const f = files.current;
  return f === null || !f.selecting || f.count > 0 || f.shareDisabled;
});

/** A permanent deletion always says how many items it erases. */
export const filesEraseNamesItsCount = always(() => {
  const f = files.current;
  return f === null || !f.erase || f.erasing > 0;
});

/** A permanent deletion lists exactly the rows it says it erases. */
export const filesEraseListsWhatItErases = always(() => {
  const f = files.current;
  return f === null || !f.erase || f.listedToErase === f.erasing;
});

/** Browse has no listing, so it offers neither sort nor view, and nothing on it can be selected. */
export const filesBrowseOffersNoSortOrSelection = always(() => {
  const f = files.current;
  return f === null || !f.browse || (!f.sortOrView && !f.selecting);
});

/** While Files asks for storage access, it lists no file, Trash item or result. */
export const filesNothingListedWithoutAccess = always(() => {
  const f = files.current;
  return f === null || !f.allow || f.listed === 0;
});

/** Every Trash item has between 0 and 30 days left. */
export const filesTrashDaysWithinRetention = always(() => {
  const f = files.current;
  return f === null || f.days.every((d) => d >= 0 && d <= 30);
});

/** The filter chip counts exactly the results it shows. */
export const filesFilterChipCountsItsResults = always(() => {
  const f = files.current;
  return f === null || f.chipCount < 0 || f.chipCount === f.results;
});

const selectionHasActionsWithoutRows = extract(({ document }) => {
  const bar = document.querySelector('main[aria-label="Files"] [role="toolbar"][aria-label="Selection"]');
  if (bar === null || !/\b0 selected\b/.test(bar.textContent ?? "")) return false;
  const fileActions = ["Share", "Move", "Copy", "Rename", "Details", "Move to Trash", "Download"];
  return Array.from(bar.querySelectorAll("button")).some((button) => !button.disabled && fileActions.includes(button.getAttribute("aria-label") ?? ""));
});

/** Select can show zero rows while the owner chooses. Actions on files still need a row. */
export const filesActionsNeedSelection = always(() => !selectionHasActionsWithoutRows.current);

const storageShares = extract(({ document }) =>
  Array.from(document.querySelectorAll('ul[aria-label="Storage"] [role="progressbar"]')).map((bar) => bar.getAttribute("aria-valuenow")));

/** A volume's used share is drawn as a whole percentage from 0 to 100. */
export const filesStorageShareIsAWholePercentage = always(() =>
  storageShares.current.every((value) => value === null || (/^\d+$/.test(value) && Number(value) <= 100)));
