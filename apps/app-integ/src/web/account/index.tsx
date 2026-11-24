// spec/account/signIn.md, "Sign-in is shown as the required page, the first-run page, or the dialog the owner opened"; spec/account/sheet.md, "The plan notice shows on Home only, until dismissed, and never under a covering screen"; spec/account/sheet.md, "The sheet shows one section at a time, and Android Home closes it"; spec/account/signIn.md, "Back ends the step in flight, then the code step, then the dialog; the required page keeps its chooser"
import { Effect } from "effect";
import { UserRound } from "lucide-react";
import { useMachine as useSession } from "../../../gen/account__session.react.ts";
import { initial as sessionInitial } from "../../../gen/account__session.ts";
import { useMachine as useSheet } from "../../../gen/account__sheet.react.ts";
import { initial as sheetInitial } from "../../../gen/account__sheet.ts";
import { useMachine as useSignIn } from "../../../gen/account__signIn.react.ts";
import { initial as signInInitial, pageShown } from "../../../gen/account__signIn.ts";
import { authorityOf } from "../../account/deployment.ts";
import { AccountBindings, type AccountRows } from "../../account/bindings.vibe";
import { AccountPresentation } from "../../account/presentation.vibe";
import { AccountSheet } from "../../account/sheet.vibe";
import type { AppId, AppScreen, AppSurface } from "../app-screen.ts";
import { AccountChips, quietChips } from "./AccountChips.tsx";
import { AccountScreen } from "./AccountScreen.tsx";
import { PlanNotice } from "./PlanNotice.tsx";
import { SignInHost } from "./SignInHost.tsx";
import { act, ask, useServiceStream } from "../shell/services.ts";
import { runtime } from "./runtime.ts";

/** What the shell gives an always-mounted account surface. */
export interface AccountSurfaceProps {
  /** Open an app at a route. */
  readonly open: (app: AppId, route?: string) => void;
}

/** What the sign-in page surface takes from the shell. */
export type SignInPageProps = AccountSurfaceProps;

/** What the plan notice surface takes from the shell. */
export type PlanNoticeSurfaceProps = AccountSurfaceProps;

/** The required or first-run sign-in page above every screen while the phone needs a sign-in; it steps aside while own keys are entered. */
export function SignInPage({ open }: SignInPageProps) {
  const { state: signIn = signInInitial } = useSignIn(runtime);
  const { state: session = sessionInitial } = useSession(runtime);
  if (!pageShown(signIn)) return null;
  return (
    <div className="fixed inset-0 overflow-y-auto bg-background">
      <SignInHost serviceName={authorityOf(session.deployment, session.environment).name} onOwnKeys={() => open("account", "provider")} />
    </div>
  );
}

/** The plan notice on Home. */
export function PlanNoticeSurface({ open }: PlanNoticeSurfaceProps) {
  const { state: sheet = sheetInitial } = useSheet(runtime);
  return (
    <PlanNotice
      sheet={sheet} onOpen={() => open("account", "plans")}
      onDismiss={() => act(Effect.flatMap(Effect.service(AccountSheet), (s) => s.dismissPlan()))}
    />
  );
}

/** The account's chips for the access walkthrough's Ready card, kept current from the account; the shell mounts it inside the card. */
export function ReadyAccountChips() {
  const chips = useServiceStream("account/ready", Effect.map(Effect.service(AccountBindings), (b) => b.ready), quietChips);
  return <AccountChips chips={chips} />;
}

const signedOutRows: AccountRows = { account: "Signed out", provider: "Cloud" };

/** The values Settings shows on its Account row (the email or the sign-in state) and its AI provider row (Own key or Cloud). */
export function useAccountRows(): AccountRows {
  return useServiceStream("account/rows", Effect.map(Effect.service(AccountBindings), (b) => b.rows), signedOutRows);
}

/** Hardware or gesture Back in Account: the own-keys form, a sign-in step, a key removal review, a section or a sign-out review takes it first. */
export function accountBack(): Promise<boolean> {
  return ask(Effect.flatMap(Effect.service(AccountPresentation), (p) => p.back()), false);
}

/** The Account app. */
export const screens: AppScreen[] = [{ id: "account", title: "Account", icon: UserRound, availability: "everywhere", Screen: AccountScreen, back: accountBack }];

/** The sign-in page and the plan notice. */
export const surfaces: AppSurface[] = [
  { id: "account-sign-in", slot: "overlay", availability: "everywhere", Surface: SignInPage },
  { id: "account-plan-notice", slot: "notices", availability: "everywhere", Surface: PlanNoticeSurface },
];
