import { useState } from "react";
import { X } from "lucide-react";
import type { AlbumPhoto } from "../types";

export function PhotoViewer(props: { photo: AlbumPhoto; onClose: () => void }) {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const src = props.photo.originUrl || props.photo.thumbnailUrl;
  const orientation = dimensions
    ? dimensions.width === dimensions.height
      ? "Square"
      : dimensions.width > dimensions.height
        ? "Landscape"
        : "Portrait"
    : null;

  return (
    <div className="photo-viewer-overlay" role="presentation" onClick={props.onClose}>
      <button type="button" className="icon-btn-ghost dark photo-viewer-close" onClick={props.onClose} aria-label="Close">
        <X size={20} />
      </button>
      <div className="photo-viewer-stage" onClick={(event) => event.stopPropagation()}>
        {src ? (
          <img
            src={src}
            alt=""
            onLoad={(event) => {
              const img = event.currentTarget;
              setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            }}
          />
        ) : null}
      </div>
      {orientation && dimensions ? (
        <div className="photo-viewer-caption">
          {orientation} · {dimensions.width} × {dimensions.height}
        </div>
      ) : null}
    </div>
  );
}
