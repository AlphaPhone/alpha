// spec/cloud/index.md, "The API Worker serves only while the profile in its assets is the text its pinned digest names, and otherwise asks the caller to retry"
import { createHash } from "node:crypto";

/**
 * The lower-case hex SHA-256 of a UTF-8 string.
 * @throws {never}
 */
export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
