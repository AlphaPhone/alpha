// spec/app/account/google.md, "Story: See my Google accounts"; spec/app/account/google.md, "Story: Connect a Google account"; spec/app/account/google.md, "Story: Disconnect a Google account"; spec/app/account/access.md, "Story: Decide what the agent may change in Google"
import { Banner, Button, Card, CardTitle, ConfirmDialog, ListGroup, ListRow, Switch } from "@repo/ui";
import { shown } from "../../gen/app__account__access.ts";
import { useMachine as useAccess } from "../../gen/app__account__access.react.ts";
import type { Note } from "../../gen/app__account__google.ts";
import { useMachine as useGoogle } from "../../gen/app__account__google.react.ts";
import { currentSignIn } from "../../gen/app__account__session.ts";
import { useMachine as useSession } from "../../gen/app__account__session.react.ts";
import { untimed } from "../runtime/index.vibe";
import { type AccountRuntime, useAccountShelf, useAccountTimed } from "./useAccount.ts";

const googleNotes: Partial<Record<Note, string>> = {
  Denied: "Google connection was declined in the browser.",
  Failed: "Google connection couldn’t be completed.",
  Narrowed: "A connected Google account now grants fewer permissions than before.",
  Disconnected: "Google account disconnected.",
  StillConnected: "That Google account is still connected.",
  Unconfirmed: "Couldn’t confirm the Google disconnect. Refresh to check.",
  CutByRestart: "Alpha restarted during Google sign-in. Checking connected accounts…",
};

/** Connected Google accounts, OAuth connect/disconnect, and per-sign-in agent write toggles. */
export function GoogleView({ runtime }: { readonly runtime: AccountRuntime }) {
  const session = useAccountTimed(runtime, useSession);
  const google = useAccountTimed(runtime, useGoogle);
  const access = useAccountTimed(runtime, useAccess);
  const shelf = useAccountShelf(runtime);

  const sesState = session.state;
  const gooState = google.state;
  const accState = access.state;
  if (!sesState || !gooState || !accState) return null;

  const signIn = currentSignIn(sesState);
  const switches = shown(accState);
  const noteText = googleNotes[gooState.note];
  const connectEvent = { type: "connect", read: true, modify: true, send: true, signIn, origin: "ByOwner", now: untimed } as const;
  const refreshEvent = { type: "refresh", signIn } as const;
  const leavingDisplay = shelf.googleAccounts.find((item) => item.id === gooState.leaving);

  return (
    <div className="space-y-3">
      {noteText ? (
        <Banner variant={gooState.note === "Disconnected" ? "info" : "warn"}>{noteText}</Banner>
      ) : null}

      {accState.trouble === "NotSaved" ? (
        <Banner variant="destructive">Couldn’t save agent access settings. Showing enforced values.</Banner>
      ) : null}

      {gooState.tab.open ? (
        <Banner
          variant="info"
          action={<Button size="sm" variant="secondary" onClick={() => { void google.send({ type: "stopWaiting" }); }}>Check accounts</Button>}
        >
          Finish connecting Google in your browser…
        </Banner>
      ) : null}

      <Card className="space-y-2 p-4">
        <CardTitle>Google & email</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={!google.can(connectEvent)}
            onClick={() => { void google.send(connectEvent); }}
          >
            Connect Google
          </Button>
          <Button
            size="sm"
            variant="secondary"
            loading={gooState.list.status === "Loading"}
            disabled={!google.can(refreshEvent)}
            onClick={() => { void google.send(refreshEvent); }}
          >
            Refresh Google
          </Button>
        </div>
      </Card>

      <ListGroup heading="Connected accounts">
        {gooState.links.length === 0 ? (
          <ListRow title="No Google accounts connected" detail="Connect an account to access Gmail and Calendar." />
        ) : (
          gooState.links.map((link) => {
            const meta = shelf.googleAccounts.find((item) => item.id === link.id);
            const rights = [
              link.read ? "Read" : null,
              link.modify ? "Modify" : null,
              link.send ? "Send" : null,
            ].filter(Boolean).join(", ") || "Limited";
            return (
              <ListRow
                key={link.id}
                title={meta?.email || `Google account #${link.id}`}
                detail={`Permissions: ${rights}`}
                trailing={
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!google.can({ type: "askDisconnect", account: link.id })}
                    onClick={() => { void google.send({ type: "askDisconnect", account: link.id }); }}
                  >
                    Disconnect
                  </Button>
                }
              />
            );
          })
        )}
      </ListGroup>

      <ListGroup heading="Agent access to Google">
        <ListRow
          title="Allow agent Gmail changes"
          detail="Labelling, archiving, marking read, and sending mail"
          asChild
          trailing={
            <Switch
              id="account-google-access-mail"
              checked={switches.mail}
              disabled={!access.can({ type: "setAccess", which: "MailChanges", on: !switches.mail, origin: "ByOwner" })}
              onCheckedChange={(checked) => { void access.send({ type: "setAccess", which: "MailChanges", on: checked, origin: "ByOwner" }); }}
            />
          }
        >
          <label htmlFor="account-google-access-mail" />
        </ListRow>
        <ListRow
          title="Allow agent Calendar edits"
          detail="Creating, updating, and deleting calendar events"
          asChild
          trailing={
            <Switch
              id="account-google-access-calendar"
              checked={switches.calendar}
              disabled={!access.can({ type: "setAccess", which: "CalendarEdits", on: !switches.calendar, origin: "ByOwner" })}
              onCheckedChange={(checked) => { void access.send({ type: "setAccess", which: "CalendarEdits", on: checked, origin: "ByOwner" }); }}
            />
          }
        >
          <label htmlFor="account-google-access-calendar" />
        </ListRow>
      </ListGroup>

      <ConfirmDialog
        open={gooState.review.showing}
        title="Disconnect Google account?"
        confirmLabel="Confirm disconnect"
        cancelLabel="Keep connected"
        destructive
        onConfirm={() => { void google.send({ type: "confirmDisconnect" }); }}
        onCancel={() => { void google.send({ type: "keepAccount" }); }}
      >
        {leavingDisplay?.email
          ? `Disconnect ${leavingDisplay.email}? Calendar sync will pause and cached mail will be forgotten once confirmed.`
          : "Calendar sync will pause and cached mail will be forgotten once Cloud confirms the disconnect."}
      </ConfirmDialog>
    </div>
  );
}
