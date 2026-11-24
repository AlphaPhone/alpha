// spec/app/reminders/index.md, "Story: Organize reminders across smart views and custom lists"; spec/app/reminders/index.md, "Story: Create, update, flag, move, complete and delete reminders with Undo"
import {
  Banner,
  Button,
  Chip,
  ConfirmDialog,
  EmptyState,
  Input,
  ListGroup,
  ListRow,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Screen,
  SearchField,
  cn,
} from "@repo/ui";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  EllipsisVertical,
  Flag,
  Inbox,
  ListPlus,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Repeat,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import type { DeleteMode, SmartView, SortKey } from "../../gen/app__reminders.ts";
import { useMachine as useRemindersMachine } from "../../gen/app__reminders.react.ts";
import type { Resident, Shown } from "../runtime/area.tsx";
import { useTimed } from "../runtime/react.ts";
import { Time } from "../runtime/time.vibe";
import { AlertBanner } from "./AlertBanner.tsx";
import { beginEditReminder, beginNewReminder } from "./editor.vibe";
import { DeleteListDialog, ListEditorDialog } from "./ListEditorDialog.tsx";
import { formatRelativeDue, quickDatePresets } from "./recurrence.ts";
import { ReminderEditorSheet } from "./ReminderEditorSheet.tsx";
import {
  clearCompletedReminders,
  createReminderItem,
  createReminderList,
  deleteReminderItem,
  deleteReminderList,
  refreshRemindersList,
  type RemindersMachines,
  saveReminderDraft,
  toggleReminderComplete,
  toggleReminderFlag,
  updateReminderList,
} from "./reminders.vibe";
import {
  computeSmartCounts,
  DEFAULT_LIST_ID,
  groupScheduledItems,
  isItemOverdue,
  listActiveCount,
  type ReminderItemRecord,
  type ReminderListColor,
  type ReminderListIcon,
  type ReminderListRecord,
  remindersStore,
  searchReminders,
  selectViewItems,
  sortReminders,
  specToPriority,
} from "./store.ts";
import { ListIcon, listColorBadgeClass, PriorityMark } from "./visuals.tsx";

const SMART_META: readonly {
  readonly view: SmartView;
  readonly label: string;
  readonly badgeClass: string;
}[] = [
  { view: "TodayView", label: "Today", badgeClass: "bg-info text-info-foreground" },
  { view: "ScheduledView", label: "Scheduled", badgeClass: "bg-destructive text-destructive-foreground" },
  { view: "AllView", label: "All", badgeClass: "bg-foreground text-background" },
  { view: "FlaggedView", label: "Flagged", badgeClass: "bg-warn text-warn-foreground" },
  { view: "OverdueView", label: "Overdue", badgeClass: "bg-destructive text-destructive-foreground" },
  { view: "CompletedView", label: "Completed", badgeClass: "bg-ok text-ok-foreground" },
];

const SORT_LABELS: Readonly<Record<SortKey, string>> = {
  SortDue: "Due date",
  SortPriority: "Priority",
  SortTitle: "Title",
  SortCreated: "Created",
};

function SmartGlyph({ view }: { readonly view: SmartView }) {
  switch (view) {
    case "TodayView":
      return <CalendarDays aria-hidden className="size-4" />;
    case "ScheduledView":
      return <CalendarClock aria-hidden className="size-4" />;
    case "AllView":
      return <Inbox aria-hidden className="size-4" />;
    case "FlaggedView":
      return <Flag aria-hidden className="size-4" />;
    case "OverdueView":
      return <AlertCircle aria-hidden className="size-4" />;
    case "CompletedView":
      return <CheckCircle2 aria-hidden className="size-4" />;
  }
}

function smartTitle(view: SmartView): string {
  return SMART_META.find((entry) => entry.view === view)?.label ?? "Reminders";
}

