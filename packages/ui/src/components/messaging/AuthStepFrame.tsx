import type { ComponentProps, ReactNode } from "react";
import { ArrowLeft, Hash, Send, ShieldCheck } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { Banner } from "../Banner.tsx";
import { Button } from "../Button.tsx";
import { Card, CardFooter, CardTitle } from "../Card.tsx";

/** One OAuth or account scope presented in a user-consent step. */
export type AuthScopeItem = {
  /** Exact scope identifier, such as `channels:read`. */
  scope: string;
  /** Short plain-language summary of what the scope allows. */
  description: string;
};

/** Primary or secondary action button for an authentication step. */
export type AuthStepAction = {
  /** Button label. */
  label: string;
  /** Invoked when pressed. */
  onClick?: () => void;
  /** Shows progress and blocks repeat presses while in flight. */
  loading?: boolean;
  /** Disables the button, such as during a flood-wait cooldown or invalid input. */
  disabled?: boolean;
};

export type AuthStepFrameProps = Omit<ComponentProps<"section">, "title"> & {
  /** Messaging service being signed into. */
  platform: "Telegram" | "Slack";
  /** Step heading. */
  title: string;
  /** Optional concise step subtitle, such as destination phone or workspace name. */
  subtitle?: string;
  /** Explicit user-account statement shown on every sign-in step; defaults to `"User account · no bot token"`. */
  accountNotice?: string;
  /** Error message rendered in a destructive banner. */
  error?: string;
  /** Flood-wait or cooldown notice rendered in a warning banner. */
  waitNotice?: string;
  /** Optional custom banner slot. */
  banner?: ReactNode;
  /** Exact user scopes shown for OAuth consent review. */
  scopes?: AuthScopeItem[];
  /** Main step fields or QR view. */
  children?: ReactNode;
  /** Primary continue or submit action. */
  primaryAction?: AuthStepAction;
  /** Optional secondary action, such as QR sign-in or resending a code. */
  secondaryAction?: AuthStepAction;
  /** Returns to the previous authentication step; button shown only when provided. */
  onBack?: () => void;
};

/**
 * Token-styled authentication step card shared by Telegram Phone / OTP / 2FA / QR sign-in and Slack OAuth2 user
 * scope consent, surfacing user-account guarantees, error or flood-wait banners and step actions.
 */
export function AuthStepFrame({
  platform,
  title,
  subtitle,
  accountNotice = "User account · no bot token",
  error,
  waitNotice,
  banner,
  scopes,
  children,
  primaryAction,
  secondaryAction,
  onBack,
  className,
  ...props
}: AuthStepFrameProps) {
  return (
    <section aria-label={title} className={cn("mx-auto w-full max-w-md", className)} {...props}>
      <Card className="gap-4 p-5">
        <div className="flex items-start gap-3">
          {onBack ? (
            <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack} className="-mt-1 -ml-2">
              <ArrowLeft />
            </Button>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              {platform === "Slack" ? <Hash aria-hidden className="size-3.5" /> : <Send aria-hidden className="size-3.5" />}
              <span>{platform}</span>
            </div>
            <CardTitle>{title}</CardTitle>
            {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground">
          <ShieldCheck aria-hidden className="size-4 shrink-0 text-ok" />
          <span>{accountNotice}</span>
        </div>
        {error ? <Banner variant="destructive">{error}</Banner> : null}
        {waitNotice ? <Banner variant="warn">{waitNotice}</Banner> : null}
        {banner}
        {scopes && scopes.length > 0 ? (
          <ul aria-label="Requested user scopes" className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
            {scopes.map((item) => (
              <li key={item.scope} className="flex flex-col gap-0.5">
                <span className="font-mono text-xs font-medium text-foreground">{item.scope}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {children ? <div className="flex flex-col gap-3">{children}</div> : null}
        {primaryAction || secondaryAction ? (
          <CardFooter className="flex-wrap justify-end pt-1">
            {secondaryAction ? (
              <Button variant="secondary" loading={secondaryAction.loading} disabled={secondaryAction.disabled} onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            ) : null}
            {primaryAction ? (
              <Button variant="primary" loading={primaryAction.loading} disabled={primaryAction.disabled} onClick={primaryAction.onClick}>
                {primaryAction.label}
              </Button>
            ) : null}
          </CardFooter>
        ) : null}
      </Card>
    </section>
  );
}
