import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Check,
  Image,
  Loader2,
  LogOut,
  Play,
  Plus,
  RefreshCcw,
  Shuffle,
  Trash2,
} from "lucide-react";
import { api } from "./lib/api";
import "./styles.css";
import type {
  Album,
  AlbumPhoto,
  Carousel,
  Device,
  ImportResult,
  PickedMediaItem,
  PickerSession,
  SessionState,
} from "./types";

const defaultSession: SessionState = {
  inkjoy: { connected: false },
  google: { connected: false, configured: false },
};

function App() {
  const [session, setSession] = useState<SessionState>(defaultSession);
  const [devices, setDevices] = useState<Device[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [pickedItems, setPickedItems] = useState<PickedMediaItem[]>([]);
  const [pickerSession, setPickerSession] = useState<PickerSession | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const selectedAlbum = albums.find((album) => album.albumId === selectedAlbumId);
  const activeAlbumCarousel = carousels.find(
    (carousel) => carousel.status === "ACTIVE" && carousel.albumIdList?.length,
  );

  const selectedPickedImages = useMemo(
    () =>
      pickedItems.filter((item) =>
        ["image/jpeg", "image/png"].includes(item.mediaFile?.mimeType || ""),
      ),
    [pickedItems],
  );

  useEffect(() => {
    void boot();
  }, []);

  useEffect(() => {
    if (selectedAlbumId) {
      void loadPhotos(selectedAlbumId);
    } else {
      setPhotos([]);
    }
  }, [selectedAlbumId]);

  useEffect(() => {
    if (selectedDeviceId) {
      void loadCarousels(selectedDeviceId);
    }
  }, [selectedDeviceId]);

  async function run<T>(label: string, action: () => Promise<T>) {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      return await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed");
      return undefined;
    } finally {
      setBusy("");
    }
  }

  async function boot() {
    const state = await run("Loading session", () => api.session());
    if (!state) return;
    setSession(state);
    if (state.inkjoy.connected) {
      await loadInkjoyData();
    }
  }

  async function loadInkjoyData() {
    const data = await run("Refreshing Inkjoy", async () => {
      const [nextDevices, nextAlbums] = await Promise.all([api.devices(), api.albums()]);
      return { nextDevices, nextAlbums };
    });

    if (!data) return;

    setDevices(data.nextDevices);
    setAlbums(data.nextAlbums);
    const deviceId = selectedDeviceId || data.nextDevices[0]?.deviceId || "";
    const albumId = selectedAlbumId || data.nextAlbums[0]?.albumId || "";
    setSelectedDeviceId(deviceId);
    setSelectedAlbumId(albumId);

    if (deviceId) {
      await loadCarousels(deviceId);
    }
  }

  async function loadPhotos(albumId: string) {
    const nextPhotos = await run("Loading photos", () => api.albumPhotos(albumId));
    if (nextPhotos) {
      setPhotos(nextPhotos);
      setSelectedPhotoIds([]);
    }
  }

  async function loadCarousels(deviceId: string) {
    const nextCarousels = await run("Loading carousels", () => api.carousels(deviceId));
    if (nextCarousels) {
      setCarousels(nextCarousels);
    }
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const region = String(form.get("region") || "global") as "global" | "mainland";
    const result = await run("Connecting Inkjoy", () => api.loginInkjoy({ email, password, region }));
    if (!result) return;
    event.currentTarget.reset();
    setSession(await api.session());
    setNotice("Inkjoy connected.");
    await loadInkjoyData();
  }

  async function handleCreateAlbum(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const albumName = String(form.get("albumName") || "").trim();
    if (!albumName) return;
    const created = await run("Creating album", () => api.createAlbum(albumName));
    if (created) {
      event.currentTarget.reset();
      await loadInkjoyData();
      setSelectedAlbumId(created.albumId);
    }
  }

  async function handleRenameAlbum() {
    if (!selectedAlbum) return;
    const albumName = window.prompt("Album name", selectedAlbum.albumName || "");
    if (!albumName) return;
    const renamed = await run("Renaming album", () => api.renameAlbum(selectedAlbum.albumId, albumName));
    if (renamed) {
      await loadInkjoyData();
    }
  }

  async function handleDeleteAlbum() {
    if (!selectedAlbum) return;
    if (!window.confirm(`Delete ${selectedAlbum.albumName || "this album"}?`)) return;
    const deleted = await run("Deleting album", () => api.deleteAlbum(selectedAlbum.albumId));
    if (deleted) {
      setSelectedAlbumId("");
      await loadInkjoyData();
    }
  }

  async function handleDeletePhotos() {
    if (!selectedAlbumId || !selectedPhotoIds.length) return;
    const deleted = await run("Deleting photos", () =>
      api.deleteAlbumPhotos(selectedAlbumId, selectedPhotoIds),
    );
    if (deleted) {
      await loadPhotos(selectedAlbumId);
    }
  }

  async function handleCreatePickerSession() {
    const created = await run("Starting Picker", () => api.createPickerSession());
    if (created) {
      setPickerSession(created);
      setPickedItems([]);
      setImportResult(null);
      window.open(created.pickerUri, "_blank", "noopener,noreferrer");
    }
  }

  async function handlePollPicker() {
    if (!pickerSession) return;
    const nextSession = await run("Checking Picker", () => api.getPickerSession(pickerSession.id));
    if (!nextSession) return;
    setPickerSession(nextSession);
    if (nextSession.mediaItemsSet) {
      await loadPickedItems(nextSession.id);
    }
  }

  async function loadPickedItems(sessionId: string) {
    const allItems: PickedMediaItem[] = [];
    let pageToken: string | undefined;
    do {
      const page = await run("Loading picked images", () => api.mediaItems(sessionId, pageToken));
      if (!page) return;
      allItems.push(...(page.mediaItems || []));
      pageToken = page.nextPageToken;
    } while (pageToken);
    setPickedItems(allItems);
  }

  async function handleImport() {
    if (!selectedAlbumId || !selectedPickedImages.length) return;
    const result = await run("Importing images", () =>
      api.importGoogleToInkjoy(selectedAlbumId, selectedPickedImages),
    );
    if (result) {
      setImportResult(result);
      setNotice(`Imported ${result.imported} image${result.imported === 1 ? "" : "s"}.`);
      await loadPhotos(selectedAlbumId);
    }
  }

  async function handleActivateAlbum(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDeviceId || !selectedAlbumId) return;
    const form = new FormData(event.currentTarget);
    const updateType = String(form.get("updateType") || "INTERVAL") as "FIXED" | "INTERVAL";
    const activated = await run("Activating carousel", () =>
      api.activateAlbum({
        deviceId: selectedDeviceId,
        albumId: selectedAlbumId,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        playOrder: String(form.get("playOrder") || "SEQUENTIALLY") as "SEQUENTIALLY" | "SHUFFLE",
        updateType,
        updateDays: Number(form.get("updateDays") || 1),
        updateTimeList:
          updateType === "FIXED"
            ? String(form.get("updateTimeList") || "08:00,20:00")
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
            : undefined,
        beginTime: String(form.get("beginTime") || "08:00"),
        endTime: String(form.get("endTime") || "22:00"),
        intervalMinutes: Number(form.get("intervalMinutes") || 60),
        idle: Number(form.get("idle") || 1) as 0 | 1,
        playNow: form.get("playNow") === "on",
      }),
    );
    if (activated) {
      setNotice("Album carousel activated.");
      await loadCarousels(selectedDeviceId);
    }
  }

  const isBusy = Boolean(busy);

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Inkjoy Syncjoy</p>
            <h1>Frame photo manager</h1>
          </div>
          <div className="top-actions">
            {isBusy ? <span className="status-chip"><Loader2 size={15} />{busy}</span> : null}
            <button type="button" className="icon-button" onClick={() => void boot()}>
              <RefreshCcw size={17} />
              Refresh
            </button>
          </div>
        </header>

        {notice ? <div className="notice success">{notice}</div> : null}
        {error ? <div className="notice error">{error}</div> : null}

        {!session.inkjoy.connected ? (
          <InkjoyLogin onSubmit={handleLogin} disabled={isBusy} />
        ) : (
          <>
            <section className="connection-strip">
              <div>
                <strong>Inkjoy</strong>
                <span>{session.inkjoy.region === "mainland" ? "Mainland China" : "Global"}</span>
              </div>
              <div>
                <strong>Google Photos</strong>
                <span>{session.google.connected ? "Connected" : "Not connected"}</span>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => void run("Signing out", async () => {
                  await api.logoutInkjoy();
                  setSession(await api.session());
                  setAlbums([]);
                  setDevices([]);
                  setPhotos([]);
                  setCarousels([]);
                })}
              >
                <LogOut size={16} />
                Sign out
              </button>
            </section>

            <section className="grid main-grid">
              <AlbumPanel
                albums={albums}
                selectedAlbumId={selectedAlbumId}
                selectedAlbum={selectedAlbum}
                photos={photos}
                selectedPhotoIds={selectedPhotoIds}
                onSelectAlbum={setSelectedAlbumId}
                onCreateAlbum={handleCreateAlbum}
                onRenameAlbum={() => void handleRenameAlbum()}
                onDeleteAlbum={() => void handleDeleteAlbum()}
                onTogglePhoto={(imgId) =>
                  setSelectedPhotoIds((current) =>
                    current.includes(imgId)
                      ? current.filter((id) => id !== imgId)
                      : [...current, imgId],
                  )
                }
                onDeletePhotos={() => void handleDeletePhotos()}
              />

              <GooglePanel
                google={session.google}
                albums={albums}
                selectedAlbumId={selectedAlbumId}
                pickerSession={pickerSession}
                pickedItems={pickedItems}
                importableItems={selectedPickedImages}
                importResult={importResult}
                onConnect={() => {
                  window.location.href = "/api/google/oauth/start";
                }}
                onStartPicker={() => void handleCreatePickerSession()}
                onPollPicker={() => void handlePollPicker()}
                onImport={() => void handleImport()}
              />

              <CarouselPanel
                devices={devices}
                albums={albums}
                carousels={carousels}
                selectedDeviceId={selectedDeviceId}
                selectedAlbumId={selectedAlbumId}
                activeCarousel={activeAlbumCarousel}
                onSelectDevice={setSelectedDeviceId}
                onActivate={handleActivateAlbum}
              />
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function InkjoyLogin({
  onSubmit,
  disabled,
}: {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
}) {
  return (
    <section className="login-shell">
      <form className="login-panel" onSubmit={onSubmit}>
        <div>
          <p className="eyebrow">Connect Inkjoy</p>
          <h2>Sign in to your frame account</h2>
        </div>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <label>
          Server
          <select name="region" defaultValue="global">
            <option value="global">Global</option>
            <option value="mainland">Mainland China</option>
          </select>
        </label>
        <button type="submit" disabled={disabled}>
          <Check size={17} />
          Connect
        </button>
      </form>
    </section>
  );
}

function AlbumPanel(props: {
  albums: Album[];
  selectedAlbumId: string;
  selectedAlbum?: Album;
  photos: AlbumPhoto[];
  selectedPhotoIds: string[];
  onSelectAlbum: (albumId: string) => void;
  onCreateAlbum: (event: React.FormEvent<HTMLFormElement>) => void;
  onRenameAlbum: () => void;
  onDeleteAlbum: () => void;
  onTogglePhoto: (imgId: string) => void;
  onDeletePhotos: () => void;
}) {
  return (
    <section className="panel span-2">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Albums</p>
          <h2>{props.selectedAlbum?.albumName || "Personal albums"}</h2>
        </div>
        <div className="button-row">
          <button type="button" className="ghost-button" onClick={props.onRenameAlbum} disabled={!props.selectedAlbum}>
            Rename
          </button>
          <button type="button" className="danger-button" onClick={props.onDeleteAlbum} disabled={!props.selectedAlbum}>
            <Trash2 size={16} />
            Album
          </button>
        </div>
      </div>

      <form className="inline-form" onSubmit={props.onCreateAlbum}>
        <input name="albumName" placeholder="New album name" />
        <button type="submit">
          <Plus size={16} />
          Album
        </button>
      </form>

      <div className="album-list">
        {props.albums.map((album) => (
          <button
            type="button"
            key={album.albumId}
            className={`album-tile ${album.albumId === props.selectedAlbumId ? "active" : ""}`}
            onClick={() => props.onSelectAlbum(album.albumId)}
          >
            <div className="album-cover">
              {album.coverImgThumbnail || album.coverImg ? (
                <img src={album.coverImgThumbnail || album.coverImg} alt="" />
              ) : (
                <Image size={24} />
              )}
            </div>
            <span>{album.albumName || "Untitled"}</span>
            <small>{album.imgCount || 0} images</small>
          </button>
        ))}
      </div>

      <div className="section-title">
        <h3>Photos</h3>
        <button
          type="button"
          className="danger-button"
          onClick={props.onDeletePhotos}
          disabled={!props.selectedPhotoIds.length}
        >
          <Trash2 size={16} />
          {props.selectedPhotoIds.length || 0}
        </button>
      </div>

      <div className="photo-grid">
        {props.photos.map((photo) => (
          <button
            type="button"
            key={photo.imgId}
            className={`photo-tile ${props.selectedPhotoIds.includes(photo.imgId) ? "selected" : ""}`}
            onClick={() => props.onTogglePhoto(photo.imgId)}
          >
            {photo.thumbnailUrl ? <img src={photo.thumbnailUrl} alt="" /> : <Image size={24} />}
          </button>
        ))}
      </div>
    </section>
  );
}

function GooglePanel(props: {
  google: SessionState["google"];
  albums: Album[];
  selectedAlbumId: string;
  pickerSession: PickerSession | null;
  pickedItems: PickedMediaItem[];
  importableItems: PickedMediaItem[];
  importResult: ImportResult | null;
  onConnect: () => void;
  onStartPicker: () => void;
  onPollPicker: () => void;
  onImport: () => void;
}) {
  const targetAlbum = props.albums.find((album) => album.albumId === props.selectedAlbumId);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Google Photos</p>
          <h2>{props.google.connected ? "Picker import" : "Connect"}</h2>
        </div>
      </div>

      {!props.google.connected ? (
        <button type="button" onClick={props.onConnect} disabled={!props.google.configured}>
          <Check size={17} />
          Connect Google
        </button>
      ) : (
        <div className="stack">
          <button type="button" onClick={props.onStartPicker}>
            <Image size={17} />
            Pick Images
          </button>
          {props.pickerSession ? (
            <div className="picker-card">
              <a href={props.pickerSession.pickerUri} target="_blank" rel="noreferrer">
                Open Picker
              </a>
              <button type="button" className="ghost-button" onClick={props.onPollPicker}>
                <RefreshCcw size={16} />
                Check
              </button>
              <span>{props.pickerSession.mediaItemsSet ? "Selection ready" : "Waiting"}</span>
            </div>
          ) : null}

          <div className="stat-grid">
            <div>
              <strong>{props.pickedItems.length}</strong>
              <span>Selected</span>
            </div>
            <div>
              <strong>{props.importableItems.length}</strong>
              <span>Images</span>
            </div>
          </div>

          <button
            type="button"
            onClick={props.onImport}
            disabled={!props.selectedAlbumId || !props.importableItems.length}
          >
            <Plus size={17} />
            Import to {targetAlbum?.albumName || "album"}
          </button>

          {props.importResult ? (
            <div className="result-box">
              <strong>{props.importResult.imported} imported</strong>
              <span>{props.importResult.skipped} skipped</span>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function CarouselPanel(props: {
  devices: Device[];
  albums: Album[];
  carousels: Carousel[];
  selectedDeviceId: string;
  selectedAlbumId: string;
  activeCarousel?: Carousel;
  onSelectDevice: (deviceId: string) => void;
  onActivate: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const selectedAlbum = props.albums.find((album) => album.albumId === props.selectedAlbumId);

  return (
    <section className="panel span-3">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Carousels</p>
          <h2>{props.activeCarousel ? "Active album carousel" : "Frame playback"}</h2>
        </div>
        <select value={props.selectedDeviceId} onChange={(event) => props.onSelectDevice(event.target.value)}>
          {props.devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.deviceName || device.deviceId}
            </option>
          ))}
        </select>
      </div>

      <div className="carousel-grid">
        <form className="carousel-form" onSubmit={props.onActivate}>
          <label>
            Album
            <input value={selectedAlbum?.albumName || ""} readOnly />
          </label>
          <label>
            Play order
            <select name="playOrder" defaultValue="SEQUENTIALLY">
              <option value="SEQUENTIALLY">Sequential</option>
              <option value="SHUFFLE">Shuffle</option>
            </select>
          </label>
          <label>
            Update type
            <select name="updateType" defaultValue="INTERVAL">
              <option value="INTERVAL">Interval</option>
              <option value="FIXED">Fixed times</option>
            </select>
          </label>
          <label>
            Every days
            <input name="updateDays" type="number" min="1" defaultValue="1" />
          </label>
          <label>
            Begin
            <input name="beginTime" type="time" defaultValue="08:00" />
          </label>
          <label>
            End
            <input name="endTime" type="time" defaultValue="22:00" />
          </label>
          <label>
            Interval minutes
            <input name="intervalMinutes" type="number" min="5" defaultValue="60" />
          </label>
          <label>
            Fixed times
            <input name="updateTimeList" defaultValue="08:00,20:00" />
          </label>
          <label>
            Idle
            <select name="idle" defaultValue="1">
              <option value="1">Stay awake</option>
              <option value="0">Sleep</option>
            </select>
          </label>
          <label className="checkbox-row">
            <input name="playNow" type="checkbox" defaultChecked />
            Play now
          </label>
          <button type="submit" disabled={!props.selectedDeviceId || !props.selectedAlbumId}>
            <Play size={17} />
            Set Active
          </button>
        </form>

        <div className="carousel-list">
          {props.carousels.map((carousel) => (
            <div key={carousel.strategyId} className={`carousel-item ${carousel.status === "ACTIVE" ? "active" : ""}`}>
              <div>
                <strong>
                  {carousel.albumList?.map((album) => album.albumName).join(", ") ||
                    carousel.widgetKey ||
                    carousel.strategyId}
                </strong>
                <span>{carousel.status || "UNKNOWN"} · {carousel.playOrder || "ORDER"}</span>
              </div>
              {carousel.playOrder === "SHUFFLE" ? <Shuffle size={18} /> : <Play size={18} />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing root element");
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
