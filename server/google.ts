import type { AppSession } from "./session";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_PICKER_URL = "https://photospicker.googleapis.com/v1";
const GOOGLE_SCOPE = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/photospicker.mediaitems.readonly",
].join(" ");
const GOOGLE_PICKER_SCOPE = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";

export function getAppUrl() {
  return process.env.PUBLIC_APP_URL || "http://localhost:5173";
}

export function getGoogleRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || `${getAppUrl()}/api/google/oauth/callback`;
}

export function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "";
}

export function isGoogleConfigured() {
  return Boolean(getGoogleClientId());
}

export function createGoogleAuthUrl(state: string) {
  const clientId = getGoogleClientId();

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getGoogleRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPE);
  url.searchParams.set("state", state);
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("access_type", "online");
  return url.toString();
}

export async function exchangeGoogleCode(code: string) {
  const clientId = getGoogleClientId();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth client is not configured");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: getGoogleRedirectUri(),
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || "Google token exchange failed");
  }

  return {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in || 3600) * 1000,
    scope: payload.scope,
    tokenType: payload.token_type,
  };
}

export function createGoogleSessionFromBrowserToken(body: {
  accessToken?: string;
  expiresIn?: number;
  scope?: string;
  tokenType?: string;
}) {
  if (!body.accessToken) {
    throw new Error("Google access token is required");
  }

  if (body.scope && !body.scope.split(/\s+/).includes(GOOGLE_PICKER_SCOPE)) {
    throw new Error("Google Photos Picker permission was not granted");
  }

  return {
    accessToken: body.accessToken,
    expiresAt: Date.now() + Math.max(60, Number(body.expiresIn) || 3600) * 1000,
    scope: body.scope,
    tokenType: body.tokenType,
  };
}

export function requireGoogle(session: AppSession) {
  if (!session.google?.accessToken) {
    throw new Error("Google Photos is not connected");
  }

  if (session.google.expiresAt <= Date.now()) {
    throw new Error("Google Photos session has expired. Reconnect Google Photos.");
  }
}

export async function googlePickerRequest<T>(
  session: AppSession,
  path: string,
  init: RequestInit = {},
) {
  requireGoogle(session);

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.google?.accessToken}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${GOOGLE_PICKER_URL}${path}`, {
    ...init,
    headers,
  });

  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || `Google Picker request failed with ${response.status}`);
  }

  return payload;
}

export async function fetchGoogleMedia(session: AppSession, baseUrl: string, size = "d") {
  requireGoogle(session);

  const url = new URL(baseUrl);
  if (!url.search) {
    url.search = `=${size}`;
  }

  return fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${session.google?.accessToken}`,
    },
  });
}
