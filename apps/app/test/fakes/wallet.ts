// spec/app/wallet/index.md, "Story: Make my wallet"; spec/app/wallet/transfer.md, "Story: Send"
import { type Route, readJsonBody } from "./routes.ts";

type Family = "evm" | "solana";

interface Holding { family: Family; chainId: string; asset: string; symbol: string; decimals: number; atomicUnits: string }
interface Asked { id: number; family: Family; asset: string; symbol: string; recipient: string; amount: string; asker: "owner" | "agent" }
interface Operation {
  intentId: string; family: Family; chainId: string; asset: string; symbol: string; decimals: number; atomicUnits: string;
  recipient: string; maximumFee: string; reservedAt: number; status: "notSent" | "pending" | "confirmed" | "failed"; operationRef: string;
}

/** What the fake agent's wallet holds, and how it behaves; a journey changes it between steps. No chain, no key: the accounts are made-up addresses. */
export interface WalletScene {
  custody: "none" | "ready" | "off";
  /** The phone gave the agent a storage key: without one it can seal no wallet, and a held wallet's keys cannot be opened. */
  storageKey: boolean;
  holdings: Holding[];
  /** The families whose network cannot be read. */
  unread: Family[];
  requests: Asked[];
  operations: Operation[];
  /** Every route answers 502, as a wallet whose network is down does. */
  unreachable: boolean;
  /** The sentence the next asking, review or approval is refused with, as when the wallet cannot cover a transfer or the desk is full; the refusal spends it. */
  refusal: string;
  /** An approval is signed and its broadcast is not acknowledged. */
  unresolved: boolean;
  /** A decision is taken and never answered, as when the phone dies before the agent replies. */
  stalled: boolean;
  /** How long a review stays good. */
  reviewFor: number;
  /** The open review of each request. */
  readonly reviews: Map<number, { intentId: string; commitment: string; expiresAt: number }>;
  /** Every wallet made, every asking and every decision the routes took, in order: a journey reads how often each was sent. */
  readonly made: number[];
  readonly askings: Record<string, unknown>[];
  readonly decisions: { id: number; decision: string }[];
  issued: number;
  opened: number;
}

