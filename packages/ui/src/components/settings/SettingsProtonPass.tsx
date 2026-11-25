import { ChevronRight, ExternalLink, RotateCw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { ListGroup } from "../ListGroup.tsx";
import { ListRow } from "../ListRow.tsx";
import { SettingsFactRow } from "./SettingsFactRow.tsx";
import { SettingsReading } from "./SettingsReading.tsx";
import type { Reading } from "./vocabulary.ts";

export type SettingsProtonPassAction = "settings" | "install" | "open";

export interface SettingsProtonPassProps {
  installation: Reading;
  selection: Reading;
  autofill: Reading;
  extra?: "install" | "open";
  opening?: SettingsProtonPassAction;
  onAction?: (action: SettingsProtonPassAction) => void;
  onRefresh?: () => void;
}

/** The phone's provider metadata and explicit Android handoffs. @model spec/app/settings/facts.md */
export function SettingsProtonPass({ installation, selection, autofill, extra, opening, onAction, onRefresh }: SettingsProtonPassProps) {
  const [expanded, setExpanded] = useState(false);
  const disabled = !onAction || opening !== undefined;
  const extraTitle = extra === "open" ? "Open Proton Pass" : "Get Proton Pass";
  return (
    <ListGroup heading="Other">
      <ListRow title="Proton Pass" aria-label="Proton Pass" aria-expanded={expanded} leading={<SlidersHorizontal />}
        trailing={<span className="flex items-center gap-3.5"><SettingsReading reading={installation} /><ChevronRight aria-hidden /></span>}
        onClick={() => setExpanded((value) => !value)} />
      {expanded ? (
        <>
          <SettingsFactRow title="Selection" reading={selection} />
          <SettingsFactRow title="Autofill" reading={autofill} />
          <ListRow title={opening === "settings" ? "Opening…" : "Choose provider"} leading={<SlidersHorizontal />}
            trailing={<ExternalLink aria-hidden />} disabled={disabled} onClick={() => onAction?.("settings")} />
          {extra ? (
            <ListRow title={opening === extra ? "Opening…" : extraTitle} leading={<SlidersHorizontal />}
              trailing={extra === "open" ? <ChevronRight aria-hidden /> : <ExternalLink aria-hidden />}
              disabled={disabled} onClick={() => onAction?.(extra)} />
          ) : null}
          <ListRow title="Refresh" aria-label="Refresh password provider status" leading={<RotateCw />}
            disabled={!onRefresh || opening !== undefined} onClick={onRefresh ?? (() => undefined)} />
        </>
      ) : null}
    </ListGroup>
  );
}
