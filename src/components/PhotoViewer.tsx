import { X } from "lucide-react";
import type { AlbumPhoto } from "../types";

export function PhotoViewer(props: { photo: AlbumPhoto; onClose: () => void }) {
  const src = props.photo.thumbnailUrl || props.photo.originUrl;

  return (
    <div className="photo-viewer-overlay" role="presentation" onClick={props.onClose}>
      <button type="button" className="icon-btn-ghost dark photo-viewer-close" onClick={props.onClose} aria-label="Close">
        <X size={20} />
      </button>
      <div className="photo-viewer-stage" onClick={(event) => event.stopPropagation()}>
        {src ? <img src={src} alt="" /> : null}
      </div>
    </div>
  );
}
