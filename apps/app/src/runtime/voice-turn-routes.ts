/**
 * The resident agent's end-of-turn and heard routes as the voice assistant uses them, through the
 * owner-bound resident request port (connection-ui getResidentLiveVoice), and the end-of-turn chain
 * over them (local fused scorer, then an optional Clef stage, then the long gap). The
 * implementations are the shared upstream `@elizaos/voice/turn-routes` and
 * `@elizaos/voice/endpoint-chain` clients, authenticated and projected from the reviewed pin.
 */
export {
  createHeardReporter,
  readEndOfTurn,
  residentEndpoint,
} from '../../../../.eliza/client-features/packages/voice/src/voice-turn-routes.ts';
export {
  clefEndpointStageEnabled,
  createEndpointChain,
} from '../../../../.eliza/client-features/packages/voice/src/voice-endpoint-chain.ts';