function ReminderRow({
  item,
  listName,
  showListBadge,
  nowMs,
  onToggleComplete,
  onToggleFlag,
  onEdit,
}: {
  readonly item: ReminderItemRecord;
  readonly listName: string;
  readonly showListBadge: boolean;
  readonly nowMs: number;
  readonly onToggleComplete: (id: string) => void;
  readonly onToggleFlag: (id: string) => void;
  readonly onEdit: (item: ReminderItemRecord) => void;
}) {
  const overdue = isItemOverdue(item, nowMs);
  const dueText = formatRelativeDue(item.dueDate, item.dueMinute, nowMs, overdue);
  const doneSubs = item.subtasks.filter((sub) => sub.done).length;
  const snoozed = item.snoozedUntilMs !== null && item.snoozedUntilMs > nowMs;

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <button
        type="button"
        aria-label={item.completed ? `Reopen ${item.title}` : `Complete ${item.title}`}
        aria-pressed={item.completed}
        onClick={() => onToggleComplete(item.id)}
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          item.completed
            ? "border-primary bg-primary text-primary-foreground"
            : overdue
              ? "border-destructive text-transparent hover:border-primary"
              : "border-muted-foreground text-transparent hover:border-primary",
        )}
      >
        <Check aria-hidden className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={() => onEdit(item)}
        className="flex min-w-0 flex-1 flex-col gap-1 text-left"
      >
        <span className="flex items-baseline gap-1.5">
          <PriorityMark priority={item.priority} />
          <span className={cn("truncate text-base font-medium", item.completed ? "text-muted-foreground line-through" : "text-foreground")}>
            {item.title}
          </span>
        </span>

        {item.notes ? (
          <span className="line-clamp-1 text-sm text-muted-foreground">{item.notes}</span>
        ) : null}

        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {dueText ? (
            <span className={cn("inline-flex items-center gap-1 font-medium", overdue && "text-destructive")}>
              <CalendarDays aria-hidden className="size-3" />
              {dueText}
            </span>
          ) : null}
          {item.recurrence !== "none" ? (
            <span className="inline-flex items-center gap-1 capitalize">
              <Repeat aria-hidden className="size-3" />
              {item.recurrence}
            </span>
          ) : null}
          {snoozed ? (
            <span className="inline-flex items-center gap-1 text-warn">
              <Clock aria-hidden className="size-3" />
              Snoozed
            </span>
          ) : null}
          {item.subtasks.length > 0 ? (
            <span>{doneSubs}/{item.subtasks.length} subtasks</span>
          ) : null}
          {showListBadge ? (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">{listName}</span>
          ) : null}
        </span>
      </button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={item.flagged ? `Unflag ${item.title}` : `Flag ${item.title}`}
        aria-pressed={item.flagged}
        onClick={() => onToggleFlag(item.id)}
        className={item.flagged ? "text-warn" : "text-muted-foreground"}
      >
        <Flag className="size-4" />
      </Button>
    </div>
  );
}

