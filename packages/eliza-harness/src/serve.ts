import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Plugin } from "vite";
import type { RunningProvider } from "./providers/shared.ts";
import { startSlackProvider } from "./providers/slack-provider.ts";
import { startTelegramProvider } from "./providers/telegram-provider.ts";
import { type RealModel, startEliza } from "./services.ts";

/**
 * The model the agent pack asks its cloud for (spec/agent/index.md, `cloudModel`), which Cerebras serves on its own API
 * and behind Cloud, with the output cap the hosted cloud's profile holds for it (apps/cloud/profile).
 */
const alphaModel = { model: "qwen-3.8-27b", defaultMaxTokens: 40_960 };

/** The origin `ALPHA_DEV_CLOUD_BASE_URL` names, over https: the operator's key goes in the clear to no other kind. */
function hostedCloud() {
  const origin = URL.parse(process.env.ALPHA_DEV_CLOUD_BASE_URL ?? "");
  if (origin?.protocol !== "https:") throw new Error("ALPHA_DEV_MODEL=cloud asks for ALPHA_DEV_CLOUD_BASE_URL, the hosted Cloud's https origin");
  return `${origin.origin}/api/v1`;
}

/**
 * The real models `ALPHA_DEV_MODEL` names, each with the file its key is kept in: `cerebras`, Cerebras's own API on the
 * owner's key, which no Cloud bills, and `cloud`, the hosted eliza Cloud at `ALPHA_DEV_CLOUD_BASE_URL` on the
 * operator's inference key, which that Cloud bills.
 */
const realModels = {
  cerebras: { baseUrl: () => "https://api.cerebras.ai/v1", keyFile: ".config/alphaphone/cerebras-key" },
  cloud: { baseUrl: hostedCloud, keyFile: ".eliza/cloud-agent-key" },
} as const;

const isNamed = (name: string): name is keyof typeof realModels => Object.hasOwn(realModels, name);

/** The real model the dev server's owner talks to in place of the scripted one, where `ALPHA_DEV_MODEL` names one. */
function realModel(): RealModel | undefined {
  const name = process.env.ALPHA_DEV_MODEL ?? "";
  if (name === "") return undefined;
  if (!isNamed(name)) throw new Error(`ALPHA_DEV_MODEL names ${Object.keys(realModels).join(" or ")}, not ${name}`);
  const { baseUrl, keyFile } = realModels[name];
  const file = path.join(os.homedir(), keyFile);
  const key = fs.readFileSync(file, "utf8").trim();
  if (key === "") throw new Error(`the key file ${file} is empty`);
  return { baseUrl: baseUrl(), ...alphaModel, key };
}

/**
 * eliza's agent, cloud, and external messaging providers at the dev server's `/agent`, `/cloud`, `/slack`, and `/telegram`:
 * the processes the journeys start (services.ts), over state of this run alone; the agent's is kept in the directory
 * `ALPHA_ELIZA_STATE` names, where one is named. The cloud's model is the scripted one, or the real one `ALPHA_DEV_MODEL`
 * names. When `ALPHA_SLACK_URL` or `ALPHA_TELEGRAM_URL` is set, the proxy forwards to that external URL instead of starting
 * a local provider server. The proxy adds the agent's token, so the page never holds it, as on the phone. `apply` keeps it
 * out of every build.
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
      running = await startEliza(stateDir, realModel());
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
