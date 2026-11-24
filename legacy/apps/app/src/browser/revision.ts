import {randomHex} from '../lib/hash';
/** Opaque browser operation and revision IDs. */
export const revision=()=>randomHex(32);
