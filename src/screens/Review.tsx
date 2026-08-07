import { ArrowLeft, Check, TriangleAlert } from "lucide-react";
import { needsFraming } from "../lib/crop";
import type { Album, CropAdjustment, LocalPickedPhoto } from "../types";

export function Review(props: {
  picked: LocalPickedPhoto[];
  crops: Record<string, CropAdjustment>;
  albums: Album[];
  targetAlbumId: string;
  panelAspect: number;
  frameLabel: string;
  onSelectTargetAlbum: (albumId: string) => void;
  onOpenCrop: () => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const unresolved = props.picked.filter((photo) => {
    const crop = props.crops[photo.id];
    return needsFraming(photo.width / photo.height, props.panelAspect) && !crop?.done;
  });
  const targetAlbum = props.albums.find((album) => album.albumId === props.targetAlbumId);

  return (
    <div className="mobile-screen">
      <div className="mobile-app-bar">
        <button type="button" className="icon-btn-ghost" onClick={props.onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <span>Add to album</span>
        <span className="mobile-app-bar-spacer" />
      </div>

      <div className="mobile-screen-body">
        <div className="review-strip">
          {props.picked.map((photo) => (
            <div className="review-thumb" key={photo.id}>
              <img src={photo.previewUrl} alt="" />
            </div>
          ))}
        </div>

        <button
          type="button"
          className={`framing-card ${unresolved.length ? "attention" : "resolved"}`}
          onClick={props.onOpenCrop}
        >
          <span className="framing-icon">{unresolved.length ? <TriangleAlert size={18} /> : <Check size={18} />}</span>
          <span className="framing-copy">
            <strong>
              {unresolved.length
                ? `${unresolved.length} photo${unresolved.length === 1 ? "" : "s"} don't fit the frame`
                : `All ${props.picked.length} framed for ${props.frameLabel}`}
            </strong>
            <span>
              {unresolved.length
                ? `Frame is ${describeAspect(props.panelAspect)} · edges would be trimmed`
                : "Tap to adjust any framing"}
            </span>
          </span>
          <span className="framing-cta">Frame them</span>
        </button>

        <div className="target-album-panel">
          <div className="album-source-label">Target album</div>
          <div className="target-album-list">
            {props.albums.map((album) => (
              <button
                type="button"
                key={album.albumId}
                className={`target-album-row ${album.albumId === props.targetAlbumId ? "selected" : ""}`}
                onClick={() => props.onSelectTargetAlbum(album.albumId)}
              >
                <span className="target-album-cover">
                  {album.coverImgThumbnail || album.coverImg ? (
                    <img src={album.coverImgThumbnail || album.coverImg} alt="" />
                  ) : null}
                </span>
                <span className="target-album-info">
                  <strong>{album.albumName || "Untitled"}</strong>
                  <span>{album.imgCount || 0} photos</span>
                </span>
                <span className={`radio ${album.albumId === props.targetAlbumId ? "checked" : ""}`} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sticky-cta-bar">
        <button
          type="button"
          className="btn btn-success btn-send-cta"
          onClick={props.onConfirm}
          disabled={!targetAlbum || !props.picked.length}
        >
          Add {props.picked.length} photo{props.picked.length === 1 ? "" : "s"}
        </button>
      </div>
    </div>
  );
}

function describeAspect(aspect: number) {
  if (aspect < 0.98) return "portrait";
  if (aspect > 1.02) return "landscape";
  return "square";
}