function QuickAddBar({
  nowMs,
  defaultDate,
  onAdd,
}: {
  readonly nowMs: number;
  readonly defaultDate: string | null;
  readonly onAdd: (title: string, dueDate: string | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [preset, setPreset] = useState<"default" | "today" | "tomorrow">("default");
  const presets = quickDatePresets(nowMs);
  const todayStr = presets.today;
  const tomorrowStr = presets.tomorrow;
  const resolvedDue = preset === "today" ? todayStr : preset === "tomorrow" ? tomorrowStr : defaultDate;

  function submit() {
    const trimmed = title.trim();
    if (trimmed === "") return;
    onAdd(trimmed, resolvedDue);
    setTitle("");
    setPreset("default");
  }

  return (
    <div className="flex flex-col gap-2 rounded-tile border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <Input
          aria-label="Quick add reminder"
          value={title}
          placeholder="New reminder…"
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") submit(); }}
        />
        <Button type="button" size="sm" disabled={title.trim() === ""} onClick={submit}>
          Add
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip pressed={preset === "today"} onPressedChange={(on) => setPreset(on ? "today" : "default")}>Today</Chip>
        <Chip pressed={preset === "tomorrow"} onPressedChange={(on) => setPreset(on ? "tomorrow" : "default")}>Tomorrow</Chip>
      </div>
    </div>
  );
}

function ReminderItemsCard({
  heading,
  items,
  listNames,
  showListBadge,
  nowMs,
  onToggleComplete,
  onToggleFlag,
  onEdit,
}: {
  readonly heading?: string;
  readonly items: readonly ReminderItemRecord[];
  readonly listNames: ReadonlyMap<string, string>;
  readonly showListBadge: boolean;
  readonly nowMs: number;
  readonly onToggleComplete: (id: string) => void;
  readonly onToggleFlag: (id: string) => void;
  readonly onEdit: (item: ReminderItemRecord) => void;
}) {
  if (items.length === 0) return null;
  return (
    <ListGroup heading={heading}>
      {items.map((item) => (
        <ReminderRow
          key={item.id}
          item={item}
          listName={listNames.get(item.listId) ?? "Reminders"}
          showListBadge={showListBadge}
          nowMs={nowMs}
          onToggleComplete={onToggleComplete}
          onToggleFlag={onToggleFlag}
          onEdit={onEdit}
        />
      ))}
    </ListGroup>
  );
}

function RemindersOverview({
  counts,
  lists,
  snapshot,
  hiddenIds,
  onOpenSmart,
  onOpenCustomList,
  onNewList,
  onRenameList,
  onDeleteList,
  onNewReminder,
}: {
  readonly counts: Readonly<Record<SmartView, number>>;
  readonly lists: readonly ReminderListRecord[];
  readonly snapshot: ReturnType<typeof remindersStore.snapshot>["snapshot"];
  readonly hiddenIds: ReadonlySet<string>;
  readonly onOpenSmart: (view: SmartView) => void;
  readonly onOpenCustomList: (list: ReminderListRecord) => void;
  readonly onNewList: () => void;
  readonly onRenameList: (list: ReminderListRecord) => void;
  readonly onDeleteList: (list: ReminderListRecord) => void;
  readonly onNewReminder: () => void;
}) {
  return (
    <>
      <section aria-label="Smart lists" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SMART_META.map((tile) => (
          <button
            key={tile.view}
            type="button"
            onClick={() => onOpenSmart(tile.view)}
            className="flex flex-col gap-3 rounded-tile border border-border bg-card p-3.5 text-left transition-colors hover:bg-secondary/60"
          >
            <div className="flex items-center justify-between gap-2">
              <span className={cn("flex size-8 items-center justify-center rounded-full", tile.badgeClass)}>
                <SmartGlyph view={tile.view} />
              </span>
              <span className="text-2xl font-bold tabular-nums text-foreground">{counts[tile.view]}</span>
            </div>
            <span className="text-sm font-medium text-muted-foreground">{tile.label}</span>
          </button>
        ))}
      </section>

      <div className="flex items-center justify-between pt-1">
        <h2 className="text-sm font-semibold tracking-caps text-muted-foreground uppercase">My Lists</h2>
        <Button type="button" variant="ghost" size="sm" onClick={onNewList}>
          <ListPlus aria-hidden className="size-4" />
          New list
        </Button>
      </div>

      <ListGroup>
        {lists.map((list) => {
          const count = listActiveCount(snapshot, hiddenIds, list.id);
          return (
            <div key={list.id} className="flex items-center">
              <div className="min-w-0 flex-1">
                <ListRow
                  title={list.name}
                  leading={(
                    <span className={cn("flex size-8 items-center justify-center rounded-full", listColorBadgeClass(list.color))}>
                      <ListIcon icon={list.icon} />
                    </span>
                  )}
                  trailing={<span className="text-sm font-medium tabular-nums text-muted-foreground">{count}</span>}
                  onClick={() => onOpenCustomList(list)}
                />
              </div>
              {!list.isDefault ? (
                <div className="pr-2">
                  <Menu>
                    <MenuTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Manage ${list.name}`}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </MenuTrigger>
                    <MenuContent>
                      <MenuItem onSelect={() => onRenameList(list)}>Rename list</MenuItem>
                      <MenuItem destructive onSelect={() => onDeleteList(list)}>Delete list</MenuItem>
                    </MenuContent>
                  </Menu>
                </div>
              ) : null}
            </div>
          );
        })}
      </ListGroup>

      <div className="flex justify-end pt-2">
        <Button type="button" onClick={onNewReminder}>
          <Plus aria-hidden className="size-4" />
          New reminder
        </Button>
      </div>
    </>
  );
}

function RemindersDetail({
  viewTag,
  smartView,
  activeTitle,
  activeList,
  detailItems,
  lists,
  listNames,
  completedCount,
  defaultQuickDue,
  nowMs,
  onQuickAdd,
  onClearCompleted,
  onNewReminder,
  onToggleComplete,
  onToggleFlag,
  onEdit,
  onRenameList,
  onDeleteList,
}: {
  readonly viewTag: "Smart" | "CustomList";
  readonly smartView: SmartView | null;
  readonly activeTitle: string;
  readonly activeList: ReminderListRecord | undefined;
  readonly detailItems: readonly ReminderItemRecord[];
  readonly lists: readonly ReminderListRecord[];
  readonly listNames: ReadonlyMap<string, string>;
  readonly completedCount: number;
  readonly defaultQuickDue: string | null;
  readonly nowMs: number;
  readonly onQuickAdd: (title: string, dueDate: string | null) => void;
  readonly onClearCompleted: () => void;
  readonly onNewReminder: () => void;
  readonly onToggleComplete: (id: string) => void;
  readonly onToggleFlag: (id: string) => void;
  readonly onEdit: (item: ReminderItemRecord) => void;
  readonly onRenameList: (list: ReminderListRecord) => void;
  readonly onDeleteList: (list: ReminderListRecord) => void;
}) {
  const isCompletedView = viewTag === "Smart" && smartView === "CompletedView";
  return (
    <>
      {!isCompletedView ? (
        <QuickAddBar nowMs={nowMs} defaultDate={defaultQuickDue} onAdd={onQuickAdd} />
      ) : completedCount > 0 ? (
        <div className="flex justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={onClearCompleted}>
            <Trash2 aria-hidden className="size-4" />
            Clear completed
          </Button>
        </div>
      ) : null}

      {detailItems.length === 0 ? (
        <EmptyState title={`No reminders in ${activeTitle}`}>
          <p className="text-sm text-muted-foreground">
            {isCompletedView
              ? "Completed reminders appear here so you can reopen or clear them."
              : "Add a reminder above or tap the plus button for dates, repeats, priority and subtasks."}
          </p>
          {!isCompletedView ? (
            <Button type="button" onClick={onNewReminder}>
              <Plus aria-hidden className="size-4" />
              New reminder
            </Button>
          ) : null}
        </EmptyState>
      ) : viewTag === "Smart" && smartView === "ScheduledView" ? (
        groupScheduledItems(detailItems, nowMs).map((bucket) => (
          <ReminderItemsCard
            key={bucket.key}
            heading={bucket.label}
            items={bucket.items}
            listNames={listNames}
            showListBadge
            nowMs={nowMs}
            onToggleComplete={onToggleComplete}
            onToggleFlag={onToggleFlag}
            onEdit={onEdit}
          />
        ))
      ) : viewTag === "Smart" && smartView === "AllView" ? (
        lists.map((list) => (
          <ReminderItemsCard
            key={list.id}
            heading={list.name}
            items={detailItems.filter((item) => item.listId === list.id)}
            listNames={listNames}
            showListBadge={false}
            nowMs={nowMs}
            onToggleComplete={onToggleComplete}
            onToggleFlag={onToggleFlag}
            onEdit={onEdit}
          />
        ))
      ) : (
        <ReminderItemsCard
          items={detailItems}
          listNames={listNames}
          showListBadge={viewTag === "Smart"}
          nowMs={nowMs}
          onToggleComplete={onToggleComplete}
          onToggleFlag={onToggleFlag}
          onEdit={onEdit}
        />
      )}

      {viewTag === "CustomList" && activeList && !activeList.isDefault ? (
        <div className="flex justify-end pt-1">
          <Menu>
            <MenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm">
                <EllipsisVertical aria-hidden className="size-4" />
                List options
              </Button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem onSelect={() => onRenameList(activeList)}>Rename list</MenuItem>
              <MenuItem destructive onSelect={() => onDeleteList(activeList)}>Delete list</MenuItem>
            </MenuContent>
          </Menu>
        </div>
      ) : null}
    </>
  );
}

function SortFilterMenu({
  sort,
  showCompleted,
  flaggedOnly,
  canClearCompleted,
  onSelectSort,
  onToggleCompleted,
  onToggleFlagged,
  onClearCompleted,
}: {
  readonly sort: SortKey;
  readonly showCompleted: boolean;
  readonly flaggedOnly: boolean;
  readonly canClearCompleted: boolean;
  readonly onSelectSort: (key: SortKey) => void;
  readonly onToggleCompleted: () => void;
  readonly onToggleFlagged: () => void;
  readonly onClearCompleted: () => void;
}) {
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Sort and filter">
          <SlidersHorizontal />
        </Button>
      </MenuTrigger>
      <MenuContent>
        {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
          <MenuItem key={key} onSelect={() => onSelectSort(key)}>
            <span className="flex-1">Sort by {SORT_LABELS[key]}</span>
            {sort === key ? <Check aria-hidden className="size-4 text-primary" /> : null}
          </MenuItem>
        ))}
        <MenuItem onSelect={onToggleCompleted}>
          <span className="flex-1">{showCompleted ? "Hide completed" : "Show completed"}</span>
        </MenuItem>
        <MenuItem onSelect={onToggleFlagged}>
          <span className="flex-1">{flaggedOnly ? "Show all items" : "Flagged only"}</span>
        </MenuItem>
        {canClearCompleted ? (
          <MenuItem destructive onSelect={onClearCompleted}>
            <Trash2 aria-hidden className="size-4" />
            Clear completed
          </MenuItem>
        ) : null}
      </MenuContent>
    </Menu>
  );
}

/** Main Reminders screen: Smart Lists overview, Custom Lists, live search, quick add, sort/filter, editor sheet and due-time alert banner. */
export function Reminders({ runtime }: Shown<Resident | RemindersMachines>) {
  const { state, can, send } = useTimed(runtime, useRemindersMachine);
  const storeView = useSyncExternalStore((listener) => remindersStore.subscribe(listener), remindersStore.snapshot);
  const [drilledIn, setDrilledIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [listDialog, setListDialog] = useState<{ readonly open: boolean; readonly editing: ReminderListRecord | null }>({ open: false, editing: null });
  const [deletingList, setDeletingList] = useState<ReminderListRecord | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const nowMs = runtime.runSync(Time.use((time) => time.latest()));

  if (!state) return null;
  const { snapshot, hiddenIds, syncError } = storeView;
  const listNames = new Map(snapshot.lists.map((list) => [list.id, list.name]));
  const counts = computeSmartCounts(snapshot.items, hiddenIds, nowMs);
  const todayStr = quickDatePresets(nowMs).today;
  const searching = searchQuery.trim() !== "";
  const activeView = state.view;
  const activeList = activeView.tag === "CustomList"
    ? snapshot.lists.find((list) => remindersStore.specIdForList(list.id) === activeView.listId) ?? snapshot.lists[0]
    : undefined;
  const activeListId = activeList?.id ?? DEFAULT_LIST_ID;
  const activeTitle = searching
    ? "Search"
    : !drilledIn
      ? "Reminders"
      : state.view.tag === "Smart"
        ? smartTitle(state.view.view)
        : (activeList?.name ?? "Reminders");

  function openSmart(view: SmartView) {
    if (can({ type: "selectSmartView", view })) void send({ type: "selectSmartView", view });
    setDrilledIn(true);
  }

  function openCustomList(list: ReminderListRecord) {
    const specId = remindersStore.specIdForList(list.id);
    if (specId > 0 && can({ type: "selectCustomList", listId: specId })) void send({ type: "selectCustomList", listId: specId });
    setDrilledIn(true);
  }

  function openNewEditor() {
    const presetDue = drilledIn && state?.view.tag === "Smart" && (state.view.view === "TodayView" || state.view.view === "ScheduledView")
      ? todayStr
      : null;
    const presetFlag = drilledIn && state?.view.tag === "Smart" && state.view.view === "FlaggedView";
    void runtime.runPromise(beginNewReminder(activeListId, { dueDate: presetDue, flagged: presetFlag }));
  }

  function openEditEditor(item: ReminderItemRecord) {
    void runtime.runPromise(beginEditReminder(item));
  }

  function handleSaveDraft() {
    void runtime.runPromise(saveReminderDraft());
  }

  function handleToggleComplete(id: string) {
    void runtime.runPromise(toggleReminderComplete(id));
  }

  function handleToggleFlag(id: string) {
    void runtime.runPromise(toggleReminderFlag(id));
  }

  function handleDeleteItem(id: string) {
    void runtime.runPromise(deleteReminderItem(id));
  }

  function handleQuickAdd(title: string, dueDate: string | null) {
    const flagged = drilledIn && state?.view.tag === "Smart" && state.view.view === "FlaggedView";
    void runtime.runPromise(createReminderItem({ listId: activeListId, title, dueDate, flagged }));
  }

  function handleListSubmit(name: string, color: ReminderListColor, icon: ReminderListIcon) {
    if (listDialog.editing) {
      void runtime.runPromise(updateReminderList(listDialog.editing.id, name, color, icon));
    } else {
      void runtime.runPromise(createReminderList(name, color, icon));
    }
  }

  function handleDeleteList(listId: string, mode: DeleteMode) {
    void runtime.runPromise(deleteReminderList(listId, mode));
    if (activeList?.id === listId) setDrilledIn(false);
  }

  const wireFilter = {
    showCompleted: state.filter.showCompleted,
    flaggedOnly: state.filter.flaggedOnly,
    priority: specToPriority(state.filter.priority),
  };

  const detailItems = drilledIn
    ? selectViewItems(
        snapshot.items,
        state.view.tag === "Smart" ? { kind: "smart", view: state.view.view } : { kind: "list", listId: activeListId },
        wireFilter,
        state.sort,
        hiddenIds,
        nowMs,
      )
    : [];

  const searchMatches = searching ? sortReminders(searchReminders(snapshot.items, searchQuery, hiddenIds), state.sort) : [];
  const defaultQuickDue = drilledIn && state.view.tag === "Smart" && (state.view.view === "TodayView" || state.view.view === "ScheduledView")
    ? todayStr
    : null;

  return (
    <>
      <Screen
        title={activeTitle}
        leading={drilledIn && !searching ? (
          <Button type="button" variant="ghost" size="icon" aria-label="All lists" onClick={() => setDrilledIn(false)}>
            <ArrowLeft />
          </Button>
        ) : undefined}
        actions={(
          <div className="flex items-center gap-1">
            {drilledIn && !searching ? (
              <SortFilterMenu
                sort={state.sort}
                showCompleted={state.filter.showCompleted}
                flaggedOnly={state.filter.flaggedOnly}
                canClearCompleted={state.view.tag === "Smart" && state.view.view === "CompletedView" && counts.CompletedView > 0}
                onSelectSort={(key) => { if (can({ type: "setSort", sort: key })) void send({ type: "setSort", sort: key }); }}
                onToggleCompleted={() => {
                  const next = { ...state.filter, showCompleted: !state.filter.showCompleted };
                  if (can({ type: "setFilter", criteria: next })) void send({ type: "setFilter", criteria: next });
                }}
                onToggleFlagged={() => {
                  const next = { ...state.filter, flaggedOnly: !state.filter.flaggedOnly };
                  if (can({ type: "setFilter", criteria: next })) void send({ type: "setFilter", criteria: next });
                }}
                onClearCompleted={() => setConfirmClear(true)}
              />
            ) : null}
            <Button type="button" variant="ghost" size="icon" aria-label="New reminder" onClick={openNewEditor}>
              <Plus />
            </Button>
          </div>
        )}
      >
        {syncError ? (
          <Banner
            variant="warn"
            action={(
              <Button type="button" variant="secondary" size="sm" onClick={() => void runtime.runPromise(refreshRemindersList())}>
                <RefreshCw aria-hidden className="size-3.5" />
                Retry
              </Button>
            )}
          >
            {syncError}
          </Banner>
        ) : null}

        {!drilledIn || searching ? (
          <SearchField
            aria-label="Search reminders"
            placeholder="Search reminders, notes, subtasks"
            value={searchQuery}
            onValueChange={(value) => {
              setSearchQuery(value);
              const open = value.trim() !== "";
              if (can({ type: "setSearchOpen", open })) void send({ type: "setSearchOpen", open });
            }}
          />
        ) : null}

        {searching ? (
          searchMatches.length > 0 ? (
            <ReminderItemsCard
              heading={`${searchMatches.length} ${searchMatches.length === 1 ? "match" : "matches"}`}
              items={searchMatches}
              listNames={listNames}
              showListBadge
              nowMs={nowMs}
              onToggleComplete={handleToggleComplete}
              onToggleFlag={handleToggleFlag}
              onEdit={openEditEditor}
            />
          ) : (
            <EmptyState title="No matching reminders">
              <p className="text-sm text-muted-foreground">No reminders matched “{searchQuery.trim()}”.</p>
            </EmptyState>
          )
        ) : !drilledIn ? (
          <RemindersOverview
            counts={counts}
            lists={snapshot.lists}
            snapshot={snapshot}
            hiddenIds={hiddenIds}
            onOpenSmart={openSmart}
            onOpenCustomList={openCustomList}
            onNewList={() => setListDialog({ open: true, editing: null })}
            onRenameList={(list) => setListDialog({ open: true, editing: list })}
            onDeleteList={setDeletingList}
            onNewReminder={openNewEditor}
          />
        ) : (
          <RemindersDetail
            viewTag={activeView.tag}
            smartView={activeView.tag === "Smart" ? activeView.view : null}
            activeTitle={activeTitle}
            activeList={activeList}
            detailItems={detailItems}
            lists={snapshot.lists}
            listNames={listNames}
            completedCount={counts.CompletedView}
            defaultQuickDue={defaultQuickDue}
            nowMs={nowMs}
            onQuickAdd={handleQuickAdd}
            onClearCompleted={() => setConfirmClear(true)}
            onNewReminder={openNewEditor}
            onToggleComplete={handleToggleComplete}
            onToggleFlag={handleToggleFlag}
            onEdit={openEditEditor}
            onRenameList={(list) => setListDialog({ open: true, editing: list })}
            onDeleteList={setDeletingList}
          />
        )}
      </Screen>

      <ReminderEditorSheet
        runtime={runtime}
        lists={snapshot.lists}
        onSave={handleSaveDraft}
        onDelete={handleDeleteItem}
      />

      {listDialog.open ? (
        <ListEditorDialog
          key={listDialog.editing?.id ?? "new"}
          open
          initial={listDialog.editing}
          onClose={() => setListDialog({ open: false, editing: null })}
          onSubmit={handleListSubmit}
        />
      ) : null}

      <DeleteListDialog
        list={deletingList}
        itemCount={deletingList ? snapshot.items.filter((item) => item.listId === deletingList.id && !hiddenIds.has(item.id)).length : 0}
        onClose={() => setDeletingList(null)}
        onDelete={handleDeleteList}
      />

      <ConfirmDialog
        open={confirmClear}
        title="Clear completed reminders?"
        confirmLabel="Clear"
        destructive
        onConfirm={() => {
          setConfirmClear(false);
          void runtime.runPromise(clearCompletedReminders());
        }}
        onCancel={() => setConfirmClear(false)}
      >
        This permanently removes all {counts.CompletedView} completed {counts.CompletedView === 1 ? "reminder" : "reminders"}.
      </ConfirmDialog>

      <AlertBanner
        runtime={runtime}
        onOpenItem={(itemId) => {
          const target = snapshot.items.find((item) => item.id === itemId);
          if (target) openEditEditor(target);
        }}
      />
    </>
  );
}
