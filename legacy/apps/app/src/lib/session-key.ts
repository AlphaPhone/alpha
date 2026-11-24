/** Identity key for an ordered tuple: exactly `JSON.stringify([...parts])`, so persisted keys keep their bytes. */
export const sessionKey = (...parts: unknown[]): string => JSON.stringify(parts);

/** `JSON.stringify([origin, ownerId, agentId])` of an agent owner. */
export const agentOwnerKey = (owner: { origin: string; ownerId: string; agentId: string }): string => JSON.stringify([owner.origin, owner.ownerId, owner.agentId]);

/** `JSON.stringify([origin, ownerId, agentId, sessionId])` of an agent session. */
export const agentSessionKey = (session: { origin: string; ownerId: string; agentId: string; sessionId: string }): string => JSON.stringify([session.origin, session.ownerId, session.agentId, session.sessionId]);
