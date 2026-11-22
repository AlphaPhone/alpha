// spec/files/storage.md, "Only a complete read with no rows is empty; a partial read keeps its rows"; spec/files/browser.md, "A press starts a selection with its row, a tap adds or removes a row, and an empty selection ends"; spec/files/trash.md, "A permanent deletion first shows the rows it will erase, and erases only those Trash still lists"; spec/files/share.md, "A selection reaches Android's share sheet only when it is one to 100 files that are all still there"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const files = extract(({ document }) => {
  const main = document.querySelector('main[aria-label="Files"]');
  if (!main) return undefined;
  const status = main.querySelector('[role="status"]')?.textContent ?? "";
  const empty = /is empty|No files match|No (downloads|images|videos|audio|documents)/.test(main.textContent ?? "");
  const selection = main.querySelector('[role="toolbar"][aria-label="Selection"]');
  const count = Number(/(\d+) selected/.exec(selection?.textContent ?? "")?.[1] ?? "0");
  const pressed = main.querySelectorAll('ul[aria-label="Files"] [aria-pressed="true"]').length;
  const share = selection?.querySelector<HTMLButtonElement>('button[aria-label="Share"]');
  const erase = document.querySelector('[role="alertdialog"]');
  const erasing = Number(/(\d+) items? will be deleted/.exec(erase?.textContent ?? "")?.[1] ?? "0");
  const listedTrash = document.querySelectorAll('ul[aria-label="Trash"] li').length;
  return { incomplete: /incomplete|could not be read|could not finish/i.test(status), empty, selecting: selection !== null, count, pressed, shareDisabled: share?.disabled ?? true, erase: erase !== null, erasing, listedTrash };
});

/** Files never says a place is empty while it says the read was incomplete. */
export const filesNeverEmptyWhenIncomplete = always(() => {
  const f = files.current;
  return f === undefined || !(f.incomplete && f.empty);
});

/** The selection count Files shows is the rows it marks as selected. */
export const filesSelectionCountMatchesTheRows = always(() => {
  const f = files.current;
  return f === undefined || !f.selecting || f.count === f.pressed;
});

/** Share is offered only for a selection of at least one row. */
export const filesShareNeedsASelection = always(() => {
  const f = files.current;
  return f === undefined || !f.selecting || f.count > 0 || f.shareDisabled;
});

/** A permanent deletion always says how many items it erases. */
export const filesEraseNamesItsCount = always(() => {
  const f = files.current;
  return f === undefined || !f.erase || f.erasing > 0;
});
