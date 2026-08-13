import { Monitor } from "lucide-react";
import { api } from "../lib/api";
import type { Device } from "../types";

export function DeviceGrid(props: {
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
          {device.lastPlayThumbnailUrl ? (
            <img src={api.devicePreviewUrl(device.lastPlayThumbnailUrl)} alt="" />
          ) : (
            <Monitor size={34} />
          )}
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
