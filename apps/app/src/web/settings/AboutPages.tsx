// spec/settings/diagnostics.md, "Story: See what went wrong and share it with support"; spec/settings/diagnostics.md, "Story: Read the licences Alpha ships"; spec/settings/diagnostics.md, "A licence flag is shown by Alpha's name for it, an unlisted flag as written, with what it obliges"; spec/settings/index.md, "General's Phone row opens Phone's line details on the Alpha image only, and About's Agent activity opens the assistant's activity on the phone"
import { FileText, History, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Page, Settings } from "../../../gen/settings.ts";
import type { Diagnostics } from "../../../gen/settings__diagnostics.ts";
import { flagShown } from "../../../gen/settings__diagnostics.ts";
import type { Facts } from "../../../gen/settings__facts.ts";
import { Button, EmptyState, Input } from "../components/ui/index.ts";
import { Section, SettingRow } from "./Rows.tsx";
import { CLEAR_FAILED, EXPORT, FLAGS } from "./words.ts";

/** What the owner can do in About. */
export interface AboutActs {
  /** Read the problem log again after it was unavailable. */
  readonly readLog: () => void;
  readonly askClear: () => void;
  readonly cancelClear: () => void;
  readonly clear: () => void;
  readonly exportReport: () => void;
  readonly loadLicences: () => void;
}

/** About, the problem log and the licences, with the pages they open. */
export interface AboutPagesProps {
  readonly nav: Settings;
  readonly facts: Facts;
  readonly native: boolean;
  readonly diagnostics: Diagnostics;
  readonly aboutActs: AboutActs;
  readonly onOpen: (page: Page) => void;
  readonly onOpenLicence: (index: number) => void;
  readonly onAppInfo: () => void;
  /** Open the assistant's Agent activity; undefined where the build has no on-device agent. */
  readonly onActivity?: () => void;
}

/**
 * About, the problem log and the licences.
 * @model spec/settings/diagnostics.md
 */
