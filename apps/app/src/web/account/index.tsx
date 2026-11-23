// spec/account/signIn.md, "Sign-in is shown as the required page, the first-run page, or the dialog the owner opened"; spec/account/sheet.md, "The plan notice shows on Home only, until dismissed, and never under a covering screen"
import { Effect } from "effect";
import { UserRound } from "lucide-react";
import { useMachine as useSession } from "../../../gen/account__session.react.ts";
import { initial as sessionInitial } from "../../../gen/account__session.ts";
import { useMachine as useSheet } from "../../../gen/account__sheet.react.ts";
import { initial as sheetInitial } from "../../../gen/account__sheet.ts";
import { useMachine as useSignIn } from "../../../gen/account__signIn.react.ts";
import { initial as signInInitial, pageShown } from "../../../gen/account__signIn.ts";
import { authorityOf, deployment, environmentFor } from "../../account/deployment.ts";
import { AccountSheet } from "../../account/sheet.vibe";
import type { AppId, AppScreen, AppSurface } from "../app-screen.ts";
import { AccountScreen } from "./AccountScreen.tsx";
import { PlanNotice } from "./PlanNotice.tsx";
import { SignInHost } from "./SignInHost.tsx";
import { act, runtime } from "./runtime.ts";

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
      <SignInHost serviceName={authorityOf(deployment, environmentFor(session.testMocks)).name} onOwnKeys={() => open("account", "provider")} />
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

/** The Account app. */
export const screens: AppScreen[] = [{ id: "account", title: "Account", icon: UserRound, availability: "everywhere", Screen: AccountScreen }];

/** The sign-in page and the plan notice. */
export const surfaces: AppSurface[] = [
  { id: "account-sign-in", slot: "overlay", availability: "everywhere", Surface: SignInPage },
  { id: "account-plan-notice", slot: "notices", availability: "everywhere", Surface: PlanNoticeSurface },
];
