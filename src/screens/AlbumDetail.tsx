import { useState } from "react";
import { ArrowLeft, Eye, Image, Monitor, MoreVertical, Plus, Send, X } from "lucide-react";
import type { Album, AlbumPhoto, Device } from "../types";
import { PhotoViewer } from "../components/PhotoViewer";
import { AlbumOptionsSheet } from "./AlbumOptionsSheet";

export function AlbumDetail(props: {
  album: Album;
  photos: AlbumPhoto[];
  devices: Device[];
  selectedPhotoIds: string[];
  onBack: () => void;
  onAdd: () => void;
  onTogglePhoto: (imgId: string) => void;
  onCancelSelection: () => void;
  onDeletePhotos: () => void;
  onRenameAlbum: (albumName: string) => void;
  onDeleteAlbum: () => void;
  onSendToFrame: (imgId: string, deviceId: string) => void;
}) {
  const selecting = props.selectedPhotoIds.length > 0;
  const [viewingPhoto, setViewingPhoto] = useState<AlbumPhoto | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [pickingFrame, setPickingFrame] = useState(false);

  function handleSendSelectedToFrame() {
    const imgId = props.selectedPhotoIds[0];
    if (!imgId) return;
    if (props.devices.length === 1) {
      props.onSendToFrame(imgId, props.devices[0].deviceId);
      props.onCancelSelection();
      return;
    }
    setPickingFrame(true);
  }

  return (
    <div className="mobile-screen">
      <div className="mobile-app-bar">
        <button type="button" className="icon-btn-ghost" onClick={props.onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="mobile-app-bar-title">
          <strong>{props.album.albumName || "Album"}</strong>
          <span>{props.photos.length} photos · synced</span>
        </div>
        <div className="mobile-app-bar-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={props.onAdd}>
            <Plus size={14} />
            Add
          </button>
          <button
            type="button"
            className="icon-btn-ghost"
            onClick={() => setOptionsOpen(true)}
            aria-label="Album options"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      <div className="mobile-screen-body">
        <div className="photo-grid photo-grid-3col">
          {props.photos.map((photo) => (
            <button
              type="button"
              key={photo.imgId}
              className={`photo-card ${props.selectedPhotoIds.includes(photo.imgId) ? "selected" : ""}`}
              onClick={() => props.onTogglePhoto(photo.imgId)}
            >
              {photo.thumbnailUrl ? <img src={photo.thumbnailUrl} alt="" /> : <Image size={20} />}
              <span
                className="photo-view-badge"
                role="button"
                tabIndex={0}
                aria-label="View photo"
                onClick={(event) => {
                  event.stopPropagation();
                  setViewingPhoto(photo);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    setViewingPhoto(photo);
                  }
                }}
              >
                <Eye size={13} />
              </span>
              {props.selectedPhotoIds.includes(photo.imgId) ? <span className="photo-check-badge">✓</span> : null}
            </button>
          ))}
        </div>
        {!props.photos.length ? <div className="empty-state">This album is empty.</div> : null}
      </div>

      {viewingPhoto ? (
        <PhotoViewer
          photo={viewingPhoto}
          devices={props.devices}
          onSendToFrame={(deviceId) => {
            props.onSendToFrame(viewingPhoto.imgId, deviceId);
            setViewingPhoto(null);
          }}
          onClose={() => setViewingPhoto(null)}
        />
      ) : null}

      {optionsOpen ? (
        <AlbumOptionsSheet
          album={props.album}
          onRename={(albumName) => {
            setOptionsOpen(false);
            props.onRenameAlbum(albumName);
          }}
          onDelete={() => {
            setOptionsOpen(false);
            props.onDeleteAlbum();
          }}
          onClose={() => setOptionsOpen(false)}
        />
      ) : null}

      {selecting ? (
        <div className="selection-bar">
          <span>{props.selectedPhotoIds.length} selected</span>
          <div className="selection-bar-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={props.onCancelSelection}>
              Cancel
            </button>
            {props.selectedPhotoIds.length === 1 && props.devices.length ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleSendSelectedToFrame}>
                <Send size={14} />
                Send to frame
              </button>
            ) : null}
            <button type="button" className="btn btn-danger btn-sm" onClick={props.onDeletePhotos}>
              Delete
            </button>
          </div>
        </div>
      ) : null}

      {pickingFrame ? (
        <div className="sheet-overlay" role="presentation" onMouseDown={() => setPickingFrame(false)}>
          <section
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="send-frame-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className="sheet-handle" />
            <div className="sheet-header-row">
              <h2 id="send-frame-title">Send to which frame?</h2>
              <button type="button" className="icon-btn" onClick={() => setPickingFrame(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="sheet-rows">
              {props.devices.map((device) => (
                <button
                  type="button"
                  key={device.deviceId}
                  className="sheet-row"
                  onClick={() => {
                    props.onSendToFrame(props.selectedPhotoIds[0], device.deviceId);
                    setPickingFrame(false);
                    props.onCancelSelection();
                  }}
                >
                  <span className="sheet-row-icon">
                    <Monitor size={16} />
                  </span>
                  <span className="sheet-row-copy">
                    <strong>{device.deviceName || "Frame"}</strong>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
