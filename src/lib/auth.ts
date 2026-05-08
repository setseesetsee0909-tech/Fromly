const AUTH_CALLBACK_PATH = "/auth/callback";
const DEFAULT_POST_AUTH_PATH = "/dashboard";

function normalizeOrigin(origin: string | null | undefined) {
  const trimmed = origin?.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
}

export function getAppOrigin() {
  if (typeof window !== "undefined" && window.location.origin) {
    return normalizeOrigin(window.location.origin);
  }

  return normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
}

export function sanitizeNextPath(nextPath: string | null | undefined) {
  if (!nextPath) return DEFAULT_POST_AUTH_PATH;
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return DEFAULT_POST_AUTH_PATH;
  }

  return nextPath;
}

export function getAuthCallbackUrl(nextPath?: string) {
  const origin = getAppOrigin();
  const safeNextPath = sanitizeNextPath(nextPath);
  const query = `next=${encodeURIComponent(safeNextPath)}`;

  if (!origin) {
    return `${AUTH_CALLBACK_PATH}?${query}`;
  }

  return `${origin}${AUTH_CALLBACK_PATH}?${query}`;
}

export { AUTH_CALLBACK_PATH, DEFAULT_POST_AUTH_PATH };
