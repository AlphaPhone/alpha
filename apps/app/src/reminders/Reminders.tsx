// spec/app/reminders/index.md, "Story: Organize reminders across smart views and custom lists"; spec/app/reminders/index.md, "Story: Create, update, flag, move, complete and delete reminders with Undo"
import type { ReminderItemRecord, ReminderListColor, ReminderListIcon, ReminderListRecord, RemindersSnapshot } from "@repo/launcher-records";
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
  SearchField,
  cn,
  dockClearance,
  focusRing,
} from "@repo/ui";
import {
  Bell,
  Calendar,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleCheck,
  Clock,
  Ellipsis,
  Inbox,
  Plus,
  Repeat,
  SlidersHorizontal,
  Star,
  Trash2,
  Undo2,
} from "lucide-react";
import { Effect } from "effect";
import { useState, useSyncExternalStore } from "react";
import type { DeleteMode, Priority, SmartView, SortKey } from "../../gen/app__reminders.ts";
import { useMachine as useRemindersMachine } from "../../gen/app__reminders.react.ts";
import type { Resident, Shown } from "../runtime/area.tsx";
import { useTimed } from "../runtime/react.ts";
import { beginEditReminder, beginNewReminder } from "./editor.vibe";
import { DeleteListDialog, ListEditorDialog } from "./ListEditorDialog.tsx";
import { advanceDueDate, civilDayFromString, civilDayNumber, formatRelativeDue, quickDatePresets } from "./recurrence.ts";
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
import { RemindersNowShelf, RemindersShelf } from "./shelf.vibe";
import {
  computeSmartCounts,
  DEFAULT_LIST_ID,
  groupScheduledItems,
  isItemOverdue,
  listActiveCount,
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
  { view: "TodayView", label: "Today", badgeClass: "bg-alpha text-alpha-foreground" },
  { view: "ScheduledView", label: "Scheduled", badgeClass: "bg-background text-foreground" },
  { view: "AllView", label: "All", badgeClass: "bg-background text-foreground" },
  { view: "FlaggedView", label: "Flagged", badgeClass: "bg-background text-foreground" },
  { view: "OverdueView", label: "Overdue", badgeClass: "bg-background text-foreground" },
  { view: "CompletedView", label: "Completed", badgeClass: "bg-background text-foreground" },
];

const SORT_KEYS: readonly SortKey[] = ["SortDue", "SortPriority", "SortTitle", "SortCreated"];

const SORT_LABELS: Readonly<Record<SortKey, string>> = {
  SortDue: "Due date",
  SortPriority: "Priority",
  SortTitle: "Title",
  SortCreated: "Created",
};

const PRIORITY_FILTERS: readonly { readonly value: Priority; readonly label: string }[] = [
  { value: "NoPriority", label: "All priorities" },
  { value: "HighPriority", label: "High priority" },
  { value: "MediumPriority", label: "Medium priority" },
  { value: "LowPriority", label: "Low priority" },
];

