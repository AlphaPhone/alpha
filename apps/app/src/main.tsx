// spec/app/slack/auth.md, "OAuth callback verifies the state nonce and exchanges the secret code and PKCE verifier; only user tokens (`UserToken`) are admitted"
import { deliverSlackReturn } from "./platform/slack-return.vibe";

if (deliverSlackReturn()) {
  const { createRoot } = await import("react-dom/client");
  createRoot(document.getElementById("root")!).render(<main>Return to Alpha to finish connecting Slack.</main>);
} else {
  await import("./start.tsx");
}
