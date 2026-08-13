import type {
  Album,
  AlbumPhoto,
  Carousel,
  Device,
  ImportResult,
  PickedMediaItem,
  PickerSession,
  SessionState,
} from "../types";

type RequestOptions = {
  method?: string;
  body?: unknown;
};

/** Thrown when the server reports the stored Inkjoy session has expired or was rejected. */
export class SessionExpiredError extends Error {}

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: options.body && !isFormData ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    body: isFormData ? (options.body as FormData) : options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && payload.code === "INKJOY_SESSION_EXPIRED") {
      throw new SessionExpiredError(payload.error || "Inkjoy session expired");
    }
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }

  return payload as T;
}

export const api = {
  session: () => apiFetch<SessionState>("/api/session"),
  loginInkjoy: (body: { email: string; password: string; region: "global" | "mainland" }) =>
    apiFetch<SessionState["inkjoy"]>("/api/inkjoy/login", { method: "POST", body }),
  logoutInkjoy: () => apiFetch<{ ok: true }>("/api/inkjoy/logout", { method: "POST" }),
  devices: () => apiFetch<Device[]>("/api/inkjoy/devices"),
  albums: () => apiFetch<Album[]>("/api/inkjoy/albums"),
  createAlbum: (albumName: string) =>
    apiFetch<Album>("/api/inkjoy/albums", { method: "POST", body: { albumName } }),
  renameAlbum: (albumId: string, albumName: string) =>
    apiFetch<Album>(`/api/inkjoy/albums/${albumId}`, {
      method: "PUT",
      body: { albumName },
    }),
  deleteAlbum: (albumId: string) =>
    apiFetch<{ ok: true }>(`/api/inkjoy/albums/${albumId}`, { method: "DELETE" }),
  albumPhotos: (albumId: string) =>
    apiFetch<AlbumPhoto[]>(`/api/inkjoy/albums/${albumId}/photos`),
  deleteAlbumPhotos: (albumId: string, imgIdList: string[]) =>
    apiFetch<{ ok: true }>(`/api/inkjoy/albums/${albumId}/photos/delete`, {
      method: "POST",
      body: { imgIdList },
    }),
  publishAlbumPhoto: (deviceId: string, albumId: string, imgId: string, timezone?: string) =>
    apiFetch<{ ok: true }>(`/api/inkjoy/devices/${deviceId}/publish-album`, {
      method: "POST",
      body: { albumId, imgId, timezone },
    }),
  // Fallback for stored album photos that don't already exactly match the device's resolution:
  // publishAlbumPhoto/publish-album fails on those (Inkjoy does no server-side resizing), so the
  // caller composites a correctly-sized copy client-side and sends the fresh bytes here instead.
  publishDeviceImage: (deviceId: string, blob: Blob, filename: string, timezone?: string) => {
    const body = new FormData();
    body.set("file", blob, filename);
    if (timezone) body.set("timezone", timezone);
    return apiFetch<{ ok: true }>(`/api/inkjoy/devices/${deviceId}/publish`, { method: "POST", body });
  },
  // Proxies an Inkjoy original through our own origin so it can be drawn onto a <canvas> — the
  // S3 bucket serving these has no CORS headers, so a direct cross-origin fetch/draw would fail.
  imageProxyUrl: (originUrl: string) => `/api/inkjoy/image-proxy?url=${encodeURIComponent(originUrl)}`,
  carousels: (deviceId?: string) =>
    apiFetch<Carousel[]>(`/api/inkjoy/carousels${deviceId ? `?deviceId=${deviceId}` : ""}`),
  setCarouselStatus: (strategyId: string, status: "ACTIVE" | "INACTIVE") =>
    apiFetch<{ ok: true }>(`/api/inkjoy/carousels/${strategyId}/status/${status}`, {
      method: "PUT",
    }),
  activateAlbum: (body: {
    deviceId: string;
    albumId: string;
    strategyId?: string;
    timezone: string;
    playOrder: "SEQUENTIALLY" | "SHUFFLE";
    updateType: "FIXED" | "INTERVAL";
    updateDays: number;
    updateTimeList?: string[];
    beginTime?: string;
    endTime?: string;
    intervalMinutes?: number;
    idle: 0 | 1;
    playNow: boolean;
  }) => apiFetch<Carousel>("/api/inkjoy/carousels/activate-album", { method: "POST", body }),
  connectGoogleToken: (body: {
    accessToken: string;
    expiresIn?: number;
    scope?: string;
    tokenType?: string;
  }) => apiFetch<SessionState["google"]>("/api/google/token", { method: "POST", body }),
  createPickerSession: () =>
    apiFetch<PickerSession>("/api/google/picker/sessions", { method: "POST" }),
  getPickerSession: (sessionId: string) =>
    apiFetch<PickerSession>(`/api/google/picker/sessions/${sessionId}`),
  deletePickerSession: (sessionId: string) =>
    apiFetch<Record<string, never>>(`/api/google/picker/sessions/${sessionId}`, {
      method: "DELETE",
    }),
  mediaItems: (sessionId: string, pageToken?: string) =>
    apiFetch<{ mediaItems?: PickedMediaItem[]; nextPageToken?: string }>(
      `/api/google/picker/media-items?sessionId=${sessionId}${pageToken ? `&pageToken=${pageToken}` : ""}`,
    ),
  googleThumbnailUrl: (baseUrl: string) =>
    `/api/google/media?baseUrl=${encodeURIComponent(baseUrl)}&size=w256-h256-c`,
  // Inkjoy's `-thumbnail` renditions strip EXIF orientation, so some images (mostly ones
  // imported via the native app) render sideways. This reads the orientation from the
  // full-size original (a cheap partial fetch server-side) without downloading it to the client.
  imageOrientation: (originUrl: string) =>
    apiFetch<{ rotation: 0 | 90 | 180 | 270 }>(`/api/inkjoy/image-orientation?url=${encodeURIComponent(originUrl)}`),
  importGoogleToInkjoy: (albumId: string, items: PickedMediaItem[]) =>
    apiFetch<ImportResult>("/api/import/google-to-inkjoy", {
      method: "POST",
      body: {
        albumId,
        items: items.map((item) => ({
          id: item.id,
          filename: item.mediaFile?.filename,
          mimeType: item.mediaFile?.mimeType,
          baseUrl: item.mediaFile?.baseUrl,
        })),
      },
    }),
  uploadLocalPhoto: (albumId: string, blob: Blob, filename: string) => {
    const body = new FormData();
    body.set("file", blob, filename);
    return apiFetch<{ ok: true }>(`/api/inkjoy/albums/${albumId}/photos`, { method: "POST", body });
  },
};
