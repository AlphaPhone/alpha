/** The error's message when it is an `Error`, otherwise `fallback`. */
export const errorText = (error: unknown, fallback: string): string => error instanceof Error ? error.message : fallback;

/** The `code` property of a thrown value when it is a string (Capacitor plugin rejections), otherwise `undefined`. */
export function errorCode(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return typeof code === 'string' ? code : undefined;
}
