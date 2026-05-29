const API_BASE = (
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:8000"
).replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

// ─────────────────────────────────────────────────────────────────────────────
// TokenStore
//
// Problem being solved:
//   - sessionStorage is per-tab (good for isolation) but is WIPED on refresh.
//   - localStorage survives refresh but is SHARED across all tabs (bad).
//
// Solution:
//   - Assign each tab a unique ID stored in sessionStorage.
//     sessionStorage survives refresh within the same tab but is never shared.
//   - Store tokens in localStorage under that tab-specific key.
//     This means each tab has its own slot in localStorage, so tabs don't
//     overwrite each other, and tokens survive a page refresh.
// ─────────────────────────────────────────────────────────────────────────────
function getTabId(): string {
  let id = sessionStorage.getItem("tab_id");
  if (!id) {
    id = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem("tab_id", id);
  }
  return id;
}

export const TokenStore = {
  _key: (suffix: string) => `${getTabId()}_${suffix}`,

  getAccess: () => localStorage.getItem(TokenStore._key("access")),
  getRefresh: () => localStorage.getItem(TokenStore._key("refresh")),

  set: (access: string, refresh: string) => {
    localStorage.setItem(TokenStore._key("access"), access);
    localStorage.setItem(TokenStore._key("refresh"), refresh);
  },

  clear: () => {
    localStorage.removeItem(TokenStore._key("access"));
    localStorage.removeItem(TokenStore._key("refresh"));
  },

  hasToken: () => !!localStorage.getItem(TokenStore._key("access")),
};

function buildUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${name}=`))
      ?.split("=")[1] || ""
  );
}

async function tryRefreshToken(): Promise<boolean> {
  const refresh = TokenStore.getRefresh();
  if (!refresh) return false;
  try {
    const res = await fetch(buildUrl("/accounts/api/token/refresh/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.access) {
      // ROTATE_REFRESH_TOKENS=True means the backend issues a new refresh token
      // on every refresh call. Always store the new one, falling back to the
      // old one only if the backend did not return a replacement.
      TokenStore.set(data.access, data.refresh ?? refresh);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;
  const isJsonBody = body !== undefined && !(body instanceof FormData);
  const accessToken = TokenStore.getAccess();

  const makeRequest = (token: string | null) =>
    fetch(buildUrl(path), {
      method,
      credentials: "include",
      headers: {
        ...(isJsonBody ? { "Content-Type": "application/json" } : {}),
        ...(method !== "GET" ? { "X-CSRFToken": getCookie("csrftoken") } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body:
        body === undefined
          ? undefined
          : isJsonBody
            ? JSON.stringify(body)
            : (body as BodyInit),
    });

  let response = await makeRequest(accessToken);

  // Auto-refresh expired token and retry once
  if (response.status === 401 && TokenStore.hasToken()) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      response = await makeRequest(TokenStore.getAccess());
    } else {
      TokenStore.clear();
    }
  }

  // Robustly attempt to parse JSON body; fall back to text when parsing fails.
  let data: any;
  try {
    data = await response.json();
  } catch {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    // Prefer backend-provided `error` or `message` fields when available.
    const message =
      (data &&
        typeof data === "object" &&
        typeof data.error === "string" &&
        data.error) ||
      (data &&
        typeof data === "object" &&
        typeof data.message === "string" &&
        data.message) ||
      (typeof data === "string" && data) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export function ensureCsrfCookie() {
  return apiRequest<{ success: string }>("/accounts/api/csrf/");
}

export { API_BASE };
