import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Images, Loader2, LogOut } from "lucide-react";
import { api, SessionExpiredError } from "./lib/api";
import "./styles.css";
import type {
  Album,
  AlbumPhoto,
  Carousel,
  CropAdjustment,
  Device,
  ImportResult,
  LocalPickedPhoto,
  PickedMediaItem,
  PickerSession,
  PickOrigin,
  SessionState,
  View,
} from "./types";
import {
  loadGoogleIdentityServices,
  parsePollingInterval,
  requestGoogleToken,
  toAutoclosePickerUri,
} from "./lib/googleIdentity";
import { compositeCrop, loadImageBitmap } from "./lib/compositeCanvas";
import { cropStageFrame, defaultCropAdjustment } from "./lib/crop";
import { pickLocalPhotos, toLocalPickedPhotos } from "./lib/localPhotos";
import { consumeSharedFiles, isShareTargetLaunch } from "./lib/shareTarget";
import { useIsMobile } from "./hooks/useIsMobile";
import { SyncjoyLogo } from "./components/SyncjoyLogo";
import { NavItem } from "./components/NavItem";
import { BottomTabBar } from "./components/BottomTabBar";
import { Fab } from "./components/Fab";
import { InkjoyLogin } from "./screens/Login";
import { HomeView } from "./screens/Home";
import { AlbumsView } from "./screens/Albums";
import { AlbumDetail } from "./screens/AlbumDetail";
import { FrameDetail } from "./screens/FrameDetail";
import { AddPhotosSheet } from "./screens/AddPhotosSheet";
import { Review } from "./screens/Review";
import { Crop } from "./screens/Crop";
import { Importing } from "./screens/Importing";
import { Done } from "./screens/Done";
import { PickerSessionModal } from "./screens/Google";
import { SlideshowEditorSheet } from "./screens/Slideshow";

const defaultSession: SessionState = {
  inkjoy: { connected: false },
  google: { connected: false, configured: false },
};

const DEFAULT_PANEL_SIZE = { w: 1200, h: 1600 };
const FULLSCREEN_VIEWS: View[] = ["album", "frame", "review", "crop", "importing", "done"];
const HISTORY_TRACKED_VIEWS: View[] = ["album", "frame", "review", "crop"];

