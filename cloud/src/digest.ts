// spec/cloud/deployment.md, "Story: Configure a deployment from one reviewed profile"
import { createHash } from "node:crypto";

/**
 * The lower-case hex SHA-256 of a UTF-8 string.
 * @throws {never}
 */
export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