export function AboutPages({ nav, facts, native, diagnostics, aboutActs, onOpen, onOpenLicence, onAppInfo, onActivity }: AboutPagesProps) {
  const [query, setQuery] = useState("");
  const read = facts.read;
  const exporting = diagnostics.exportState === "Exporting";
  const exportRow = (
    <>
      <SettingRow label="Export diagnostics" icon={<Share2 aria-hidden className="size-5" />} busy={exporting} onOpen={aboutActs.exportReport} />
      {EXPORT[diagnostics.exportState] && <p role="status" aria-live="polite" className="px-4 py-2 text-sm text-muted-foreground">{EXPORT[diagnostics.exportState]}</p>}
    </>
  );
  if (nav.page === "Problems") {
    return (
      <>
        <Section>
          {diagnostics.log === "LogUnavailable" && <SettingRow label="Unavailable" ariaLabel="Problem log unavailable, retry" onOpen={aboutActs.readLog} />}
          {diagnostics.log === "LogShown" && diagnostics.problems.length === 0 && <SettingRow label="No problems" state={{ word: "None", tone: "ok" }} />}
          {[...diagnostics.problems].reverse().map((p) => (
            <div key={`${p.at}:${p.title}:${p.detail}`} className="flex flex-col px-4 py-2">
              <span className="font-mono text-xs uppercase tabular-nums text-muted-foreground">{new Date(p.at).toLocaleString()}</span>
              <span>{p.title} · {p.detail}</span>
            </div>
          ))}
        </Section>
        <Section>
          {exportRow}
          {diagnostics.problems.length > 0 && !diagnostics.confirmClear && <SettingRow label="Clear" ariaLabel={diagnostics.clearing ? "Clearing problem log" : "Clear problem log"} busy={diagnostics.clearing} icon={<Trash2 aria-hidden className="size-5" />} onOpen={aboutActs.askClear} />}
          {diagnostics.clearFailed && <p role="status" aria-live="polite" className="px-4 py-2 text-sm text-muted-foreground">{CLEAR_FAILED}</p>}
          {diagnostics.confirmClear && (
            <div className="flex justify-end gap-2 p-3">
              <Button variant="ghost" onClick={aboutActs.cancelClear}>Cancel</Button>
              <Button variant="destructive" onClick={aboutActs.clear}>Clear problem log</Button>
            </div>
          )}
        </Section>
      </>
    );
  }
  if (nav.page === "Licenses") {
    if (diagnostics.licences === "NoticesUnavailable") return <Section><SettingRow label="Unavailable" ariaLabel="License notices unavailable, retry" onOpen={aboutActs.loadLicences} /></Section>;
    if (diagnostics.licences !== "NoticesReady") return <EmptyState title="Loading license notices" icon={<FileText aria-hidden />} />;
    const needle = query.trim().toLowerCase();
    const shown = diagnostics.notices.map((n, index) => ({ n, index })).filter(({ n }) => `${n.name} ${n.version} ${n.licence}`.toLowerCase().includes(needle));
    return (
      <>
        <Input type="search" aria-label="Search licenses" value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
        <Section>
          {shown.length === 0 && <SettingRow label="No matches" />}
          {shown.map(({ n, index }) => <SettingRow key={`${n.name}@${n.version}`} label={n.name} state={{ word: `${n.version} · ${n.licence}` }} ariaLabel={`${n.name} ${n.version}`} onOpen={() => onOpenLicence(index)} />)}
        </Section>
      </>
    );
  }
  if (nav.page === "LicenseDetail") {
    const notice = diagnostics.notices[nav.licence];
    if (notice === undefined) return <EmptyState title="Unavailable" icon={<FileText aria-hidden />} />;
    return (
      <Section caption={`${notice.name} ${notice.version} · ${notice.licence}`}>
        {notice.source && <p className="break-all px-4 py-2 font-mono text-xs">{notice.source}</p>}
        {notice.flags.length > 0 && <p className="px-4 py-2 text-sm text-warn">{notice.flags.map((flag) => flagShown(Object.hasOwn(FLAGS, flag), FLAGS[flag] ?? "", flag)).join(" · ")}</p>}
        {notice.obligations.map((note) => <p key={note} className="px-4 py-2 text-sm text-muted-foreground">{note}</p>)}
        <pre className="whitespace-pre-wrap px-4 py-2 font-mono text-xs">{notice.text || "License text missing"}</pre>
      </Section>
    );
  }
  const count = diagnostics.log === "LogShown" ? diagnostics.problems.length : undefined;
  return (
    <>
      <div className="flex flex-col items-center gap-1 py-6">
        <span className="font-display text-3xl">Alpha</span>
        <span className="font-mono text-xs uppercase tabular-nums text-muted-foreground">{read.version ? (read.versionCode > 0 ? `${read.version} (${read.versionCode})` : read.version) : "Development preview"}</span>
      </div>
      <Section>
        {native && read.android && <SettingRow label="Android version" state={{ word: read.android }} />}
        {native && read.installedAt > 0 && <SettingRow label="Installed or last updated" state={{ word: new Date(read.installedAt).toLocaleDateString() }} />}
        {native && <SettingRow label="App info" onHandoff={onAppInfo} ariaLabel="Alpha's app info in Android" />}
        {onActivity && <SettingRow label="Agent activity" icon={<History aria-hidden className="size-5" />} onOpen={onActivity} />}
        <SettingRow label="Problem log" ariaLabel={count ? `Problem log, ${count}` : "Problem log"} state={count === undefined ? { word: "Unavailable" } : count > 0 ? { word: String(count), tone: "warn" } : undefined}
          onOpen={() => onOpen("Problems")} />
        {exportRow}
        <SettingRow label="Licenses" onOpen={() => onOpen("Licenses")} />
        {nav.developer && <SettingRow label="Update channel (development)" state={{ word: "Off" }} />}
      </Section>
    </>
  );
}
