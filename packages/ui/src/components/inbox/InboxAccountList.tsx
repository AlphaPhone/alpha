import { ListGroup } from "../ListGroup.tsx";
import { ListRow } from "../ListRow.tsx";
import { StatusDot } from "../StatusDot.tsx";
import { Avatar } from "../Avatar.tsx";

export type InboxAccount = {
  /** Names the account among the others. */
  id: string;
  /** The Gmail address. */
  email: string;
  /** What Google's consent allows for it: reading, sending, changing the mailbox. */
  grant: { read: boolean; send: boolean; modify: boolean };
};

export type InboxAccountListProps = {
  /** The connected accounts, each under its own grant. */
  accounts: InboxAccount[];
  /** The account read now. */
  selected?: string;
  /** Called with the account chosen; an account is offered only while it is connected and is not the one read. */
  onChoose?: (id: string) => void;
  /** Where the rows stand: on a screen, or plain on a sheet. */
  surface?: "card" | "plain";
};

const standing = ({ read, send, modify }: InboxAccount["grant"]) =>
  !read ? { status: "off", label: "Needs access" } : !send && !modify ? { status: "warn", label: "Read only" } : { status: "ok", label: "Connected" };

/**
 * The connected Google accounts, each marked by what its grant allows: one that cannot be read shows only the request
 * to give access.
 *
 * @model spec/app/inbox/index.md
 */
export function InboxAccountList({ accounts, selected, onChoose, surface = "plain" }: InboxAccountListProps) {
  return (
    <ListGroup surface={surface}>
      {accounts.map(({ id, email, grant }) => {
        const { status, label } = standing(grant);
        return (
          <ListRow
            key={id}
            title={email}
            leading={<Avatar name={email} size="sm" />}
            trailing={<StatusDot status={status as "ok" | "warn" | "off"} label={label} />}
            selected={id === selected}
            onClick={onChoose && id !== selected ? () => onChoose(id) : undefined}
          />
        );
      })}
    </ListGroup>
  );
}
