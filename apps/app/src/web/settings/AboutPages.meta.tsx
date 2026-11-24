// spec/settings/diagnostics.md, "Story: See what went wrong and share it with support"; spec/settings/diagnostics.md, "Story: Read the licences Alpha ships"
import type { ComponentMeta } from "vibestack/stories";
import { initial as nav } from "../../../gen/settings.ts";
import { initial as diagnostics } from "../../../gen/settings__diagnostics.ts";
import { general, notices, problems } from "./fixtures.ts";
import type { AboutPagesProps } from "./AboutPages.tsx";

const none = () => undefined;
const base: AboutPagesProps = {
  nav: { ...nav, page: "About" }, facts: general.facts, native: true, diagnostics: problems, onOpen: none, onOpenLicence: none, onAppInfo: none, onActivity: none,
  aboutActs: { readLog: none, askClear: none, cancelClear: none, clear: none, exportReport: none, loadLicences: none },
};

export const meta: ComponentMeta<AboutPagesProps> = {
  args: base,
  states: {
    ProblemLog: { ...base, nav: { ...nav, page: "Problems" } },
    ClearFailed: { ...base, nav: { ...nav, page: "Problems" }, diagnostics: { ...problems, clearFailed: true } },
    ExportFailed: { ...base, diagnostics: { ...problems, exportState: "ExportFailed" } },
    LogUnavailable: { ...base, nav: { ...nav, page: "Problems" }, diagnostics: { ...diagnostics, log: "LogUnavailable" } },
    Licences: { ...base, nav: { ...nav, page: "Licenses" }, diagnostics: notices },
    FlaggedLicence: { ...base, nav: { ...nav, page: "LicenseDetail", licence: 1 }, diagnostics: notices },
    LicencesUnavailable: { ...base, nav: { ...nav, page: "Licenses" }, diagnostics: { ...diagnostics, licences: "NoticesUnavailable" } },
    Browser: { ...base, native: false, onActivity: undefined },
  },
};
