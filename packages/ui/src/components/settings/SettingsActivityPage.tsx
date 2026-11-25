import type { ReactNode } from "react";
import { RotateCw, Wrench } from "lucide-react";
import { Banner } from "../Banner.tsx";
import { EmptyState } from "../EmptyState.tsx";
import { ListGroup } from "../ListGroup.tsx";
import { ListRow } from "../ListRow.tsx";
import { Skeleton } from "../Skeleton.tsx";
import { Spinner } from "../Spinner.tsx";
import { SettingsActionRow } from "./SettingsActionRow.tsx";
import { SettingsAgentRecovery, type SettingsAgentRecoveryProps } from "./SettingsAgentRecovery.tsx";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import type { Neighbour } from "./vocabulary.ts";

/** An action as the approvals area recorded it: what it was, whether it can still be declined, whether its outcome is unsettled. */
export type SettingsActionItem = {
  proposal: string;
  title: string;
  detail?: string;
  outcome?: string;
  declinable: boolean;
  unsettled: boolean;
};

export type SettingsActivityPageProps = {
  /** The agent's connection as the account area reports it. */
  connection: "ready" | SettingsAgentRecoveryProps["connection"];
  /** The actions the journal held when last read; kept when a later read fails. */
  actions: SettingsActionItem[];
  /** The journal is being read. */
  reading?: boolean;
  /** The last read failed or was not answered in time. */
  failed?: boolean;
  /** The last decision was sent or attempted and the agent could not confirm it. */
  unconfirmed?: boolean;
  /** The conversations, owned by Ask Alpha: New, History and each saved conversation, above the phone actions as Alpha's earlier build had them. */
  children?: ReactNode;
  /** This is a development build, which links the agent's restart details. */
  development?: boolean;
  /** Goes back to About. */
  onBack?: () => void;
  /** Asks the account area to restart Alpha or to try again. */
  onRecover?: SettingsAgentRecoveryProps["onRecover"];
  /** Reads the journal again; offered while the agent is ready and no read is in flight. */
  onRefresh?: () => void;
  /** Declines a proposal. */
  onDecline?: (proposal: string) => void;
  /** Says whether an action whose outcome the agent could not see happened. */
  onReconcile?: (proposal: string, happened: boolean) => void;
  /** Hands over to the account area for the agent's restart details. */
  onHandOver?: (neighbour: Neighbour) => void;
};

/**
 * Agent activity: what to do when the agent needs a restart or another try, the conversations, and the actions the
 * agent took or proposed on the phone, read again from their own row, each on its own card, declined or settled by the
 * owner.
 * @model spec/app/settings/activity.md
 */
export function SettingsActivityPage({ connection, actions, reading = false, failed = false, unconfirmed = false, children, development = false, onBack, onRecover, onRefresh, onDecline, onReconcile, onHandOver }: SettingsActivityPageProps) {
  const ready = connection === "ready";
  return (
    <SettingsPage title="Agent activity" onBack={onBack} backLabel="Back to About">
      {ready ? null : <SettingsAgentRecovery connection={connection} onRecover={onRecover} />}
      {children}
      {unconfirmed ? <Banner variant="warn">Alpha could not confirm the action decision</Banner> : null}
      {failed ? <Banner variant="warn">The actions could not be read{actions.length ? ". Showing the last read" : ""}</Banner> : null}
      {development ? (
        <ListGroup>
          <SettingsNavRow title="Restart details" icon={<Wrench />} onOpen={onHandOver && (() => onHandOver("restart-details"))} />
        </ListGroup>
      ) : null}
      {ready ? (
        <ListGroup>
          <ListRow
            title="Phone actions"
            aria-label={reading ? "Loading phone actions" : "Refresh phone actions"}
            leading={<RotateCw />}
            trailing={reading ? <Spinner size="sm" label="Working" /> : undefined}
            onClick={reading ? undefined : onRefresh}
          />
        </ListGroup>
      ) : null}
      {ready ? actions.map((action) => (
        <ListGroup key={action.proposal}>
          <SettingsActionRow
            title={action.title}
            detail={[action.outcome, action.detail].filter(Boolean).join(" · ")}
            declinable={action.declinable}
            unsettled={action.unsettled}
            onDecline={onDecline && (() => onDecline(action.proposal))}
            onReconcile={onReconcile && ((happened) => onReconcile(action.proposal, happened))}
          />
        </ListGroup>
      )) : null}
      {ready && !actions.length && reading ? <Skeleton className="h-16 rounded-lg" /> : null}
      {ready && !actions.length && !reading && !failed ? <EmptyState title="No phone actions" /> : null}
      {!ready && connection !== "unpackaged" ? <EmptyState title="Actions load when the agent is ready" /> : null}
    </SettingsPage>
  );
}
