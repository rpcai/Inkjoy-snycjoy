import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Check,
  Clock3,
  GalleryHorizontalEnd,
  Image,
  Images,
  Loader2,
  LogOut,
  Monitor,
  Play,
  Plus,
  RefreshCcw,
  Shuffle,
  Trash2,
  UploadCloud,
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

type View = "home" | "albums" | "google" | "slideshow";

const defaultSession: SessionState = {
  inkjoy: { connected: false },
  google: { connected: false, configured: false },
};

function App() {
  const [session, setSession] = useState<SessionState>(defaultSession);
  const [view, setView] = useState<View>("home");
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
  const selectedDevice = devices.find((device) => device.deviceId === selectedDeviceId);
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
    const state = await run("Loading", () => api.session());
    if (!state) return;
    setSession(state);
    if (state.inkjoy.connected) {
      await loadInkjoyData();
    }
  }

  async function loadInkjoyData() {
    const data = await run("Refreshing", async () => {
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
    const nextCarousels = await run("Loading slideshow", () => api.carousels(deviceId));
    if (nextCarousels) {
      setCarousels(nextCarousels);
    }
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const region = String(form.get("region") || "global") as "global" | "mainland";
    const result = await run("Signing in", () => api.loginInkjoy({ email, password, region }));
    if (!result) return;
    formElement.reset();
    setSession(await api.session());
    setNotice("Signed in.");
    await loadInkjoyData();
  }

  async function handleSignOut() {
    await run("Signing out", async () => {
      await api.logoutInkjoy();
      setSession(await api.session());
      setAlbums([]);
      setDevices([]);
      setPhotos([]);
      setCarousels([]);
      setPickedItems([]);
      setPickerSession(null);
      setView("home");
    });
  }

  async function handleCreateAlbum(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const albumName = String(form.get("albumName") || "").trim();
    if (!albumName) return;
    const created = await run("Creating album", () => api.createAlbum(albumName));
    if (created) {
      formElement.reset();
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
    const activated = await run("Saving slideshow", () =>
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
        beginTime: String(form.get("beginTime") || "09:00"),
        endTime: String(form.get("endTime") || "18:00"),
        intervalMinutes: Number(form.get("intervalMinutes") || 120),
        idle: Number(form.get("idle") || 1) as 0 | 1,
        playNow: form.get("playNow") === "on",
      }),
    );
    if (activated) {
      setNotice("Slideshow saved.");
      await loadCarousels(selectedDeviceId);
    }
  }

  if (!session.inkjoy.connected) {
    return (
      <main className="login-page">
        <InkjoyLogin onSubmit={handleLogin} disabled={Boolean(busy)} busy={busy} />
      </main>
    );
  }

  return (
    <main className="app-page">
      <header className="navbar">
        <button type="button" className="navbar-brand" onClick={() => setView("home")}>
          <span className="brand-mark">▣</span>
          <span className="brand-text">InkJoy</span>
          <small>Studio</small>
        </button>
        <span className="home-pill" hidden={view !== "home"}>
          Home
        </span>
        <div className="navbar-right">
          {busy ? (
            <span className="busy-pill">
              <Loader2 size={14} />
              {busy}
            </span>
          ) : null}
          <span className="server-tag">🌐 Global Server</span>
          <button type="button" className="btn-logout" onClick={() => void handleSignOut()}>
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </header>

      <div className="app-layout">
        <nav className="sidebar">
          <div className="sidebar-section-label">Manage</div>
          <NavItem view="albums" current={view} icon={<Images size={15} />} label="Albums" onSelect={setView} />
          <NavItem
            view="google"
            current={view}
            icon={<UploadCloud size={15} />}
            label="Google Photos"
            onSelect={setView}
          />
          <NavItem
            view="slideshow"
            current={view}
            icon={<GalleryHorizontalEnd size={15} />}
            label="Slideshow"
            onSelect={setView}
          />
        </nav>

        <section className="view-container">
          <div className="view-content">
            {notice ? <div className="toast toast-success">{notice}</div> : null}
            {error ? <div className="toast toast-error">{error}</div> : null}

            {view === "home" ? (
              <HomeView
                devices={devices}
                albums={albums}
                selectedDeviceId={selectedDeviceId}
                selectedAlbumId={selectedAlbumId}
                google={session.google}
                pickerSession={pickerSession}
                pickedItems={pickedItems}
                importableItems={selectedPickedImages}
                importResult={importResult}
                onSelectDevice={setSelectedDeviceId}
                onSelectAlbum={setSelectedAlbumId}
                onRefresh={() => void loadInkjoyData()}
                onConnectGoogle={() => {
                  window.location.href = "/api/google/oauth/start";
                }}
                onStartPicker={() => void handleCreatePickerSession()}
                onPollPicker={() => void handlePollPicker()}
                onImport={() => void handleImport()}
              />
            ) : null}

            {view === "albums" ? (
              <AlbumsView
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
            ) : null}

            {view === "google" ? (
              <GoogleView
                albums={albums}
                selectedAlbumId={selectedAlbumId}
                google={session.google}
                pickerSession={pickerSession}
                pickedItems={pickedItems}
                importableItems={selectedPickedImages}
                importResult={importResult}
                onSelectAlbum={setSelectedAlbumId}
                onConnect={() => {
                  window.location.href = "/api/google/oauth/start";
                }}
                onStartPicker={() => void handleCreatePickerSession()}
                onPollPicker={() => void handlePollPicker()}
                onImport={() => void handleImport()}
              />
            ) : null}

            {view === "slideshow" ? (
              <SlideshowView
                devices={devices}
                albums={albums}
                carousels={carousels}
                selectedDeviceId={selectedDeviceId}
                selectedDevice={selectedDevice}
                selectedAlbumId={selectedAlbumId}
                onSelectDevice={setSelectedDeviceId}
                onSelectAlbum={setSelectedAlbumId}
                onRefresh={() => selectedDeviceId && void loadCarousels(selectedDeviceId)}
                onActivate={handleActivateAlbum}
              />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function InkjoyLogin({
  onSubmit,
  disabled,
  busy,
}: {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
  busy: string;
}) {
  return (
    <form className="login-card" onSubmit={onSubmit}>
      <button type="button" className="login-lang-btn">
        中文
      </button>
      <div className="login-logo">
        <div className="login-logo-row">
          <span className="brand-mark large">▣</span>
          <span className="login-logo-word">InkJoy</span>
        </div>
        <div className="login-logo-tagline">Studio</div>
        <p>Sign in to manage your e-ink frames</p>
      </div>

      <label>
        Email
        <input name="email" type="email" autoComplete="email" placeholder="user@example.com" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
      </label>
      <label>
        Server
        <select name="region" defaultValue="global">
          <option value="global">Global Server</option>
          <option value="mainland">China Mainland Server</option>
        </select>
      </label>
      <button type="submit" className="btn btn-primary btn-primary-block" disabled={disabled}>
        {busy ? <Loader2 size={15} /> : <Check size={15} />}
        {busy || "Sign In"}
      </button>
    </form>
  );
}

function NavItem(props: {
  view: View;
  current: View;
  icon: React.ReactNode;
  label: string;
  onSelect: (view: View) => void;
}) {
  return (
    <button
      type="button"
      className={`nav-item ${props.current === props.view ? "active" : ""}`}
      onClick={() => props.onSelect(props.view)}
    >
      <span className="nav-icon">{props.icon}</span>
      <span className="nav-label">{props.label}</span>
    </button>
  );
}

function HomeView(props: {
  devices: Device[];
  albums: Album[];
  selectedDeviceId: string;
  selectedAlbumId: string;
  google: SessionState["google"];
  pickerSession: PickerSession | null;
  pickedItems: PickedMediaItem[];
  importableItems: PickedMediaItem[];
  importResult: ImportResult | null;
  onSelectDevice: (deviceId: string) => void;
  onSelectAlbum: (albumId: string) => void;
  onRefresh: () => void;
  onConnectGoogle: () => void;
  onStartPicker: () => void;
  onPollPicker: () => void;
  onImport: () => void;
}) {
  return (
    <>
      <section className="section-card">
        <div className="section-header">
          <div>
            <h2>My Frames</h2>
            <p className="section-subtitle">Select a frame for slideshow setup.</p>
          </div>
          <button type="button" className="icon-btn" onClick={props.onRefresh} aria-label="Refresh">
            <RefreshCcw size={16} />
          </button>
        </div>
        <DeviceGrid
          devices={props.devices}
          selectedDeviceId={props.selectedDeviceId}
          onSelectDevice={props.onSelectDevice}
        />
      </section>

      <section className="section-card">
        <div className="section-header">
          <h2>Choose from Google Photos</h2>
        </div>
        <GoogleImportBody
          albums={props.albums}
          selectedAlbumId={props.selectedAlbumId}
          google={props.google}
          pickerSession={props.pickerSession}
          pickedItems={props.pickedItems}
          importableItems={props.importableItems}
          importResult={props.importResult}
          onSelectAlbum={props.onSelectAlbum}
          onConnect={props.onConnectGoogle}
          onStartPicker={props.onStartPicker}
          onPollPicker={props.onPollPicker}
          onImport={props.onImport}
        />
      </section>
    </>
  );
}

function AlbumsView(props: {
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
    <>
      <div className="screen-header">
        <h2>Albums</h2>
        <form className="new-album-form" onSubmit={props.onCreateAlbum}>
          <input name="albumName" placeholder="Album name" />
          <button type="submit" className="btn btn-primary btn-sm">
            <Plus size={14} />
            New Album
          </button>
        </form>
      </div>

      <div className="album-grid">
        {props.albums.map((album) => (
          <button
            type="button"
            key={album.albumId}
            className={`album-card ${album.albumId === props.selectedAlbumId ? "selected" : ""}`}
            onClick={() => props.onSelectAlbum(album.albumId)}
          >
            <div className="album-thumb">
              {album.coverImgThumbnail || album.coverImg ? (
                <img src={album.coverImgThumbnail || album.coverImg} alt="" />
              ) : (
                <Image size={30} />
              )}
            </div>
            <div className="album-info">
              <strong>{album.albumName || "Untitled"}</strong>
              <span>🖼 {album.imgCount || 0}</span>
            </div>
          </button>
        ))}
      </div>

      {props.selectedAlbum ? (
        <section className="section-card photos-card">
          <div className="photos-top-bar">
            <div>
              <h2>{props.selectedAlbum.albumName || "Album"}</h2>
              <p className="section-subtitle">{props.photos.length} photo(s)</p>
            </div>
            <div className="action-row">
              <button type="button" className="btn btn-secondary btn-sm" onClick={props.onRenameAlbum}>
                Rename
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={props.onDeleteAlbum}>
                <Trash2 size={14} />
                Album
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={props.onDeletePhotos}
                disabled={!props.selectedPhotoIds.length}
              >
                Delete Selected
              </button>
            </div>
          </div>
          <div className="photo-grid">
            {props.photos.map((photo) => (
              <button
                type="button"
                key={photo.imgId}
                className={`photo-card ${props.selectedPhotoIds.includes(photo.imgId) ? "selected" : ""}`}
                onClick={() => props.onTogglePhoto(photo.imgId)}
              >
                {photo.thumbnailUrl ? <img src={photo.thumbnailUrl} alt="" /> : <Image size={24} />}
              </button>
            ))}
          </div>
          {!props.photos.length ? <div className="empty-state">This album is empty.</div> : null}
        </section>
      ) : null}
    </>
  );
}

function GoogleView(props: {
  albums: Album[];
  selectedAlbumId: string;
  google: SessionState["google"];
  pickerSession: PickerSession | null;
  pickedItems: PickedMediaItem[];
  importableItems: PickedMediaItem[];
  importResult: ImportResult | null;
  onSelectAlbum: (albumId: string) => void;
  onConnect: () => void;
  onStartPicker: () => void;
  onPollPicker: () => void;
  onImport: () => void;
}) {
  return (
    <section className="section-card">
      <div className="section-header">
        <div>
          <h2>Google Photos</h2>
          <p className="section-subtitle">Pick images and add them to an Inkjoy album.</p>
        </div>
      </div>
      <GoogleImportBody {...props} />
    </section>
  );
}

function GoogleImportBody(props: {
  albums: Album[];
  selectedAlbumId: string;
  google: SessionState["google"];
  pickerSession: PickerSession | null;
  pickedItems: PickedMediaItem[];
  importableItems: PickedMediaItem[];
  importResult: ImportResult | null;
  onSelectAlbum: (albumId: string) => void;
  onConnect: () => void;
  onStartPicker: () => void;
  onPollPicker: () => void;
  onImport: () => void;
}) {
  const targetAlbum = props.albums.find((album) => album.albumId === props.selectedAlbumId);

  return (
    <div className="google-panel">
      <div className="album-source-panel">
        <div className="album-source-label">Target album</div>
        <div className="inline-album-scroll">
          {props.albums.map((album) => (
            <button
              type="button"
              key={album.albumId}
              className={`inline-album-card ${album.albumId === props.selectedAlbumId ? "selected" : ""}`}
              onClick={() => props.onSelectAlbum(album.albumId)}
            >
              <div className="inline-album-thumb">
                {album.coverImgThumbnail || album.coverImg ? (
                  <img src={album.coverImgThumbnail || album.coverImg} alt="" />
                ) : (
                  <Image size={22} />
                )}
              </div>
              <span>{album.albumName || "Untitled"}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="picker-workflow">
        {!props.google.connected ? (
          <button type="button" className="btn btn-primary" onClick={props.onConnect} disabled={!props.google.configured}>
            <Check size={16} />
            Connect Google
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-primary" onClick={props.onStartPicker}>
              <UploadCloud size={16} />
              Pick Images
            </button>
            {props.pickerSession ? (
              <div className="picker-status">
                <a href={props.pickerSession.pickerUri} target="_blank" rel="noreferrer">
                  Open Picker
                </a>
                <button type="button" className="btn btn-secondary btn-sm" onClick={props.onPollPicker}>
                  <RefreshCcw size={14} />
                  Check
                </button>
                <span>{props.pickerSession.mediaItemsSet ? "Ready" : "Waiting"}</span>
              </div>
            ) : null}
            <div className="stat-row">
              <div>
                <strong>{props.pickedItems.length}</strong>
                <span>Selected</span>
              </div>
              <div>
                <strong>{props.importableItems.length}</strong>
                <span>Images</span>
              </div>
              <div>
                <strong>{props.importResult?.imported || 0}</strong>
                <span>Imported</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-success btn-send-cta"
              onClick={props.onImport}
              disabled={!targetAlbum || !props.importableItems.length}
            >
              Add to {targetAlbum?.albumName || "Album"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SlideshowView(props: {
  devices: Device[];
  albums: Album[];
  carousels: Carousel[];
  selectedDeviceId: string;
  selectedDevice?: Device;
  selectedAlbumId: string;
  onSelectDevice: (deviceId: string) => void;
  onSelectAlbum: (albumId: string) => void;
  onRefresh: () => void;
  onActivate: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const activeAlbumStrategies = props.carousels.filter(
    (carousel) => carousel.status === "ACTIVE" && carousel.albumIdList?.length,
  );

  return (
    <>
      <section className="section-card">
        <div className="section-header">
          <h2>Select Frame</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={props.onRefresh}>
            <RefreshCcw size={14} />
            Refresh
          </button>
        </div>
        <DeviceGrid
          devices={props.devices}
          selectedDeviceId={props.selectedDeviceId}
          onSelectDevice={props.onSelectDevice}
        />
      </section>

      <section className="section-card">
        <div className="section-header">
          <h2>{props.selectedDevice?.deviceName || "Slideshow"}</h2>
          <span className="timeline-summary">{activeAlbumStrategies.length}/{props.carousels.length} active</span>
        </div>

        <div className="strategy-timeline">
          <div className="timeline-title">Today&apos;s Schedule</div>
          {activeAlbumStrategies.length ? (
            activeAlbumStrategies.map((strategy) => (
              <div className="timeline-row" key={strategy.strategyId}>
                <span>● {strategy.albumList?.map((album) => album.albumName).join(", ") || "Album"}</span>
                <div className="timeline-track">
                  {[9, 11, 13, 15, 17].map((hour) => (
                    <i key={hour} style={{ left: `${(hour / 24) * 100}%` }} />
                  ))}
                </div>
                <span>
                  Every {strategy.intervalMinutes || 120} min · {strategy.beginTime || "09:00"}–
                  {strategy.endTime || "18:00"}
                </span>
              </div>
            ))
          ) : (
            <div className="empty-state">No active slideshow schedule.</div>
          )}
          <div className="timeline-axis">
            {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((hour) => (
              <span key={hour}>{hour}</span>
            ))}
          </div>
        </div>

        <div className="slideshow-layout">
          <form className="strategy-form" onSubmit={props.onActivate}>
            <label>
              Album
              <select value={props.selectedAlbumId} onChange={(event) => props.onSelectAlbum(event.target.value)}>
                {props.albums.map((album) => (
                  <option key={album.albumId} value={album.albumId}>
                    {album.albumName || "Untitled"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Trigger
              <select name="updateType" defaultValue="INTERVAL">
                <option value="INTERVAL">Interval</option>
                <option value="FIXED">Fixed Schedule</option>
              </select>
            </label>
            <label>
              Start
              <input name="beginTime" type="time" defaultValue="09:00" />
            </label>
            <label>
              End
              <input name="endTime" type="time" defaultValue="18:00" />
            </label>
            <label>
              Every (min)
              <input name="intervalMinutes" type="number" min="5" defaultValue="120" />
            </label>
            <label>
              Repeat every (days)
              <input name="updateDays" type="number" min="1" defaultValue="1" />
            </label>
            <label>
              Push at
              <input name="updateTimeList" defaultValue="09:00,18:00" />
            </label>
            <label>
              Play Order
              <select name="playOrder" defaultValue="SEQUENTIALLY">
                <option value="SEQUENTIALLY">Sequential</option>
                <option value="SHUFFLE">Shuffle</option>
              </select>
            </label>
            <label>
              After display
              <select name="idle" defaultValue="1">
                <option value="1">Stay on</option>
                <option value="0">Sleep</option>
              </select>
            </label>
            <label className="checkbox-row">
              <input name="playNow" type="checkbox" defaultChecked />
              Push immediately
            </label>
            <button type="submit" className="btn btn-primary">
              <Plus size={15} />
              Save Slideshow
            </button>
          </form>

          <div className="strategy-list">
            {props.carousels.map((carousel) => (
              <div key={carousel.strategyId} className="strategy-card">
                <div>
                  <strong>
                    {carousel.albumList?.map((album) => album.albumName).join(", ") ||
                      carousel.widgetKey ||
                      "Slideshow"}
                  </strong>
                  <span>
                    Every {carousel.intervalMinutes || 120} min, {carousel.beginTime || "09:00"}-
                    {carousel.endTime || "18:00"} ·{" "}
                    {carousel.playOrder === "SHUFFLE" ? "Shuffle" : "Sequential"}
                  </span>
                </div>
                <span className={`status-badge ${carousel.status === "ACTIVE" ? "active" : ""}`}>
                  {carousel.status === "ACTIVE" ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function DeviceGrid(props: {
  devices: Device[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
}) {
  if (!props.devices.length) {
    return <div className="empty-state">No linked devices.</div>;
  }

  return (
    <div className="device-grid">
      {props.devices.map((device) => (
        <DeviceCard
          key={device.deviceId}
          device={device}
          selected={device.deviceId === props.selectedDeviceId}
          onClick={() => props.onSelectDevice(device.deviceId)}
        />
      ))}
    </div>
  );
}

function DeviceCard({ device, selected, onClick }: { device: Device; selected: boolean; onClick: () => void }) {
  const currentStatus = (device as Device & { currentStatus?: { battery?: number } }).currentStatus;
  const battery = currentStatus?.battery;

  return (
    <button type="button" className={`device-card ${selected ? "selected" : ""}`} onClick={onClick}>
      {selected ? <span className="selected-badge">✓</span> : null}
      <div className="device-frame-box">
        <div className={`device-frame ${device.orientation === 90 || device.orientation === 270 ? "landscape" : ""}`}>
          {device.lastPlayThumbnailUrl ? <img src={device.lastPlayThumbnailUrl} alt="" /> : <Monitor size={34} />}
        </div>
      </div>
      <strong>{device.deviceName || "Inkjoy"}</strong>
      <span className="device-meta">
        <i className={device.status === "ONLINE" ? "online-dot" : "offline-dot"} />
        {device.status === "ONLINE" ? "Online" : device.status || "Offline"}
        {typeof battery === "number" ? ` · ${battery}%` : ""}
      </span>
    </button>
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
