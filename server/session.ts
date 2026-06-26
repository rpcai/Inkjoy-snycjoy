import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

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

export function getInkjoyBaseUrl(region: InkjoyRegion) {
  return region === "mainland"
    ? "https://openapi.advisor.epaperframe.com"
    : "https://openapi.inkjoyframe.com";
}

export function getSessionSecret() {
  return process.env.SESSION_SECRET || DEV_SECRET;
}

export function isSecureCookie() {
  return (process.env.PUBLIC_APP_URL || "").startsWith("https://");
}

export async function readSession(c: Context): Promise<AppSession> {
  const encrypted = getCookie(c, COOKIE_NAME);

  if (!encrypted) {
    return {};
  }

  try {
    return JSON.parse(decrypt(encrypted, getSessionSecret())) as AppSession;
  } catch {
    return {};
  }
}

export function writeSession(c: Context, session: AppSession) {
  setCookie(c, COOKIE_NAME, encrypt(JSON.stringify(session), getSessionSecret()), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 14,
    path: "/",
    sameSite: "Lax",
    secure: isSecureCookie(),
  });
}

export function clearSession(c: Context) {
  setCookie(c, COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "Lax",
    secure: isSecureCookie(),
  });
}

function encrypt(value: string, secret: string) {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${base64url(iv)}.${base64url(tag)}.${base64url(ciphertext)}`;
}

function decrypt(value: string, secret: string) {
  const [ivRaw, tagRaw, ciphertextRaw] = value.split(".");

  if (!ivRaw || !tagRaw || !ciphertextRaw) {
    throw new Error("Invalid encrypted session format");
  }

  const key = deriveKey(secret);
  const decipher = createDecipheriv("aes-256-gcm", key, fromBase64url(ivRaw));
  decipher.setAuthTag(fromBase64url(tagRaw));
  return Buffer.concat([
    decipher.update(fromBase64url(ciphertextRaw)),
    decipher.final(),
  ]).toString("utf8");
}

function deriveKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

function base64url(value: Buffer) {
  return value.toString("base64url");
}

function fromBase64url(value: string) {
  return Buffer.from(value, "base64url");
}
