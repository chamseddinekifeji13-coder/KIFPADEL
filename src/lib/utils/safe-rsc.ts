/**
 * Re-throw control-flow / framework errors that callers MUST NOT swallow.
 *
 * In React Server Components, `redirect()`, `notFound()`, and dynamic-server
 * usage are signaled by throwing special errors that Next.js itself catches
 * higher up the stack. If we swallow them in a try/catch, the framework can
 * no longer process the redirect / 404 / dynamic signal.
 *
 * Use this at the top of any catch block in RSC code paths.
 */
export function rethrowFrameworkError(err: unknown): void {
  if (!err || typeof err !== "object") return;

  // Next.js redirect / notFound / dynamic-server-usage all set a `digest`
  // string that starts with one of these prefixes.
  const digest = (err as { digest?: unknown }).digest;
  if (typeof digest === "string") {
    if (
      digest === "DYNAMIC_SERVER_USAGE" ||
      digest === "NEXT_NOT_FOUND" ||
      digest.startsWith("NEXT_REDIRECT") ||
      digest.startsWith("NEXT_HTTP_ERROR_FALLBACK")
    ) {
      throw err;
    }
  }
}
