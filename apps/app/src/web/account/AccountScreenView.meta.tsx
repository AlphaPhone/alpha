import type { ComponentMeta } from "vibestack/stories";
import { initial as billingInitial } from "../../../gen/account__billing.ts";
import { initial as planInitial } from "../../../gen/account__plan.ts";
import type { AccountScreenViewProps } from "./AccountScreenView.tsx";
import {
  accessSaved, boundPlan, bridgeAllowed, dedicatedReview, delegationConnected, delegationDetails, details, detailsUnread, earlierUnconfirmed,
  expiringSheet, googleConnected, googleRows, keyRefused, longDetails, managerOnPlus, manyGoogleRows, manyPendingRevocations, newAccount, onPlus,
  openSheet, providerCloud, reviewingSignOut, reviewingVoiceRemoval, signedIn, summaryUnread,
} from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<AccountScreenViewProps> = {
  args: {
    session: signedIn, sheet: openSheet, billing: onPlus, admission: boundPlan, google: googleConnected, access: accessSaved, delegation: delegationConnected,
    provider: providerCloud, bridge: bridgeAllowed, dedicated: dedicatedReview, summary: summaryUnread, details, accounts: googleRows, delegationDetails,
    serviceName: "Alpha Cloud", ownKeys: false,
    onClose: none, onSection: none, onBack: none, onSignInAgain: none, onToggleCode: none, onRedeem: none, onAskSignOut: none, onConfirmSignOut: none,
    onCancelSignOut: none, onAddFunds: none, onLeaveOwnKeys: none,
    providerActs: { onSave: none, onChoose: none, onAskRemove: none, onCancelRemove: none, onConfirmRemove: none, onReveal: none, onRefresh: none },
    planActs: {
      onSubscribe: none, onChange: none, onCancel: none, onKeep: none, onSendCode: none, onVerifyCode: none, onConfirmChange: none, onConfirmCancel: none,
      onApplyReferral: none, onShareReferral: none,
    },
    googleActs: { onConnect: none, onAllowCalendar: none, onCancel: none, onDisconnect: none, onReload: none, onAccess: none },
    delegationActs: { onStart: none, onCheck: none, onCancel: none, onReviewRemoval: none, onRetryDisconnect: none },
    developerActs: { onBridgeSignIn: none, onBridgeCancel: none, onReview: none, onAccept: none, onDecline: none, onPoll: none, onFinalize: none },
  },
  examples: {
    Reading: { billing: { ...billingInitial, configured: true, owner: 1 }, admission: { ...planInitial, credential: 1 }, details: detailsUnread },
    NewAccount: { session: newAccount, details: longDetails },
    CheckDevices: { session: { ...earlierUnconfirmed, revocation: "HereOnly" } },
    SignInEnding: { sheet: expiringSheet },
    KeyRefused: { session: keyRefused },
    SignOutReview: { sheet: reviewingSignOut },
    PlansFailed: { sheet: { ...openSheet, section: "PlansSection" }, billing: { ...managerOnPlus, manager: "ManagerFailed" } },
    GoogleAccounts: { sheet: { ...openSheet, section: "GoogleSection" }, accounts: manyGoogleRows },
    HostedResults: { sheet: { ...openSheet, section: "DelegationSection" }, delegationDetails: manyPendingRevocations },
    OwnKeys: { ownKeys: true },
    ProviderRemoval: { sheet: { ...openSheet, section: "ProviderSection" }, provider: reviewingVoiceRemoval },
  },
};