function SmartGlyph({ view }: { readonly view: SmartView }) {
  switch (view) {
    case "TodayView":
      return <CalendarDays aria-hidden className="size-4.5" />;
    case "ScheduledView":
      return <Calendar aria-hidden className="size-4.5" />;
    case "AllView":
      return <Inbox aria-hidden className="size-4.5" />;
    case "FlaggedView":
      return <Star aria-hidden className="size-4.5" />;
    case "OverdueView":
      return <Bell aria-hidden className="size-4.5" />;
    case "CompletedView":
      return <CircleCheck aria-hidden className="size-4.5" />;
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
  canComplete,
  canFlag,
  onToggleComplete,
  onToggleFlag,
  onEdit,
}: {
  readonly item: ReminderItemRecord;
  readonly listName: string;
  readonly showListBadge: boolean;
  readonly nowMs: number;
  readonly canComplete: boolean;
  readonly canFlag: boolean;
  readonly onToggleComplete: (id: string) => void;
  readonly onToggleFlag: (id: string) => void;
  readonly onEdit: (item: ReminderItemRecord) => void;
}) {
  const overdue = isItemOverdue(item, nowMs);
  const dueText = formatRelativeDue(item.dueDate, item.dueMinute, nowMs, overdue);
  const doneSubs = item.subtasks.filter((sub) => sub.done).length;
  const snoozed = item.snoozedUntilMs !== null && item.snoozedUntilMs > nowMs;

  return (
    <div className="flex items-start gap-2 px-2 py-2">
      <button
        type="button"
        disabled={!canComplete}
        aria-label={item.completed ? `Reopen ${item.title}` : `Complete ${item.title}`}
        aria-pressed={item.completed}
        onClick={() => onToggleComplete(item.id)}
        className={cn(focusRing, "group inline-flex size-11 shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-50")}
      >
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full border-2 transition-colors",
            item.completed
              ? "border-primary bg-primary text-primary-foreground"
              : overdue
                ? "border-destructive text-transparent group-hover:border-primary"
                : "border-muted-foreground text-transparent group-hover:border-primary",
          )}
        >
          <Check aria-hidden className="size-3.5" />
        </span>
      </button>

      <button
        type="button"
        onClick={() => onEdit(item)}
        className={cn(focusRing, "flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-1 rounded-md py-1 text-left")}
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
        disabled={!canFlag}
        aria-label={item.flagged ? `Unflag ${item.title}` : `Flag ${item.title}`}
        aria-pressed={item.flagged}
        onClick={() => onToggleFlag(item.id)}
        className={item.flagged ? "text-primary [&_svg]:fill-current" : "text-muted-foreground"}
      >
        <Star className="size-4.5" />
      </Button>
    </div>
  );
}

