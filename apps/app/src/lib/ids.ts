import { UUID_PATTERN, validateUuid } from '../../../../vendor/eliza/packages/core/src/utils/uuid';

/** Upstream UUID check: 8-4-4-4-12 hex, any case, any version nibble (elizaOS derives version 0). */
export { UUID_PATTERN, validateUuid };

/** True for a string matching the upstream `UUID_PATTERN` (any version, any case). */
export const isUuid = (value: unknown): value is string => validateUuid(value) !== null;

/** 8-4-4-4-12 hex, lower case only, any version nibble. */
export const UUID_LOWER_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
/** True for a string matching `UUID_LOWER_PATTERN`. */
export const isLowerUuid = (value: unknown): value is string => typeof value === 'string' && UUID_LOWER_PATTERN.test(value);

/** Lower-case RFC 4122 version 4 UUID, as minted on this device by `crypto.randomUUID()`. */
export const UUID_V4_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
/** True for a string matching `UUID_V4_PATTERN`. */
export const isUuidV4 = (value: unknown): value is string => typeof value === 'string' && UUID_V4_PATTERN.test(value);

/** RFC 4122 UUID, versions 1 to 5 with the variant nibble, any case (Cloud server ids). */
export const UUID_RFC_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** True for a string matching `UUID_RFC_PATTERN`. */
export const isUuidRfc = (value: unknown): value is string => typeof value === 'string' && UUID_RFC_PATTERN.test(value);

/** Loose 36-character lower-case hex-or-dash id, matching what the native slot writers accept. */
export const OPAQUE_ID_36 = /^[a-f0-9-]{36}$/;
/** True for a string matching `OPAQUE_ID_36`. */
export const isOpaque36 = (value: unknown): value is string => typeof value === 'string' && OPAQUE_ID_36.test(value);

/** Lower-case hex SHA-256 digest (64 characters). */
export const SHA256_HEX = /^[a-f0-9]{64}$/;
/** True for a string matching `SHA256_HEX`. */
export const isSha256Hex = (value: unknown): value is string => typeof value === 'string' && SHA256_HEX.test(value);

/** Operation or idempotency id: 1 to 128 of `A-Z a-z 0-9 _ -`. */
export const OPERATION_ID = /^[A-Za-z0-9_-]{1,128}$/;
/** True for a string matching `OPERATION_ID`. */
export const isOperationId = (value: unknown): value is string => typeof value === 'string' && OPERATION_ID.test(value);
