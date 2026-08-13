import { useState } from "react";
import { Send, X } from "lucide-react";
import type { AlbumPhoto, Device } from "../types";
import { useImageRotation } from "../lib/useImageRotation";

export function PhotoViewer(props: {
  photo: AlbumPhoto;
  devices: Device[];
  onSendToFrame: (deviceId: string) => void;
  onClose: () => void;
}) {
  const src = props.photo.thumbnailUrl || props.photo.originUrl;
  const rotation = useImageRotation(props.photo.originUrl);
  const rotatedSideways = rotation === 90 || rotation === 270;
  const [pickingFrame, setPickingFrame] = useState(false);

  function handleSendClick() {
    if (props.devices.length === 1) {
      props.onSendToFrame(props.devices[0].deviceId);
      return;
    }
    setPickingFrame(true);
  }

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
            style={
              rotation
                ? {
                    transform: `rotate(${rotation}deg)`,
                    // 90/270 swap the image's visual axes, so swap the fit constraints too or a
                    // landscape-shaped source would overflow the (now portrait-shaped) stage.
                    maxWidth: rotatedSideways ? "82vh" : undefined,
                    maxHeight: rotatedSideways ? "92vw" : undefined,
                  }
                : undefined
            }
          />
        ) : null}
      </div>

      {props.devices.length ? (
        pickingFrame ? (
          <div className="photo-viewer-frame-picker" onClick={(event) => event.stopPropagation()}>
            <span className="photo-viewer-frame-picker-label">Send to which frame?</span>
            {props.devices.map((device) => (
              <button
                type="button"
                key={device.deviceId}
                className="photo-viewer-frame-row"
                onClick={() => props.onSendToFrame(device.deviceId)}
              >
                {device.deviceName || "Frame"}
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-primary photo-viewer-send"
            onClick={(event) => {
              event.stopPropagation();
              handleSendClick();
            }}
          >
            <Send size={15} />
            Send to frame
          </button>
        )
      ) : null}
    </div>
  );
}
