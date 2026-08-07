import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";

const COOKIE_NAME = "syncjoy_session";
const DEV_SECRET = "local-dev-only-change-me";

export type InkjoyRegion = "global" | "mainland";

export type InkjoySession = {
  region: InkjoyRegion;
  token: string;
  uid?: string;
  expireAt?: string;
};

export type GoogleSession = {
  accessToken: string;
  expiresAt: number;
  scope?: string;
  tokenType?: string;
};

export type AppSession = {
  inkjoy?: InkjoySession;
  google?: GoogleSession;
  googleOauthState?: string;
};

export type Env = {
  SESSION_SECRET?: string;
  PUBLIC_APP_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  ASSETS: Fetcher;
};

type AppContext = Context<{ Bindings: Env }>;

export function getInkjoyBaseUrl(region: InkjoyRegion) {
  return region === "mainland"
    ? "https://openapi.advisor.epaperframe.com"
    : "https://openapi.inkjoyframe.com";
}

export function getSessionSecret(c: AppContext) {
  return c.env.SESSION_SECRET || DEV_SECRET;
}

export function isSecureCookie(c: AppContext) {
  return (c.env.PUBLIC_APP_URL || "").startsWith("https://");
}

export async function readSession(c: AppContext): Promise<AppSession> {
  const encrypted = getCookie(c, COOKIE_NAME);

  if (!encrypted) {
    return {};
  }

  try {
    return JSON.parse(await decrypt(encrypted, getSessionSecret(c))) as AppSession;
  } catch {
    return {};
  }
}

export async function writeSession(c: AppContext, session: AppSession) {
  setCookie(c, COOKIE_NAME, await encrypt(JSON.stringify(session), getSessionSecret(c)), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 14,
    path: "/",
    sameSite: "Lax",
    secure: isSecureCookie(c),
  });
}

export function clearSession(c: AppContext) {
  setCookie(c, COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "Lax",
    secure: isSecureCookie(c),
  });
}

async function importKey(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encrypt(value: string, secret: string) {
  const key = await importKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(value),
  );
  return `${base64url(iv)}.${base64url(new Uint8Array(ciphertext))}`;
}

async function decrypt(value: string, secret: string) {
  const [ivRaw, ciphertextRaw] = value.split(".");

  if (!ivRaw || !ciphertextRaw) {
    throw new Error("Invalid encrypted session format");
  }

  const key = await importKey(secret);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64url(ivRaw) },
    key,
    fromBase64url(ciphertextRaw),
  );
  return new TextDecoder().decode(plaintext);
}

function base64url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
