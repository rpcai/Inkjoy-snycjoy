import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Renders the existing CSS-drawn Syncjoy mark (src/styles.css .syncjoy-mark) at
// large sizes to produce PWA manifest icons, so the app icon stays a single
// source of truth with the in-app logo rather than a separately maintained asset.

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const stylesPath = `${rootDir}src/styles.css`;
const styles = readFileSync(stylesPath, "utf8");

const MARK_HTML = `
  <span class="syncjoy-mark" aria-hidden="true">
    <span class="syncjoy-frame">
      <span class="syncjoy-ink-line"></span>
      <span class="syncjoy-ink-line short"></span>
    </span>
    <span class="syncjoy-photo-petal blue"></span>
    <span class="syncjoy-photo-petal red"></span>
    <span class="syncjoy-photo-petal yellow"></span>
    <span class="syncjoy-photo-petal green"></span>
  </span>
`;

function fixtureHtml({ size, background, scale, safeZoneRatio }) {
  const markBox = size * safeZoneRatio;
  const factor = markBox / 48; // .syncjoy-mark is authored at 48x48
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>${styles}</style>
    <style>
      html, body { margin: 0; padding: 0; }
      body {
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${background};
      }
      .syncjoy-mark { transform: scale(${factor * scale}); }
    </style>
  </head>
  <body>${MARK_HTML}</body>
</html>`;
}

const targets = [
  { file: "icon-192.png", size: 192, background: "#f7f5f2", scale: 1, safeZoneRatio: 0.72 },
  { file: "icon-512.png", size: 512, background: "#f7f5f2", scale: 1, safeZoneRatio: 0.72 },
  { file: "icon-maskable-192.png", size: 192, background: "#2d5a4a", scale: 1, safeZoneRatio: 0.55 },
  { file: "icon-maskable-512.png", size: 512, background: "#2d5a4a", scale: 1, safeZoneRatio: 0.55 },
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const target of targets) {
  await page.setViewportSize({ width: target.size, height: target.size });
  await page.setContent(fixtureHtml(target));
  await page.screenshot({ path: `${rootDir}public/icons/${target.file}` });
  console.log(`wrote public/icons/${target.file}`);
}

await browser.close();
