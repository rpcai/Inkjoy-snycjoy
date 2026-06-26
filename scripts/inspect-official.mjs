import "dotenv/config";
import { config } from "dotenv";
import { firefox } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

config({ path: ".env.official", override: true });

const email = process.env.INKJOY_OFFICIAL_EMAIL;
const password = process.env.INKJOY_OFFICIAL_PASSWORD;
const baseUrl = process.env.INKJOY_OFFICIAL_URL || "https://inkjoy.pages.dev/";
const headless = process.env.INKJOY_OFFICIAL_HEADLESS !== "false";

const outDir = path.resolve("official-inspection", new Date().toISOString().replace(/[:.]/g, "-"));
const events = [];

await mkdir(outDir, { recursive: true });

const browser = await firefox.launch({ headless });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

page.on("request", (request) => {
  const url = request.url();
  if (url.includes("/api/") || url.includes("openapi") || url.includes("epaperframe")) {
    events.push({
      type: "request",
      method: request.method(),
      url,
      postData: redact(request.postData()),
    });
  }
});

page.on("response", async (response) => {
  const url = response.url();
  if (url.includes("/api/") || url.includes("openapi") || url.includes("epaperframe")) {
    events.push({
      type: "response",
      status: response.status(),
      url,
    });
  }
});

async function shot(name) {
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await shot("01-login");

  if (!email || !password) {
    await writeArtifacts();
    console.log(`No credentials found. Wrote unauthenticated artifacts to ${outDir}`);
    process.exit(0);
  }

  await page.locator("#emailInput").fill(email);
  await page.locator("#passwordInput").click();
  await page.locator("#passwordInput").fill(password);
  await page.locator("#loginBtn").click();
  await page.waitForSelector("#app-page", { state: "visible", timeout: 30000 });
  await page.waitForTimeout(2000);
  await shot("02-home");

  for (const view of ["albums", "slideshow", "canvas"]) {
    const nav = page.locator(`#nav-${view}`);
    if (await nav.count()) {
      await nav.click();
      await page.waitForTimeout(1800);
      await shot(`03-${view}`);
    }
  }

  await writeArtifacts();
  console.log(`Wrote authenticated inspection artifacts to ${outDir}`);
} finally {
  await browser.close();
}

async function writeArtifacts() {
  await writeFile(path.join(outDir, "network.json"), JSON.stringify(events, null, 2));
  await writeFile(
    path.join(outDir, "dom.html"),
    await page.content(),
  );
  const storage = await page.evaluate(() => {
    const localEntries = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      const value = localStorage.getItem(key);
      localEntries.push([
        key,
        key.toLowerCase().includes("token") || key.toLowerCase().includes("session")
          ? "[redacted]"
          : value,
      ]);
    }
    return { localStorage: Object.fromEntries(localEntries) };
  }).catch(() => ({}));
  await writeFile(path.join(outDir, "storage.json"), JSON.stringify(storage, null, 2));
}

function redact(value) {
  if (!value) return value;
  return value
    .replaceAll(password || "", "[redacted-password]")
    .replace(/"password"\s*:\s*"[^"]+"/g, '"password":"[redacted]"')
    .replace(/"token"\s*:\s*"[^"]+"/g, '"token":"[redacted]"');
}
