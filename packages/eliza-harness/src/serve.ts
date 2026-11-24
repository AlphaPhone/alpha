import path from "node:path";
import type { Plugin } from "vite";
import type { RunningProvider } from "./providers/shared.ts";
import { startSlackProvider } from "./providers/slack-provider.ts";
import { startTelegramProvider } from "./providers/telegram-provider.ts";
import { startEliza } from "./services.ts";

/**
 * eliza's agent, cloud, and external messaging providers at the dev server's `/agent`, `/cloud`, `/slack`, and `/telegram`.
 * When `ALPHA_SLACK_URL` or `ALPHA_TELEGRAM_URL` is set, the proxy forwards to that external URL instead of starting a
 * local provider server. The proxy adds the agent's token, so the page never holds it, as on the phone. `apply` keeps it out of every build.
 */
export function eliza(): Plugin {
  let running: Awaited<ReturnType<typeof startEliza>> | undefined;
  let slackProvider: RunningProvider | undefined;
  let telegramProvider: RunningProvider | undefined;
  return {
    name: "alpha-eliza",
    apply: (_config, { command, isPreview }) => command === "serve" && !isPreview,
    async config() {
      const stateDir = process.env.ALPHA_ELIZA_STATE;
      running = await startEliza(stateDir);
      const externalSlack = process.env.ALPHA_SLACK_URL?.trim();
      const externalTelegram = process.env.ALPHA_TELEGRAM_URL?.trim();
      const slackTarget =
        externalSlack && externalSlack.length > 0
          ? externalSlack
          : (slackProvider = await startSlackProvider({
              ...(stateDir ? { stateFile: path.join(stateDir, "slack-state.json") } : {}),
            })).origin;
      const telegramTarget =
        externalTelegram && externalTelegram.length > 0
          ? externalTelegram
          : (telegramProvider = await startTelegramProvider({
              ...(stateDir ? { stateFile: path.join(stateDir, "telegram-state.json") } : {}),
            })).origin;
      const { agent, cloud, key } = running;
      const under = (prefix: string) => (route: string) => route.slice(prefix.length) || "/";
      return {
        server: {
          proxy: {
            "/agent": { target: agent.origin, rewrite: under("/agent"), headers: { authorization: `Bearer ${agent.token}` } },
            "/cloud": { target: cloud.local, rewrite: under("/cloud"), headers: { authorization: `Bearer ${key.token}` } },
            "/slack": { target: slackTarget, rewrite: under("/slack"), changeOrigin: true },
            "/telegram": { target: telegramTarget, rewrite: under("/telegram"), changeOrigin: true },
          },
        },
      };
    },
    configureServer(server) {
      server.httpServer?.once("close", () => {
        void Promise.allSettled([running?.stop(), slackProvider?.stop(), telegramProvider?.stop()]);
      });
    },
  };
}
