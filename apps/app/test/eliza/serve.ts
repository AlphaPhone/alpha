import type { Plugin } from "vite";
import { startEliza } from "./services.ts";

/**
 * eliza's agent and cloud at the dev server's /agent and /cloud: the processes the journeys start (services.ts), over
 * state of this run alone, or kept in the directory `ALPHA_ELIZA_STATE` names. The proxy adds the agent's token, so
 * the page never holds it, as on the phone. `apply` keeps it out of every build.
 */
export function eliza(): Plugin {
  let running: Awaited<ReturnType<typeof startEliza>> | undefined;
  return {
    name: "alpha-eliza",
    apply: (_config, { command, isPreview }) => command === "serve" && !isPreview,
    async config() {
      running = await startEliza(process.env.ALPHA_ELIZA_STATE);
      const { agent, cloud } = running;
      const under = (prefix: string) => (route: string) => route.slice(prefix.length);
      return {
        server: {
          proxy: {
            "/agent": { target: agent.origin, rewrite: under("/agent"), headers: { authorization: `Bearer ${agent.token}` } },
            // The cloud answers a browser only from its own web origin, which is not this server's.
            "/cloud": { target: cloud.local, rewrite: under("/cloud"), headers: { origin: cloud.web } },
          },
        },
      };
    },
    configureServer(server) {
      server.httpServer?.once("close", () => void running?.stop());
    },
  };
}