function QuickAddBar({
  nowMs,
  defaultDate,
  canCreate,
  onAdd,
}: {
  readonly nowMs: number;
  readonly defaultDate: string | null;
  readonly canCreate: boolean;
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
    if (!canCreate || trimmed === "") return;
    onAdd(trimmed, resolvedDue);
    setTitle("");
    setPreset("default");
  }

  return (
    <div className="flex flex-col gap-2 rounded-tile border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <Input
          aria-label="Quick add reminder"
          disabled={!canCreate}
          value={title}
          placeholder="New reminder…"
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") submit(); }}
        />
        <Button type="button" size="sm" className="min-h-11" disabled={!canCreate || title.trim() === ""} onClick={submit}>
          Add
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip disabled={!canCreate} pressed={preset === "today"} onPressedChange={(on) => setPreset(on ? "today" : "default")}>Today</Chip>
        <Chip disabled={!canCreate} pressed={preset === "tomorrow"} onPressedChange={(on) => setPreset(on ? "tomorrow" : "default")}>Tomorrow</Chip>
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
  canCompleteItem,
  canFlagItem,
  onToggleComplete,
  onToggleFlag,
  onEdit,
}: {
  readonly heading?: string;
  readonly items: readonly ReminderItemRecord[];
  readonly listNames: ReadonlyMap<string, string>;
  readonly showListBadge: boolean;
  readonly nowMs: number;
  readonly canCompleteItem: (item: ReminderItemRecord) => boolean;
  readonly canFlagItem: (item: ReminderItemRecord) => boolean;
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
          canComplete={canCompleteItem(item)}
          canFlag={canFlagItem(item)}
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
  canCreateList,
  canRenameList,
  canDeleteList,
  canCreateItem,
  onOpenSmart,
  onOpenCustomList,
  onNewList,
  onRenameList,
  onDeleteList,
  onNewReminder,
}: {
  readonly counts: Readonly<Record<SmartView, number>>;
  readonly lists: readonly ReminderListRecord[];
  readonly snapshot: RemindersSnapshot;
  readonly hiddenIds: ReadonlySet<string>;
  readonly canCreateList: boolean;
  readonly canRenameList: (list: ReminderListRecord) => boolean;
  readonly canDeleteList: (list: ReminderListRecord) => boolean;
  readonly canCreateItem: boolean;
  readonly onOpenSmart: (view: SmartView) => void;
  readonly onOpenCustomList: (list: ReminderListRecord) => void;
  readonly onNewList: () => void;
  readonly onRenameList: (list: ReminderListRecord) => void;
  readonly onDeleteList: (list: ReminderListRecord) => void;
  readonly onNewReminder: () => void;
}) {
  return (
    <>
      <section aria-label="Smart lists" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {SMART_META.map((tile) => (
          <button
            key={tile.view}
            type="button"
            onClick={() => onOpenSmart(tile.view)}
            className={cn(
              focusRing,
              "flex min-h-20 flex-col gap-2 rounded-tile border border-border bg-secondary p-3 text-left transition-colors active:bg-accent",
            )}
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
        <Button type="button" variant="ghost" size="sm" className="min-h-11" disabled={!canCreateList} onClick={onNewList}>
          <Plus aria-hidden className="size-4.5" />
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
                        <Ellipsis className="size-4.5" />
                      </Button>
                    </MenuTrigger>
                    <MenuContent>
                      <MenuItem disabled={!canRenameList(list)} onSelect={() => onRenameList(list)}>Rename list</MenuItem>
                      <MenuItem destructive disabled={!canDeleteList(list)} onSelect={() => onDeleteList(list)}>Delete list</MenuItem>
                    </MenuContent>
                  </Menu>
                </div>
              ) : null}
            </div>
          );
        })}
      </ListGroup>

      <div className="flex justify-end pt-2">
        <Button type="button" disabled={!canCreateItem} onClick={onNewReminder}>
          <Plus aria-hidden className="size-4.5" />
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
  canCreateItem,
  canClearCompleted,
  canCompleteItem,
  canFlagItem,
  canRenameActive,
  canDeleteActive,
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
  readonly canCreateItem: boolean;
  readonly canClearCompleted: boolean;
  readonly canCompleteItem: (item: ReminderItemRecord) => boolean;
  readonly canFlagItem: (item: ReminderItemRecord) => boolean;
  readonly canRenameActive: boolean;
  readonly canDeleteActive: boolean;
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
        <QuickAddBar nowMs={nowMs} defaultDate={defaultQuickDue} canCreate={canCreateItem} onAdd={onQuickAdd} />
      ) : completedCount > 0 ? (
        <div className="flex justify-end">
          <Button type="button" variant="secondary" size="sm" className="min-h-11" disabled={!canClearCompleted} onClick={onClearCompleted}>
            <Trash2 aria-hidden className="size-4.5" />
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
            <Button type="button" disabled={!canCreateItem} onClick={onNewReminder}>
              <Plus aria-hidden className="size-4.5" />
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
            canCompleteItem={canCompleteItem}
            canFlagItem={canFlagItem}
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
            canCompleteItem={canCompleteItem}
            canFlagItem={canFlagItem}
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
          canCompleteItem={canCompleteItem}
          canFlagItem={canFlagItem}
          onToggleComplete={onToggleComplete}
          onToggleFlag={onToggleFlag}
          onEdit={onEdit}
        />
      )}

      {viewTag === "CustomList" && activeList && !activeList.isDefault ? (
        <div className="flex justify-end pt-1">
          <Menu>
            <MenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="min-h-11">
                <Ellipsis aria-hidden className="size-4.5" />
                List options
              </Button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem disabled={!canRenameActive} onSelect={() => onRenameList(activeList)}>Rename list</MenuItem>
              <MenuItem destructive disabled={!canDeleteActive} onSelect={() => onDeleteList(activeList)}>Delete list</MenuItem>
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
  priorityFilter,
  canClearCompleted,
  onSelectSort,
  onToggleCompleted,
  onToggleFlagged,
  onSelectPriority,
  onClearCompleted,
}: {
  readonly sort: SortKey;
  readonly showCompleted: boolean;
  readonly flaggedOnly: boolean;
  readonly priorityFilter: Priority;
  readonly canClearCompleted: boolean;
  readonly onSelectSort: (key: SortKey) => void;
  readonly onToggleCompleted: () => void;
  readonly onToggleFlagged: () => void;
  readonly onSelectPriority: (priority: Priority) => void;
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
        {SORT_KEYS.map((key) => (
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
        {PRIORITY_FILTERS.map((opt) => (
          <MenuItem key={opt.value} onSelect={() => onSelectPriority(opt.value)}>
            <span className="flex-1">{opt.label}</span>
            {priorityFilter === opt.value ? <Check aria-hidden className="size-4 text-primary" /> : null}
          </MenuItem>
        ))}
        {canClearCompleted ? (
          <MenuItem destructive onSelect={onClearCompleted}>
            <Trash2 aria-hidden className="size-4.5" />
            Clear completed
          </MenuItem>
        ) : null}
      </MenuContent>
    </Menu>
  );
}

function RemindersHeader({
  drilledIn,
  searching,
  activeTitle,
  searchQuery,
  canLeave,
  canCreateItem,
  canClearCompleted,
  sort,
  showCompleted,
  flaggedOnly,
  priorityFilter,
  onLeave,
  onSearchChange,
  onSelectSort,
  onToggleCompleted,
  onToggleFlagged,
  onSelectPriority,
  onClearCompleted,
  onNewReminder,
}: {
  readonly drilledIn: boolean;
  readonly searching: boolean;
  readonly activeTitle: string;
  readonly searchQuery: string;
  readonly canLeave: boolean;
  readonly canCreateItem: boolean;
  readonly canClearCompleted: boolean;
  readonly sort: SortKey;
  readonly showCompleted: boolean;
  readonly flaggedOnly: boolean;
  readonly priorityFilter: Priority;
  readonly onLeave: () => void;
  readonly onSearchChange: (value: string) => void;
  readonly onSelectSort: (key: SortKey) => void;
  readonly onToggleCompleted: () => void;
  readonly onToggleFlagged: () => void;
  readonly onSelectPriority: (priority: Priority) => void;
  readonly onClearCompleted: () => void;
  readonly onNewReminder: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      {drilledIn && !searching ? (
        <div className="flex min-w-0 items-center gap-2">
          <Button type="button" variant="ghost" size="icon" aria-label="All lists" disabled={!canLeave} onClick={onLeave}>
            <ChevronLeft />
          </Button>
          <h2 className="truncate text-lg font-semibold text-foreground">{activeTitle}</h2>
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <SearchField
            aria-label="Search reminders"
            placeholder="Search reminders"
            value={searchQuery}
            onValueChange={onSearchChange}
          />
        </div>
      )}
      <div className="flex shrink-0 items-center gap-1">
        {drilledIn && !searching ? (
          <SortFilterMenu
            sort={sort}
            showCompleted={showCompleted}
            flaggedOnly={flaggedOnly}
            priorityFilter={priorityFilter}
            canClearCompleted={canClearCompleted}
            onSelectSort={onSelectSort}
            onToggleCompleted={onToggleCompleted}
            onToggleFlagged={onToggleFlagged}
            onSelectPriority={onSelectPriority}
            onClearCompleted={onClearCompleted}
          />
        ) : null}
        <Button type="button" variant="ghost" size="icon" aria-label="New reminder" disabled={!canCreateItem} onClick={onNewReminder}>
          <Plus />
        </Button>
      </div>
    </div>
  );
}

function RemindersModals({
  runtime,
  snapshot,
  hiddenIds,
  completedCount,
  canDeleteSelected,
  listDialog,
  deletingList,
  confirmClear,
  onSaveDraft,
  onDeleteItem,
  onCloseListDialog,
  onSubmitList,
  onCloseDeleteList,
  onDeleteList,
  onConfirmClear,
  onCancelClear,
}: {
  readonly runtime: Shown<Resident | RemindersMachines>["runtime"];
  readonly snapshot: RemindersSnapshot;
  readonly hiddenIds: ReadonlySet<string>;
  readonly completedCount: number;
  readonly canDeleteSelected: boolean;
  readonly listDialog: { readonly open: boolean; readonly editing: ReminderListRecord | null };
  readonly deletingList: ReminderListRecord | null;
  readonly confirmClear: boolean;
  readonly onSaveDraft: () => void;
  readonly onDeleteItem: (id: string) => void;
  readonly onCloseListDialog: () => void;
  readonly onSubmitList: (name: string, color: ReminderListColor, icon: ReminderListIcon) => void;
  readonly onCloseDeleteList: () => void;
  readonly onDeleteList: (listId: string, mode: DeleteMode) => void;
  readonly onConfirmClear: () => void;
  readonly onCancelClear: () => void;
}) {
  return (
    <>
      <ReminderEditorSheet runtime={runtime} lists={snapshot.lists} canDelete={canDeleteSelected} onSave={onSaveDraft} onDelete={onDeleteItem} />
      {listDialog.open ? (
        <ListEditorDialog key={listDialog.editing?.id ?? "new"} open initial={listDialog.editing} onClose={onCloseListDialog} onSubmit={onSubmitList} />
      ) : null}
      <DeleteListDialog
        list={deletingList}
        itemCount={deletingList ? snapshot.items.filter((item) => item.listId === deletingList.id && !hiddenIds.has(item.id)).length : 0}
        onClose={onCloseDeleteList}
        onDelete={onDeleteList}
      />
      <ConfirmDialog open={confirmClear} title="Clear completed reminders?" confirmLabel="Clear" destructive onConfirm={onConfirmClear} onCancel={onCancelClear}>
        This permanently removes all {completedCount} completed {completedCount === 1 ? "reminder" : "reminders"}.
      </ConfirmDialog>
    </>
  );
}

/** Main Reminders screen: Smart Lists overview, Custom Lists, live search, quick add, sort/filter, editor sheet and due-time alert banner. */
export function Reminders({ runtime }: Shown<Resident | RemindersMachines>) {
  const { state, can, send } = useTimed(runtime, useRemindersMachine);
  const store = runtime.runSync(Effect.map(RemindersShelf, (service) => service.store));
  const nowShelf = runtime.runSync(Effect.map(RemindersNowShelf, (service) => service.shelf));
  const storeView = useSyncExternalStore(store.subscribe, store.snapshot);
  const nowMs = useSyncExternalStore(nowShelf.subscribe, nowShelf.snapshot);
  const [searchQuery, setSearchQuery] = useState("");
  const [listDialog, setListDialog] = useState<{ readonly open: boolean; readonly editing: ReminderListRecord | null }>({ open: false, editing: null });
  const [deletingList, setDeletingList] = useState<ReminderListRecord | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!state) return null;
  const { snapshot, hiddenIds, syncError } = storeView;
  const activeView = state.view;
  const drilledIn = activeView.tag !== "Overview";
  const listNames = new Map(snapshot.lists.map((list) => [list.id, list.name]));
  const counts = computeSmartCounts(snapshot.items, hiddenIds, nowMs);
  const todayStr = quickDatePresets(nowMs).today;
  const searching = searchQuery.trim() !== "";
  const activeList = activeView.tag === "CustomList"
    ? snapshot.lists.find((list) => store.specIdForList(list.id) === activeView.listId) ?? snapshot.lists[0]
    : undefined;
  const activeListId = activeList?.id ?? DEFAULT_LIST_ID;
  const activeListSpecId = Math.max(1, store.specIdForList(activeListId));
  const activeTitle = searching
    ? "Search"
    : activeView.tag === "Smart"
      ? smartTitle(activeView.view)
      : activeList?.name ?? "Reminders";

  const canCreateList = can({ type: "createList" });
  const canRefresh = can({ type: "refresh" });
  const canClearCompleted = can({ type: "clearCompleted" });
  const canCreateItem = can({
    type: "createItem",
    spec: { listId: activeListSpecId, hasDue: false, dueDay: 0, hasDueTime: false, dueMinute: 0, repeat: "NoRepeat", priority: "NoPriority", flagged: false },
  });
  const canRenameListRecord = (list: ReminderListRecord): boolean => {
    const specId = store.specIdForList(list.id);
    return specId > 0 && can({ type: "renameList", listId: specId });
  };
  const canDeleteListRecord = (list: ReminderListRecord): boolean => {
    const specId = store.specIdForList(list.id);
    return !list.isDefault && specId > 1 && can({ type: "deleteList", listId: specId, mode: "ReassignToDefault" });
  };
  const canCompleteItem = (item: ReminderItemRecord): boolean => {
    const specId = store.specIdForItem(item.id);
    if (specId <= 0) return false;
    const recurring = !item.completed && item.recurrence !== "none" && item.dueDate !== null;
    const nextDueDate = recurring && item.dueDate !== null ? advanceDueDate(item.dueDate, item.recurrence) : item.dueDate;
    const nextDueDay = civilDayFromString(nextDueDate) ?? (civilDayFromString(item.dueDate) ?? civilDayNumber(nowMs)) + 1;
    return can({ type: "toggleComplete", itemId: specId, nextDueDay, at: nowMs });
  };
  const canFlagItem = (item: ReminderItemRecord): boolean => {
    const specId = store.specIdForItem(item.id);
    return specId > 0 && can({ type: "toggleFlag", itemId: specId });
  };

  const openSmart = (view: SmartView) => { if (can({ type: "selectSmartView", view })) void send({ type: "selectSmartView", view }); };
  const openCustomList = (list: ReminderListRecord) => {
    const specId = store.specIdForList(list.id);
    if (specId > 0 && can({ type: "selectCustomList", listId: specId })) void send({ type: "selectCustomList", listId: specId });
  };
  const showLists = () => { if (can({ type: "showLists" })) void send({ type: "showLists" }); };
  const openNewEditor = () => {
    if (!canCreateItem) return;
    const presetDue = activeView.tag === "Smart" && (activeView.view === "TodayView" || activeView.view === "ScheduledView") ? todayStr : null;
    const presetFlag = activeView.tag === "Smart" && activeView.view === "FlaggedView";
    void runtime.runPromise(beginNewReminder(activeListId, { dueDate: presetDue, flagged: presetFlag }));
  };
  const openEditEditor = (item: ReminderItemRecord) => {
    const specId = store.specIdForItem(item.id);
    if (specId > 0 && can({ type: "openItem", itemId: specId })) void send({ type: "openItem", itemId: specId });
    void runtime.runPromise(beginEditReminder(item));
  };
  const handleSaveDraft = () => { void runtime.runPromise(saveReminderDraft()); };
  const handleToggleComplete = (id: string) => { void runtime.runPromise(toggleReminderComplete(id, store.findItem(id)?.revision)); };
  const handleToggleFlag = (id: string) => { void runtime.runPromise(toggleReminderFlag(id)); };
  const handleDeleteItem = (id: string) => { void runtime.runPromise(deleteReminderItem(id, store.findItem(id)?.revision)); };
  const handleQuickAdd = (title: string, dueDate: string | null) => {
    const flagged = activeView.tag === "Smart" && activeView.view === "FlaggedView";
    void runtime.runPromise(createReminderItem({ listId: activeListId, title, dueDate, flagged }));
  };
  const handleListSubmit = (name: string, color: ReminderListColor, icon: ReminderListIcon) => {
    void runtime.runPromise(listDialog.editing ? updateReminderList(listDialog.editing.id, name, color, icon) : createReminderList(name, color, icon));
  };
  const handleDeleteList = (listId: string, mode: DeleteMode) => { void runtime.runPromise(deleteReminderList(listId, mode)); };

  const wireFilter = {
    showCompleted: state.filter.showCompleted,
    flaggedOnly: state.filter.flaggedOnly,
    priority: specToPriority(state.filter.priority),
  };

  const detailItems = activeView.tag !== "Overview"
    ? selectViewItems(
        snapshot.items,
        activeView.tag === "Smart" ? { kind: "smart", view: activeView.view } : { kind: "list", listId: activeListId },
        wireFilter,
        state.sort,
        hiddenIds,
        nowMs,
      )
    : [];

  const searchMatches = searching ? sortReminders(searchReminders(snapshot.items, searchQuery, hiddenIds), state.sort) : [];
  const defaultQuickDue = activeView.tag === "Smart" && (activeView.view === "TodayView" || activeView.view === "ScheduledView")
    ? todayStr
    : null;

  return (
    <>
      <div className={cn("flex flex-1 flex-col gap-3.5 px-4 pt-2", dockClearance)}>
        <RemindersHeader
          drilledIn={drilledIn}
          searching={searching}
          activeTitle={activeTitle}
          searchQuery={searchQuery}
          canLeave={can({ type: "showLists" })}
          canCreateItem={canCreateItem}
          canClearCompleted={state.view.tag === "Smart" && state.view.view === "CompletedView" && counts.CompletedView > 0 && canClearCompleted}
          sort={state.sort}
          showCompleted={state.filter.showCompleted}
          flaggedOnly={state.filter.flaggedOnly}
          priorityFilter={state.filter.priority}
          onLeave={showLists}
          onSearchChange={(value) => {
            setSearchQuery(value);
            const open = value.trim() !== "";
            if (can({ type: "setSearchOpen", open })) void send({ type: "setSearchOpen", open });
          }}
          onSelectSort={(key) => { if (can({ type: "setSort", sort: key })) void send({ type: "setSort", sort: key }); }}
          onToggleCompleted={() => {
            const next = { ...state.filter, showCompleted: !state.filter.showCompleted };
            if (can({ type: "setFilter", criteria: next })) void send({ type: "setFilter", criteria: next });
          }}
          onToggleFlagged={() => {
            const next = { ...state.filter, flaggedOnly: !state.filter.flaggedOnly };
            if (can({ type: "setFilter", criteria: next })) void send({ type: "setFilter", criteria: next });
          }}
          onSelectPriority={(priority) => {
            const next = { ...state.filter, priority };
            if (can({ type: "setFilter", criteria: next })) void send({ type: "setFilter", criteria: next });
          }}
          onClearCompleted={() => setConfirmClear(true)}
          onNewReminder={openNewEditor}
        />

        {syncError ? (
          <Banner
            variant="warn"
            action={(
              <Button type="button" variant="secondary" size="sm" className="min-h-11" disabled={!canRefresh} onClick={() => void runtime.runPromise(refreshRemindersList())}>
                <Undo2 aria-hidden className="size-4.5" />
                Retry
              </Button>
            )}
          >
            {syncError}
          </Banner>
        ) : null}

        {searching ? (
          searchMatches.length > 0 ? (
            <ReminderItemsCard
              heading={`${searchMatches.length} ${searchMatches.length === 1 ? "match" : "matches"}`}
              items={searchMatches}
              listNames={listNames}
              showListBadge
              nowMs={nowMs}
              canCompleteItem={canCompleteItem}
              canFlagItem={canFlagItem}
              onToggleComplete={handleToggleComplete}
              onToggleFlag={handleToggleFlag}
              onEdit={openEditEditor}
            />
          ) : (
            <EmptyState title="No matching reminders">
              <p className="text-sm text-muted-foreground">No reminders matched “{searchQuery.trim()}”.</p>
            </EmptyState>
          )
        ) : activeView.tag === "Overview" ? (
          <RemindersOverview
            counts={counts}
            lists={snapshot.lists}
            snapshot={snapshot}
            hiddenIds={hiddenIds}
            canCreateList={canCreateList}
            canRenameList={canRenameListRecord}
            canDeleteList={canDeleteListRecord}
            canCreateItem={canCreateItem}
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
            canCreateItem={canCreateItem}
            canClearCompleted={canClearCompleted}
            canCompleteItem={canCompleteItem}
            canFlagItem={canFlagItem}
            canRenameActive={activeList ? canRenameListRecord(activeList) : false}
            canDeleteActive={activeList ? canDeleteListRecord(activeList) : false}
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
      </div>

      <RemindersModals
        runtime={runtime}
        snapshot={snapshot}
        hiddenIds={hiddenIds}
        completedCount={counts.CompletedView}
        canDeleteSelected={state.selectedId > 0 ? can({ type: "deleteItem", itemId: state.selectedId, at: nowMs }) : state.undo.holding !== "Held" && state.write.outcome !== "Sent"}
        listDialog={listDialog}
        deletingList={deletingList}
        confirmClear={confirmClear}
        onSaveDraft={handleSaveDraft}
        onDeleteItem={handleDeleteItem}
        onCloseListDialog={() => setListDialog({ open: false, editing: null })}
        onSubmitList={handleListSubmit}
        onCloseDeleteList={() => setDeletingList(null)}
        onDeleteList={handleDeleteList}
        onConfirmClear={() => {
          setConfirmClear(false);
          void runtime.runPromise(clearCompletedReminders());
        }}
        onCancelClear={() => setConfirmClear(false)}
      />
    </>
  );
}
