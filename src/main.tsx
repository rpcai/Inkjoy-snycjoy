import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Inkjoy Syncjoy</p>
            <h1>Photo frame sync workspace</h1>
          </div>
          <button type="button">Connect</button>
        </header>

        <div className="grid">
          <section className="panel">
            <h2>Albums</h2>
            <p>Inkjoy album management will start here.</p>
          </section>
          <section className="panel">
            <h2>Google Photos</h2>
            <p>Picker sessions and selected media will appear here.</p>
          </section>
          <section className="panel">
            <h2>Carousels</h2>
            <p>Frame playback strategy controls will live here.</p>
          </section>
        </div>
      </section>
    </main>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing root element");
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

