import { useState } from "react";
import { ArrowLeft, Eye, Image, MoreVertical, Plus } from "lucide-react";
import type { Album, AlbumPhoto } from "../types";
import { PhotoViewer } from "../components/PhotoViewer";
import { AlbumOptionsSheet } from "./AlbumOptionsSheet";

export function AlbumDetail(props: {
  album: Album;
  photos: AlbumPhoto[];
  selectedPhotoIds: string[];
  onBack: () => void;
  onAdd: () => void;
  onTogglePhoto: (imgId: string) => void;
  onCancelSelection: () => void;
  onDeletePhotos: () => void;
  onRenameAlbum: (albumName: string) => void;
  onDeleteAlbum: () => void;
}) {
  const selecting = props.selectedPhotoIds.length > 0;
  const [viewingPhoto, setViewingPhoto] = useState<AlbumPhoto | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);

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

      {viewingPhoto ? <PhotoViewer photo={viewingPhoto} onClose={() => setViewingPhoto(null)} /> : null}

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
            <button type="button" className="btn btn-danger btn-sm" onClick={props.onDeletePhotos}>
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
