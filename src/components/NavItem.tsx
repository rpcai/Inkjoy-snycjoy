import type React from "react";
import type { View } from "../types";

export function NavItem(props: {
  view: View;
  current: View;
  icon: React.ReactNode;
  label: string;
  onSelect: (view: View) => void;
}) {
  return (
    <button
      type="button"
      className={`nav-item ${props.current === props.view ? "active" : ""}`}
      onClick={() => props.onSelect(props.view)}
    >
      <span className="nav-icon">{props.icon}</span>
      <span className="nav-label">{props.label}</span>
    </button>
  );
}