const accounts = [
  { family: "evm", address: "0x52908400098527886E0F7030069857D2E4169EE7", chainId: "1", network: "Ethereum", nativeSymbol: "ETH", nativeDecimals: 18 },
  { family: "solana", address: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV", chainId: "mainnet", network: "Solana", nativeSymbol: "SOL", nativeDecimals: 9 },
] as const;

export function walletScene(): WalletScene {
  return {
    custody: "none", storageKey: true,
    holdings: [
      { family: "evm", chainId: "1", asset: "native", symbol: "ETH", decimals: 18, atomicUnits: "2500000000000000000" },
      { family: "solana", chainId: "mainnet", asset: "native", symbol: "SOL", decimals: 9, atomicUnits: "4000000000" },
    ],
    unread: [], requests: [], operations: [], unreachable: false, refusal: "", unresolved: false, stalled: false, reviewFor: 60_000,
    reviews: new Map(), made: [], askings: [], decisions: [], issued: 0, opened: 0,
  };
}

/** The agent asks for a transfer, as it does from a conversation: the request waits for the owner. */
export function agentAsks(scene: WalletScene, asked: Omit<Asked, "id" | "asker">) {
  scene.requests.push({ ...asked, id: ++scene.issued, asker: "agent" });
}

const refused = (error: string) => Response.json({ error, code: "refused" }, { status: 409 });

function status(scene: WalletScene) {
  const held = scene.custody !== "none";
  return {
    custody: !held ? "none" : !scene.storageKey ? "unavailable" : scene.custody,
    canHold: scene.storageKey,
    accounts: held ? accounts.map((account) => ({ ...account, connected: true, canSend: scene.custody === "ready" && scene.storageKey })) : [],
  };
}

/** The refusal a journey armed, spent by the first route that meets it. */
function armed(scene: WalletScene): Response | undefined {
  if (scene.refusal === "") return undefined;
  const reason = scene.refusal;
  scene.refusal = "";
  return refused(reason);
}

function termsOf(request: Asked) {
  const account = accounts.find((one) => one.family === request.family) ?? accounts[0];
  const [units, fraction = ""] = request.amount.split(".");
  return {
    family: request.family, chainId: account.chainId, network: account.network, account: account.address, recipient: request.recipient,
    asset: request.asset, symbol: request.symbol, decimals: account.nativeDecimals,
    atomicUnits: `${units}${fraction.padEnd(account.nativeDecimals, "0")}`.replace(/^0+(?=[0-9])/, ""),
    maximumFee: "21000000000000", feeSymbol: account.nativeSymbol, feeDecimals: account.nativeDecimals,
  };
}

/** A fresh review of `request`, good for the scene's minute: each has marks of its own, so an older one approves nothing. */
function review(scene: WalletScene, request: Asked, now: number): Response {
  if (!scene.storageKey) return refused("The wallet's sealed keys cannot be opened on this launch.");
  scene.opened += 1;
  const marks = { intentId: `intent-${request.id}`, commitment: `commitment-${request.id}-${scene.opened}`, expiresAt: now + scene.reviewFor };
  scene.reviews.set(request.id, marks);
  return Response.json({ ...termsOf(request), requestId: request.id, ...marks });
}

function approved(scene: WalletScene, request: Asked, intentId: string, now: number): Response {
  const { family, chainId, asset, symbol, decimals, atomicUnits, recipient, maximumFee } = termsOf(request);
  scene.requests = scene.requests.filter((one) => one.id !== request.id);
  const operationRef = `0x${String(request.id).padStart(64, "0")}`;
  scene.operations.unshift({ intentId, family, chainId, asset, symbol, decimals, atomicUnits, recipient, maximumFee, reservedAt: now, status: "pending", operationRef });
  return Response.json({ status: scene.unresolved ? "unresolved" : "submitted", operationRef });
}

async function decide(scene: WalletScene, request: Request, id: number, now: number): Promise<Response> {
  const body = await readJsonBody(request);
  const decision = typeof body.decision === "string" ? body.decision : "";
  scene.decisions.push({ id, decision });
  if (scene.stalled) return new Promise<Response>(() => {});
  const waiting = scene.requests.find((one) => one.id === id);
  if (waiting === undefined) return refused("That request is no longer waiting.");
  const open = scene.reviews.get(id);
  if (decision === "decline") {
    scene.reviews.delete(id);
    scene.requests = scene.requests.filter((one) => one.id !== id);
    return Response.json({ status: "declined" });
  }
  if (decision !== "approve") return Response.json({ error: "The wallet could not read that request.", code: "invalid_request" }, { status: 400 });
  if (open === undefined || body.intentId !== open.intentId || body.commitment !== open.commitment) return refused("This decision no longer matches an open review for the authenticated owner.");
  scene.reviews.delete(id);
  if (now > open.expiresAt) return refused("This wallet review expired.");
  return armed(scene) ?? approved(scene, waiting, open.intentId, now);
}

async function ask(scene: WalletScene, request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  scene.askings.push(body);
  const turned = armed(scene);
  if (turned) return turned;
  const family = body.family === "solana" ? "solana" : "evm";
  const account = accounts.find((one) => one.family === family) ?? accounts[0];
  const asked: Asked = {
    id: ++scene.issued, family, asset: typeof body.token === "string" ? body.token : "native", symbol: account.nativeSymbol,
    recipient: String(body.recipient), amount: String(body.amount), asker: "owner",
  };
  scene.requests.push(asked);
  return Response.json(asked);
}

/** The wallet's routes as eliza's `@elizaos/plugin-wallet` serves them, over `scene`: status, making, the switch, the three lists, and a request's asking, review and decision. */
export function walletRoutes(scene: WalletScene, now: () => number): Route[] {
  return [
    (request, url) => {
      if (!url.pathname.startsWith("/api/wallet")) return;
      if (scene.unreachable) return Response.json({ error: "The wallet could not reach its network.", code: "unreachable" }, { status: 502 });
      const { method } = request;
      const path = url.pathname.slice("/api/wallet".length);
      if (path === "" && method === "GET") return Response.json(status(scene));
      if (path === "" && method === "POST") {
        scene.made.push(now());
        if (scene.custody !== "none") return Response.json(status(scene));
        if (!scene.storageKey) return refused("This device gave no storage key to seal a wallet under.");
        scene.custody = "ready";
        return Response.json(status(scene));
      }
      if (path === "/switch" && method === "POST") {
        return readJsonBody(request).then((body) => {
          if (scene.custody === "none") return refused("There is no wallet on this device yet.");
          scene.custody = body.on === true ? "ready" : "off";
          scene.reviews.clear();
          return Response.json(status(scene));
        });
      }
      if (scene.custody !== "ready") return refused("The wallet is off.");
      if (path === "/holdings" && method === "GET") return Response.json({ holdings: scene.holdings.filter((holding) => !scene.unread.includes(holding.family)), unread: scene.unread });
      if (path === "/activity" && method === "GET") return Response.json({ operations: scene.operations });
      if (path === "/requests" && method === "GET") return Response.json({ requests: scene.requests });
      if (path === "/requests" && method === "POST") return ask(scene, request);
      const named = /^\/requests\/([1-9][0-9]*)\/(review|decide)$/.exec(path);
      if (named === null || method !== "POST") return;
      const id = Number(named[1]);
      if (named[2] === "decide") return decide(scene, request, id, now());
      const waiting = scene.requests.find((one) => one.id === id);
      if (waiting === undefined) return refused("That request is no longer waiting.");
      return armed(scene) ?? review(scene, waiting, now());
    },
  ];
}
