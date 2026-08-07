import { Image, Plus, RefreshCcw } from "lucide-react";
import { DeviceGrid } from "../components/DeviceGrid";
import type { Album, Device } from "../types";

export function HomeView(props: {
  devices: Device[];
  albums: Album[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  onRefresh: () => void;
  onAddPhotos: () => void;
  onOpenAlbum: (albumId: string) => void;
}) {
  return (
    <>
      <section className="section-card">
        <div className="section-header">
          <div>
            <h2>My Frames</h2>
            <p className="section-subtitle">Select a frame for slideshow setup.</p>
          </div>
          <div className="action-row">
            <button type="button" className="btn btn-primary btn-sm" onClick={props.onAddPhotos}>
              <Plus size={14} />
              Add Photos
            </button>
            <button type="button" className="icon-btn" onClick={props.onRefresh} aria-label="Refresh">
              <RefreshCcw size={16} />
            </button>
          </div>
        </div>
        <DeviceGrid
          devices={props.devices}
          selectedDeviceId={props.selectedDeviceId}
          onSelectDevice={props.onSelectDevice}
        />
      </section>

      <section className="section-card">
        <div className="section-header">
          <h2>Recent albums</h2>
        </div>
        <div className="album-grid recent-album-grid">
          {props.albums.slice(0, 4).map((album) => (
            <button
              type="button"
              key={album.albumId}
              className="album-card"
              onClick={() => props.onOpenAlbum(album.albumId)}
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
                <span>{album.imgCount || 0} photos</span>
              </div>
            </button>
          ))}
        </div>
        {!props.albums.length ? <div className="empty-state">No albums yet.</div> : null}
      </section>
    </>
  );
}
