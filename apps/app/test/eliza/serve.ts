import type { Plugin } from "vite";
import { startEliza } from "./services.ts";

/**
 * eliza's agent and cloud at the dev server's /agent and /cloud: the processes the journeys start (services.ts), over
 * state of this run alone; the agent's is kept in the directory `ALPHA_ELIZA_STATE` names, where one is named. The proxy adds the agent's token, so
 * the page never holds it, as on the phone. `apply` keeps it out of every build.
 */
export function eliza(): Plugin {
  let running: Awaited<ReturnType<typeof startEliza>> | undefined;
  return {
    name: "alpha-eliza",
    apply: (_config, { command, isPreview }) => command === "serve" && !isPreview,
    async config() {
      running = await startEliza(process.env.ALPHA_ELIZA_STATE);
      const { agent, cloud, key } = running;
      const under = (prefix: string) => (route: string) => route.slice(prefix.length);
      return {
        server: {
          proxy: {
            "/agent": { target: agent.origin, rewrite: under("/agent"), headers: { authorization: `Bearer ${agent.token}` } },
            // The proxy adds the device key, as the phone's `ElizaCloud` plugin does: the page never holds it either.
            "/cloud": { target: cloud.local, rewrite: under("/cloud"), headers: { authorization: `Bearer ${key.token}` } },
          },
        },
      };
    },
    configureServer(server) {
      server.httpServer?.once("close", () => void running?.stop());
    },
  };
}
