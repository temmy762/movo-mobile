/**
 * Fetch wrapper for the Movo API. Same rules as the web frontend: every call
 * times out after 20s, and a non-2xx response throws an ApiError carrying the
 * server's `error` message so screens can show it.
 */

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

type Config = {
  baseUrl: string;
  getToken: () => string | null | Promise<string | null>;
  /** Called on any 401 so the app can sign the user out */
  onUnauthorized?: () => void;
};

let config: Config = { baseUrl: "https://movoprive.com", getToken: () => null };

export function configureApi(next: Partial<Config>) {
  config = { ...config, ...next };
}

export function apiBaseUrl() {
  return config.baseUrl;
}

const TIMEOUT_MS = 20_000;

export async function request<T>(
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  init.signal?.addEventListener("abort", () => controller.abort());

  const token = await config.getToken();
  const headers: Record<string, string> = { "X-Movo-Client": "mobile", Accept: "application/json" };
  /* FormData (file uploads) sets its own multipart boundary */
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${config.baseUrl}${path}`, {
      method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
      headers,
      body: isForm ? (init.body as FormData) : init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 401) config.onUnauthorized?.();
      const message = (data && typeof data.error === "string" && data.error) || `Request failed (${res.status})`;
      throw new ApiError(res.status, message, data);
    }
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (controller.signal.aborted) throw new ApiError(0, "The request timed out. Check your connection and try again.");
    throw new ApiError(0, "Can't reach Movo. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
}