function App() {
  const isMobile = useIsMobile();
  const [session, setSession] = useState<SessionState>(defaultSession);
  const [view, setView] = useState<View>("home");
  const [devices, setDevices] = useState<Device[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [albumDetailAlbumId, setAlbumDetailAlbumId] = useState("");
  const [slideshowEditorOpen, setSlideshowEditorOpen] = useState(false);
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [localGoogleClientId, setLocalGoogleClientId] = useState(() =>
    window.localStorage.getItem("syncjoy_google_client_id") || "",
  );
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [pickedItems, setPickedItems] = useState<PickedMediaItem[]>([]);
  const [pickerSession, setPickerSession] = useState<PickerSession | null>(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loginNotice, setLoginNotice] = useState("");

  const [addPhotosSheetOpen, setAddPhotosSheetOpen] = useState(false);
  const [pickOrigin, setPickOrigin] = useState<PickOrigin>("home");
  const [picked, setPicked] = useState<LocalPickedPhoto[]>([]);
  const [pickTargetAlbumId, setPickTargetAlbumId] = useState("");
  const [crops, setCrops] = useState<Record<string, CropAdjustment>>({});
  const [cropIndex, setCropIndex] = useState(0);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [localImportResult, setLocalImportResult] = useState<{
    imported: number;
    albumName: string;
    error?: string;
  } | null>(null);

  const selectedDevice = devices.find((device) => device.deviceId === selectedDeviceId);
  const albumDetailAlbum = albums.find((album) => album.albumId === albumDetailAlbumId);
  const activeCarouselForDevice = carousels.find(
    (carousel) => carousel.deviceId === selectedDeviceId && carousel.status === "ACTIVE" && carousel.albumIdList?.length,
  );
  const panelSize = useMemo(() => {
    const width = selectedDevice?.resolution?.width;
    const height = selectedDevice?.resolution?.height;
    return width && height ? { w: width, h: height } : DEFAULT_PANEL_SIZE;
  }, [selectedDevice]);
  const frameLabel = selectedDevice?.deviceName || "your frame";
  const googleSession = useMemo(
    () => ({
      ...session.google,
      configured: session.google.configured || Boolean(localGoogleClientId),
      clientId: session.google.clientId || localGoogleClientId || undefined,
      expired: session.google.expired || Boolean(session.google.expiresAt && session.google.expiresAt <= Date.now()),
      connected:
        session.google.connected && !Boolean(session.google.expiresAt && session.google.expiresAt <= Date.now()),
    }),
    [localGoogleClientId, session.google],
  );
  const selectedPickedImages = useMemo(
    () =>
      pickedItems.filter((item) =>
        ["image/jpeg", "image/png"].includes(item.mediaFile?.mimeType || ""),
      ),
    [pickedItems],
  );

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/share-sw.js").catch(() => {});
    }
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

  useEffect(() => {
    if (session.google.clientId && session.google.clientId !== localGoogleClientId) {
      setLocalGoogleClientId(session.google.clientId);
      window.localStorage.setItem("syncjoy_google_client_id", session.google.clientId);
    }
  }, [localGoogleClientId, session.google.clientId]);

  useEffect(() => {
    if (albumDetailAlbumId && !albums.some((album) => album.albumId === albumDetailAlbumId)) {
      setAlbumDetailAlbumId("");
    }
  }, [albumDetailAlbumId, albums]);

  useEffect(() => {
    if (picked.length && !albums.some((album) => album.albumId === pickTargetAlbumId)) {
      setPickTargetAlbumId(albums[0]?.albumId || "");
    }
  }, [albums, picked.length, pickTargetAlbumId]);

  useEffect(() => {
    if (!pickerModalOpen || !pickerSession || pickerSession.mediaItemsSet) return;

    const pollMs = parsePollingInterval(pickerSession.pollingConfig?.pollInterval);
    const timer = window.setInterval(() => {
      void pollPickerSession(pickerSession.id);
    }, pollMs);

    return () => window.clearInterval(timer);
  }, [pickerModalOpen, pickerSession]);

  useEffect(() => {
    function onPopState() {
      setView((current) => (HISTORY_TRACKED_VIEWS.includes(current) ? backTargetFor(current) : current));
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickOrigin]);

  function backTargetFor(currentView: View): View {
    switch (currentView) {
      case "frame":
        return "home";
      case "album":
        return "albums";
      case "review":
        return pickOrigin;
      case "crop":
        return "review";
      default:
        return "home";
    }
  }

  function pushView(next: View) {
    if (HISTORY_TRACKED_VIEWS.includes(next)) {
      window.history.pushState({ view: next }, "");
    }
    setView(next);
  }

  function goBack() {
    if (view === "review") {
      clearPicked();
    }
    if (HISTORY_TRACKED_VIEWS.includes(view)) {
      window.history.back();
    } else {
      setView(backTargetFor(view));
    }
  }

  async function run<T>(label: string, action: () => Promise<T>) {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      return await action();
    } catch (caught) {
      if (caught instanceof SessionExpiredError) {
        setSession(defaultSession);
        setLoginNotice("Your Inkjoy session expired. Please sign in again.");
        return undefined;
      }
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
      await consumeSharedFilesIfPresent();
    }
  }

  async function consumeSharedFilesIfPresent() {
    if (!isShareTargetLaunch(window.location.search)) return;
    window.history.replaceState({}, "", window.location.pathname);
    const files = await consumeSharedFiles();
    const items = await toLocalPickedPhotos(files);
    if (!items.length) return;
    setPickOrigin("home");
    setPicked(items);
    setCrops(Object.fromEntries(items.map((item) => [item.id, defaultCropAdjustment()])));
    setCropIndex(0);
    pushView("review");
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
    setLoginNotice("");
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
      setAlbumDetailAlbumId("");
      setSlideshowEditorOpen(false);
      setPickerModalOpen(false);
      setAddPhotosSheetOpen(false);
      clearPicked();
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

  async function handleDeletePhotos() {
    if (!albumDetailAlbumId || !selectedPhotoIds.length) return;
    const deleted = await run("Deleting photos", () =>
      api.deleteAlbumPhotos(albumDetailAlbumId, selectedPhotoIds),
    );
    if (deleted) {
      await loadPhotos(albumDetailAlbumId);
    }
  }

  function openAlbumDetail(albumId: string) {
    setSelectedAlbumId(albumId);
    setAlbumDetailAlbumId(albumId);
    pushView("album");
  }

  function openFrameDetail(deviceId: string) {
    setSelectedDeviceId(deviceId);
    pushView("frame");
  }

  function openAddPhotos(origin: PickOrigin) {
    setPickOrigin(origin);
    setPickTargetAlbumId(origin === "album" ? albumDetailAlbumId : selectedAlbumId || albums[0]?.albumId || "");
    setAddPhotosSheetOpen(true);
  }

  async function handlePickLocal() {
    const items = await pickLocalPhotos();
    setAddPhotosSheetOpen(false);
    if (!items.length) return;
    setPicked(items);
    setCrops(Object.fromEntries(items.map((item) => [item.id, defaultCropAdjustment()])));
    setCropIndex(0);
    pushView("review");
  }

  function handleGooglePhotosRow() {
    setAddPhotosSheetOpen(false);

    if (!googleSession.configured) {
      const clientId = window.prompt(
        "Google OAuth Client ID (Web application client, with this origin authorized)",
      );
      if (!clientId) return;
      window.localStorage.setItem("syncjoy_google_client_id", clientId);
      setLocalGoogleClientId(clientId);
      return;
    }

    if (!googleSession.connected) {
      void handleConnectGoogle();
      return;
    }

    if (pickerSession) {
      setPickerModalOpen(true);
    } else {
      void handleCreatePickerSession();
    }
  }

  async function handleCreatePickerSession() {
    const created = await run("Starting Picker", () => api.createPickerSession());
    if (created) {
      setPickerSession(created);
      setPickerModalOpen(true);
      window.setTimeout(() => handleOpenPickerWindow(created), 0);
    }
  }

  async function handlePollPicker() {
    if (!pickerSession) return;
    await pollPickerSession(pickerSession.id);
  }

  async function pollPickerSession(sessionId: string) {
    const nextSession = await run("Checking Picker", () => api.getPickerSession(sessionId));
    if (!nextSession) return;
    setPickerSession(nextSession);
    if (nextSession.mediaItemsSet) {
      await loadPickedItems(nextSession.id);
    }
  }

  function handleOpenPickerWindow(nextSession = pickerSession) {
    if (!nextSession?.pickerUri) return;
    window.open(toAutoclosePickerUri(nextSession.pickerUri), "syncjoy-google-picker", "popup,width=1120,height=820");
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

  async function handleConnectGoogle() {
    if (!googleSession.clientId) {
      window.location.href = "/api/google/oauth/start";
      return;
    }

    const nextSession = await run("Connecting Google", async () => {
      await loadGoogleIdentityServices();
      const token = await requestGoogleToken(googleSession.clientId || "");

      if (!token.access_token) {
        throw new Error(token.error_description || token.error || "Google sign-in did not return an access token");
      }

      await api.connectGoogleToken({
        accessToken: token.access_token,
        expiresIn: token.expires_in,
        scope: token.scope,
        tokenType: token.token_type,
      });
      return api.session();
    });

    if (nextSession) {
      setSession(nextSession);
      setNotice("Google Photos connected.");
      if (pickerSession) {
        setPickerModalOpen(true);
      } else {
        void handleCreatePickerSession();
      }
    }
  }

  async function handleGoogleImport() {
    if (!pickTargetAlbumId || !selectedPickedImages.length) return;
    const result: ImportResult | undefined = await run("Importing images", () =>
      api.importGoogleToInkjoy(pickTargetAlbumId, selectedPickedImages),
    );
    if (result) {
      setNotice(`Imported ${result.imported} image${result.imported === 1 ? "" : "s"}.`);
      await loadPhotos(pickTargetAlbumId);
      await loadInkjoyData();
      setPickedItems([]);
      setPickerSession(null);
      setPickerModalOpen(false);
    }
  }

  function clearPicked() {
    for (const item of picked) {
      URL.revokeObjectURL(item.previewUrl);
    }
    setPicked([]);
    setCrops({});
    setCropIndex(0);
  }

  function handleUpdateCrop(id: string, patch: Partial<CropAdjustment>) {
    setCrops((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  function handleResetCrop(id: string) {
    setCrops((current) => ({ ...current, [id]: defaultCropAdjustment() }));
  }

  function handleApplyToAll() {
    const current = picked[cropIndex] && crops[picked[cropIndex].id];
    if (!current) return;
    setCrops((prev) => {
      const next = { ...prev };
      for (const item of picked) {
        next[item.id] = { ...current };
      }
      return next;
    });
  }

  async function handleConfirmImport() {
    if (!pickTargetAlbumId || !picked.length || view === "importing") return;
    setView("importing");
    setImportProgress({ done: 0, total: picked.length });
    let imported = 0;
    let lastError = "";

    for (const item of picked) {
      try {
        const bitmap = await loadImageBitmap(item.file);
        const stageFrame = cropStageFrame(panelSize);
        const blob = await compositeCrop(bitmap, panelSize, stageFrame, crops[item.id] || defaultCropAdjustment());
        await api.uploadLocalPhoto(pickTargetAlbumId, blob, `${item.id}.jpg`);
        imported += 1;
      } catch (caught) {
        lastError = caught instanceof Error ? caught.message : "Upload failed";
        setError(lastError);
      }
      setImportProgress((prev) => ({ ...prev, done: prev.done + 1 }));
    }

    const targetAlbum = albums.find((album) => album.albumId === pickTargetAlbumId);
    setLocalImportResult({
      imported,
      albumName: targetAlbum?.albumName || "your album",
      error: imported === 0 ? lastError : undefined,
    });
    await loadPhotos(pickTargetAlbumId);
    await loadInkjoyData();
    setView("done");
  }

  function handleDoneFinish() {
    const origin = pickOrigin;
    clearPicked();
    setLocalImportResult(null);
    setView(origin === "album" ? "album" : "home");
  }

  function handleAddMore() {
    clearPicked();
    setLocalImportResult(null);
    setView(pickOrigin === "album" ? "album" : "home");
    setAddPhotosSheetOpen(true);
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
        strategyId: activeCarouselForDevice?.strategyId,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        playOrder: String(form.get("playOrder") || "SEQUENTIALLY") as "SEQUENTIALLY" | "SHUFFLE",
        updateType,
        updateDays: Number(form.get("updateDays") || 1),
        updateTimeList:
          updateType === "FIXED"
            ? form
                .getAll("updateTimeList")
                .map((item) => String(item).trim())
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
      setSlideshowEditorOpen(false);
      await loadCarousels(selectedDeviceId);
    }
  }

  async function handlePlayNow(deviceId: string) {
    const active = carousels.find(
      (carousel) => carousel.deviceId === deviceId && carousel.status === "ACTIVE" && carousel.albumIdList?.length,
    );
    if (!active || !active.albumIdList?.[0]) return;
    const activated = await run("Playing now", () =>
      api.activateAlbum({
        deviceId,
        albumId: active.albumIdList?.[0] || "",
        strategyId: active.strategyId,
        timezone: active.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        playOrder: active.playOrder || "SEQUENTIALLY",
        updateType: active.updateType || "INTERVAL",
        updateDays: active.updateDays || 1,
        updateTimeList: active.updateTimeList,
        beginTime: active.beginTime,
        endTime: active.endTime,
        intervalMinutes: active.intervalMinutes,
        idle: active.idle ?? 1,
        playNow: true,
      }),
    );
    if (activated) {
      setNotice("Playing now.");
      await loadCarousels(deviceId);
    }
  }

  if (!session.inkjoy.connected) {
    return (
      <main className="login-page">
        <InkjoyLogin onSubmit={handleLogin} disabled={Boolean(busy)} busy={busy} notice={loginNotice} />
      </main>
    );
  }

  const toasts = (
    <>
      {notice ? <div className="toast toast-success toast-float">{notice}</div> : null}
      {error ? <div className="toast toast-error toast-float">{error}</div> : null}
      {busy ? (
        <span className="busy-pill toast-float busy-float">
          <Loader2 size={14} />
          {busy}
        </span>
      ) : null}
    </>
  );

  const overlays = (
    <>
      {addPhotosSheetOpen ? (
        <AddPhotosSheet
          isMobile={isMobile}
          onPickLocal={() => void handlePickLocal()}
          onGooglePhotos={handleGooglePhotosRow}
          onClose={() => setAddPhotosSheetOpen(false)}
        />
      ) : null}

      {slideshowEditorOpen ? (
        <SlideshowEditorSheet
          albums={albums}
          selectedAlbumId={selectedAlbumId}
          onSelectAlbum={setSelectedAlbumId}
          activeCarousel={activeCarouselForDevice}
          onActivate={handleActivateAlbum}
          onClose={() => setSlideshowEditorOpen(false)}
        />
      ) : null}

      {pickerModalOpen && pickerSession ? (
        <PickerSessionModal
          session={pickerSession}
          items={selectedPickedImages}
          targetAlbumName={albums.find((album) => album.albumId === pickTargetAlbumId)?.albumName}
          onOpenPicker={handleOpenPickerWindow}
          onImport={() => void handleGoogleImport()}
          onClose={() => setPickerModalOpen(false)}
        />
      ) : null}
    </>
  );

  if (FULLSCREEN_VIEWS.includes(view)) {
    return (
      <>
        {toasts}
        {view === "album" && albumDetailAlbum ? (
          <AlbumDetail
            album={albumDetailAlbum}
            photos={photos}
            selectedPhotoIds={selectedPhotoIds}
            onBack={goBack}
            onAdd={() => openAddPhotos("album")}
            onTogglePhoto={(imgId) =>
              setSelectedPhotoIds((current) =>
                current.includes(imgId) ? current.filter((id) => id !== imgId) : [...current, imgId],
              )
            }
            onCancelSelection={() => setSelectedPhotoIds([])}
            onDeletePhotos={() => void handleDeletePhotos()}
          />
        ) : null}

        {view === "frame" && selectedDevice ? (
          <FrameDetail
            device={selectedDevice}
            carousels={carousels}
            onBack={goBack}
            onEditSlideshow={() => {
              if (activeCarouselForDevice?.albumIdList?.[0]) {
                setSelectedAlbumId(activeCarouselForDevice.albumIdList[0]);
              }
              setSlideshowEditorOpen(true);
            }}
            onPlayNow={() => void handlePlayNow(selectedDevice.deviceId)}
          />
        ) : null}

        {view === "review" ? (
          <Review
            picked={picked}
            crops={crops}
            albums={albums}
            targetAlbumId={pickTargetAlbumId}
            panelAspect={panelSize.w / panelSize.h}
            frameLabel={frameLabel}
            onSelectTargetAlbum={setPickTargetAlbumId}
            onOpenCrop={() => pushView("crop")}
            onBack={goBack}
            onConfirm={() => void handleConfirmImport()}
          />
        ) : null}

        {view === "crop" ? (
          <Crop
            photos={picked}
            crops={crops}
            index={cropIndex}
            panelSize={panelSize}
            frameLabel={frameLabel}
            onChangeIndex={setCropIndex}
            onUpdateCrop={handleUpdateCrop}
            onResetCrop={handleResetCrop}
            onApplyToAll={handleApplyToAll}
            onBack={goBack}
            onFinish={() => void handleConfirmImport()}
          />
        ) : null}

        {view === "importing" ? <Importing done={importProgress.done} total={importProgress.total} /> : null}

        {view === "done" && localImportResult ? (
          <Done
            addedCount={localImportResult.imported}
            albumName={localImportResult.albumName}
            error={localImportResult.error}
            onDone={handleDoneFinish}
            onAddMore={handleAddMore}
          />
        ) : null}

        {overlays}
      </>
    );
  }

  return (
    <main className="app-page">
      <header className="navbar">
        <button type="button" className="navbar-brand" onClick={() => setView("home")}>
          <SyncjoyLogo compact />
        </button>
        <span className="home-pill" hidden={view !== "home"}>
          Home
        </span>
        <div className="navbar-right">
          <span className="server-tag">🌐 Global Server</span>
          <button type="button" className="btn-logout" onClick={() => void handleSignOut()}>
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </header>

      <div className="app-layout">
        {!isMobile ? (
          <nav className="sidebar">
            <div className="sidebar-section-label">Manage</div>
            <NavItem view="albums" current={view} icon={<Images size={15} />} label="Albums" onSelect={setView} />
          </nav>
        ) : null}

        <section className={`view-container ${isMobile ? "mobile" : ""}`}>
          <div className="view-content">
            {toasts}

            {view === "home" ? (
              <HomeView
                devices={devices}
                albums={albums}
                selectedDeviceId={selectedDeviceId}
                onSelectDevice={openFrameDetail}
                onRefresh={() => void loadInkjoyData()}
                onAddPhotos={() => openAddPhotos("home")}
                onOpenAlbum={openAlbumDetail}
              />
            ) : null}

            {view === "albums" ? (
              <AlbumsView albums={albums} onOpenAlbum={openAlbumDetail} onCreateAlbum={handleCreateAlbum} />
            ) : null}
          </div>
        </section>
      </div>

      {isMobile ? (
        <>
          <BottomTabBar current={view} onSelect={setView} />
          <Fab onClick={() => openAddPhotos("home")} />
        </>
      ) : null}

      {overlays}
    </main>
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
