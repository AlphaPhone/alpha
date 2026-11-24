// spec/kit/read.md, "Story: Read from outside"
import type { Account } from "@elizaos/cloud/client";
import { busy } from "./platform.ts";
import type { Route } from "./routes.ts";

/** The owner's account as eliza's cloud answers `GET /api/v1/user`: typed by eliza's own client, so a change of its shape stops this compiling. */
export const account: Account = { id: "u1", email: "owner@alpha.test", phone: null, name: "owner", organization_id: "o1", organization: { id: "o1", name: "owner" } };

/** What the fake cloud answers for the platform itself; an area adds its own routes beside it in scene.ts. */
export function cloudRoutes(): Route[] {
  return [
    (request, url) => (request.method === "GET" && url.pathname === "/api/v1/user" ? Response.json({ success: true, data: account }) : undefined),
    (request, url) => (request.method === "GET" && url.pathname === "/api/v1/platform/busy" ? busy(Number(url.searchParams.get("status"))) : undefined),
  ];
}
