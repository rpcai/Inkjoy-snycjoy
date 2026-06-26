import type { AppSession, InkjoyRegion } from "./session";
import { getInkjoyBaseUrl } from "./session";

export type InkjoyResult<T> = {
  code?: number;
  msg?: string;
  data?: T;
};

export type InkjoyRequestOptions = {
  method?: string;
  body?: BodyInit | Record<string, unknown>;
  headers?: HeadersInit;
  region?: InkjoyRegion;
  token?: string;
};

export async function inkjoyRequest<T>(
  path: string,
  session: AppSession,
  options: InkjoyRequestOptions = {},
) {
  const region = options.region || session.inkjoy?.region || "global";
  const token = options.token || session.inkjoy?.token;
  const headers = new Headers(options.headers);
  let body = options.body;

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (body && !(body instanceof FormData) && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  const response = await fetch(`${getInkjoyBaseUrl(region)}${path}`, {
    method: options.method || "GET",
    headers,
    body,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? ((await response.json()) as InkjoyResult<T>)
    : ({ msg: await response.text() } as InkjoyResult<T>);

  if (!response.ok || (typeof payload.code === "number" && payload.code !== 0)) {
    throw new Error(payload.msg || `Inkjoy request failed with ${response.status}`);
  }

  return payload;
}

export function requireInkjoy(session: AppSession) {
  if (!session.inkjoy?.token) {
    throw new Error("Inkjoy is not connected");
  }
}
