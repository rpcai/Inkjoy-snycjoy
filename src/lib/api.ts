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

async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
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
};
