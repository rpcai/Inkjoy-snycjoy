import { Images, Monitor } from "lucide-react";
import type { View } from "../types";

export function BottomTabBar(props: { current: View; onSelect: (view: "home" | "albums") => void }) {
  return (
    <nav className="bottom-tab-bar">
      <button
        type="button"
        className={`bottom-tab-item ${props.current === "home" ? "active" : ""}`}
        onClick={() => props.onSelect("home")}
      >
        <Monitor size={20} />
        Frames
      </button>
      <span className="bottom-tab-fab-spacer" />
      <button
        type="button"
        className={`bottom-tab-item ${props.current === "albums" ? "active" : ""}`}
        onClick={() => props.onSelect("albums")}
      >
        <Images size={20} />
        Albums
      </button>
    </nav>
  );
}
