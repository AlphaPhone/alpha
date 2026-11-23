import type { ComponentMeta } from "vibestack/stories";
import type { SourceReviewProps } from "./SourceReview.tsx";
import { googleImpact, grantGranted, grantReviewing, phoneCalendars, phoneSources } from "./fixtures.ts";

const none = () => undefined;
const can = { startGrant: true, approve: true, cancel: true, consent: true, revokeConsent: true, revokeGrant: true };

export const meta: ComponentMeta<SourceReviewProps> = {
  args: {
    open: true, sources: grantReviewing, onPhone: true, phoneSources: [], can,
    onOpenChange: none, onStartGrant: none, onApprove: none, onCancel: none, onChooseCalendars: none, onAllow: none, onRenew: none,
    onRevokeConsent: none, onReviewRevoke: none, onRevokeGrant: none, onCloseRevoke: none,
  },
  examples: {
    CalendarsListed: { calendars: phoneCalendars },
    PermissionDenied: { calendars: { status: "permission-denied" } },
    Renewing: { calendars: phoneCalendars, phoneSources, renewing: "src1" },
    Granted: { sources: grantGranted, phoneSources },
    RemoveGoogleAccess: { sources: grantGranted, impact: googleImpact },
    InTheBrowser: { onPhone: false },
  },
};
