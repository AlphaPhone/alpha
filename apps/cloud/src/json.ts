// spec/cloud/rollout.md, "Story: Tell whether a deployed environment is ready"

/**
 * The value a JSON text holds, or undefined when it is not JSON.
 * @throws {never}
 */
export function jsonOf(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}
