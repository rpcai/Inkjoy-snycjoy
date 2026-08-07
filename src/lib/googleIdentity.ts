export type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

const GOOGLE_IDENTITY_SCRIPT_ID = "google-identity-services";
export const GOOGLE_PICKER_SCOPE = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";

export function loadGoogleIdentityServices() {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google sign-in script failed to load")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_IDENTITY_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google sign-in script failed to load"));
    document.head.append(script);
  });
}

export function requestGoogleToken(clientId: string) {
  return new Promise<GoogleTokenResponse>((resolve, reject) => {
    const oauth = window.google?.accounts?.oauth2;

    if (!oauth) {
      reject(new Error("Google sign-in is unavailable"));
      return;
    }

    const tokenClient = oauth.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_PICKER_SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }

        resolve(response);
      },
    });

    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

export function toAutoclosePickerUri(pickerUri: string) {
  const url = new URL(pickerUri);
  url.pathname = url.pathname.endsWith("/autoclose")
    ? url.pathname
    : `${url.pathname.replace(/\/$/, "")}/autoclose`;
  return url.toString();
}

export function parsePollingInterval(interval?: string) {
  if (!interval) return 4000;
  const seconds = Number(interval.replace(/s$/, ""));
  return Number.isFinite(seconds) ? Math.max(1500, seconds * 1000) : 4000;
}
