import { serve } from "@hono/node-server";
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { randomUUID } from "node:crypto";
import {
  createGoogleAuthUrl,
  exchangeGoogleCode,
  fetchGoogleMedia,
  googlePickerRequest,
  isGoogleConfigured,
} from "./google";
import { inkjoyRequest, requireInkjoy } from "./inkjoy";
import { readSession, writeSession, type InkjoyRegion } from "./session";

const app = new Hono();

app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    allowHeaders: ["Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: error.message || "Unexpected server error" }, 500);
});

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/session", async (c) => {
  const session = await readSession(c);
  return c.json({
    inkjoy: session.inkjoy
      ? {
          connected: true,
          region: session.inkjoy.region,
          expireAt: session.inkjoy.expireAt,
          uid: session.inkjoy.uid,
        }
      : { connected: false },
    google: session.google
      ? {
          connected: true,
          expiresAt: session.google.expiresAt,
          configured: isGoogleConfigured(),
        }
      : { connected: false, configured: isGoogleConfigured() },
  });
});

app.post("/api/inkjoy/login", async (c) => {
  const body = (await c.req.json()) as {
    email?: string;
    password?: string;
    region?: InkjoyRegion;
  };

  if (!body.email || !body.password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  const region = body.region || "global";
  const result = await inkjoyRequest<{
    token: string;
    uid?: string;
    expireAt?: string;
  }>("/api/v1/auth/login", {}, {
    method: "POST",
    region,
    body: {
      email: body.email,
      password: body.password,
    },
  });

  if (!result.data?.token) {
    return c.json({ error: "Inkjoy login did not return a token" }, 502);
  }

  const session = await readSession(c);
  session.inkjoy = {
    region,
    token: result.data.token,
    uid: result.data.uid,
    expireAt: result.data.expireAt,
  };
  writeSession(c, session);

  return c.json({
    connected: true,
    region,
    uid: result.data.uid,
    expireAt: result.data.expireAt,
  });
});

app.post("/api/inkjoy/logout", async (c) => {
  const session = await readSession(c);
  delete session.inkjoy;
  writeSession(c, session);
  return c.json({ ok: true });
});

app.get("/api/inkjoy/devices", async (c) => {
  const session = await readSession(c);
  requireInkjoy(session);
  const result = await inkjoyRequest("/api/v1/devices", session);
  return c.json(result.data ?? []);
});

app.get("/api/inkjoy/albums", async (c) => {
  const session = await readSession(c);
  requireInkjoy(session);
  const result = await inkjoyRequest("/api/v1/album/list", session, { method: "POST" });
  return c.json(result.data ?? []);
});

app.post("/api/inkjoy/albums", async (c) => {
  const session = await readSession(c);
  requireInkjoy(session);
  const body = (await c.req.json()) as { albumName?: string };
  const result = await inkjoyRequest("/api/v1/album", session, {
    method: "POST",
    body: { albumName: body.albumName },
  });
  return c.json(result.data);
});

app.put("/api/inkjoy/albums/:albumId", async (c) => {
  const session = await readSession(c);
  requireInkjoy(session);
  const body = (await c.req.json()) as { albumName?: string };
  const result = await inkjoyRequest(`/api/v1/album/${c.req.param("albumId")}`, session, {
    method: "PUT",
    body: { albumName: body.albumName },
  });
  return c.json(result.data);
});

app.delete("/api/inkjoy/albums/:albumId", async (c) => {
  const session = await readSession(c);
  requireInkjoy(session);
  const result = await inkjoyRequest(`/api/v1/album/${c.req.param("albumId")}`, session, {
    method: "DELETE",
  });
  return c.json(result.data ?? { ok: true });
});

app.get("/api/inkjoy/albums/:albumId/photos", async (c) => {
  const session = await readSession(c);
  requireInkjoy(session);
  const result = await inkjoyRequest("/api/v1/album/img/list", session, {
    method: "POST",
    body: { albumId: c.req.param("albumId") },
  });
  return c.json(result.data ?? []);
});

app.post("/api/inkjoy/albums/:albumId/photos/delete", async (c) => {
  const session = await readSession(c);
  requireInkjoy(session);
  const body = (await c.req.json()) as { imgIdList?: string[] };
  const result = await inkjoyRequest("/api/v1/album/img/del", session, {
    method: "POST",
    body: {
      albumId: c.req.param("albumId"),
      imgIdList: body.imgIdList || [],
    },
  });
  return c.json(result.data ?? { ok: true });
});

app.get("/api/inkjoy/carousels", async (c) => {
  const session = await readSession(c);
  requireInkjoy(session);
  const deviceId = c.req.query("deviceId");
  const result = await inkjoyRequest("/api/v1/devicePlayStrategy/list", session, {
    method: "POST",
    body: deviceId ? { deviceId } : {},
  });
  return c.json(result.data ?? []);
});

app.post("/api/inkjoy/carousels", async (c) => {
  const session = await readSession(c);
  requireInkjoy(session);
  const result = await inkjoyRequest("/api/v1/devicePlayStrategy", session, {
    method: "POST",
    body: await c.req.json(),
  });
  return c.json(result.data);
});

app.put("/api/inkjoy/carousels/:strategyId", async (c) => {
  const session = await readSession(c);
  requireInkjoy(session);
  const result = await inkjoyRequest(`/api/v1/devicePlayStrategy/${c.req.param("strategyId")}`, session, {
    method: "PUT",
    body: await c.req.json(),
  });
  return c.json(result.data);
});

app.delete("/api/inkjoy/carousels/:strategyId", async (c) => {
  const session = await readSession(c);
  requireInkjoy(session);
  const result = await inkjoyRequest(`/api/v1/devicePlayStrategy/${c.req.param("strategyId")}`, session, {
    method: "DELETE",
  });
  return c.json(result.data ?? { ok: true });
});

app.put("/api/inkjoy/carousels/:strategyId/status/:status", async (c) => {
  const session = await readSession(c);
  requireInkjoy(session);
  const result = await inkjoyRequest(
    `/api/v1/devicePlayStrategy/changeStatus/${c.req.param("strategyId")}/${c.req.param("status")}`,
    session,
    { method: "PUT" },
  );
  return c.json(result.data ?? { ok: true });
});

app.post("/api/inkjoy/carousels/activate-album", async (c) => {
  const session = await readSession(c);
  requireInkjoy(session);
  const body = (await c.req.json()) as {
    deviceId: string;
    albumId: string;
    strategyId?: string;
    timezone?: string;
    playOrder?: "SEQUENTIALLY" | "SHUFFLE";
    updateType?: "FIXED" | "INTERVAL";
    updateDays?: number;
    updateTimeList?: string[];
    beginTime?: string;
    endTime?: string;
    intervalMinutes?: number;
    idle?: 0 | 1;
    playNow?: boolean;
  };

  const listResult = await inkjoyRequest<unknown[]>("/api/v1/devicePlayStrategy/list", session, {
    method: "POST",
    body: { deviceId: body.deviceId },
  });

  const activeAlbumStrategies = (listResult.data || []).filter((strategy) => {
    const item = strategy as { strategyId?: string; status?: string; albumIdList?: string[] };
    return item.status === "ACTIVE" && Array.isArray(item.albumIdList) && item.albumIdList.length > 0;
  });

  for (const strategy of activeAlbumStrategies) {
    const item = strategy as { strategyId?: string };
    if (item.strategyId && item.strategyId !== body.strategyId) {
      await inkjoyRequest(`/api/v1/devicePlayStrategy/changeStatus/${item.strategyId}/INACTIVE`, session, {
        method: "PUT",
      });
    }
  }

  const payload = {
    deviceId: body.deviceId,
    strategyType: "TRIGGER_ON_SERVER",
    updateType: body.updateType || "INTERVAL",
    updateDays: body.updateDays || 1,
    updateTimeList: body.updateTimeList,
    beginTime: body.beginTime || "08:00",
    endTime: body.endTime || "22:00",
    intervalMinutes: body.intervalMinutes || 60,
    playOrder: body.playOrder || "SEQUENTIALLY",
    albumIdList: [body.albumId],
    playNow: body.playNow ?? true,
    idle: body.idle ?? 1,
    timezone: body.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    status: "ACTIVE",
  };

  const result = body.strategyId
    ? await inkjoyRequest(`/api/v1/devicePlayStrategy/${body.strategyId}`, session, {
        method: "PUT",
        body: payload,
      })
    : await inkjoyRequest("/api/v1/devicePlayStrategy", session, {
        method: "POST",
        body: payload,
      });

  return c.json(result.data);
});

app.get("/api/google/oauth/start", async (c) => {
  const session = await readSession(c);
  const state = randomUUID();
  session.googleOauthState = state;
  writeSession(c, session);
  return c.redirect(createGoogleAuthUrl(state));
});

app.get("/api/google/oauth/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const session = await readSession(c);

  if (!code || !state || state !== session.googleOauthState) {
    return c.redirect("/?google=error");
  }

  session.google = await exchangeGoogleCode(code);
  delete session.googleOauthState;
  writeSession(c, session);
  return c.redirect("/?google=connected");
});

app.post("/api/google/logout", async (c) => {
  const session = await readSession(c);
  delete session.google;
  writeSession(c, session);
  return c.json({ ok: true });
});

app.post("/api/google/picker/sessions", async (c) => {
  const session = await readSession(c);
  const result = await googlePickerRequest(session, "/sessions", { method: "POST" });
  return c.json(result);
});

app.get("/api/google/picker/sessions/:sessionId", async (c) => {
  const session = await readSession(c);
  const result = await googlePickerRequest(session, `/sessions/${c.req.param("sessionId")}`);
  return c.json(result);
});

app.delete("/api/google/picker/sessions/:sessionId", async (c) => {
  const session = await readSession(c);
  const result = await googlePickerRequest(session, `/sessions/${c.req.param("sessionId")}`, {
    method: "DELETE",
  });
  return c.json(result);
});

app.get("/api/google/picker/media-items", async (c) => {
  const session = await readSession(c);
  const query = new URLSearchParams();
  query.set("sessionId", c.req.query("sessionId") || "");
  query.set("pageSize", c.req.query("pageSize") || "50");

  if (c.req.query("pageToken")) {
    query.set("pageToken", c.req.query("pageToken") || "");
  }

  const result = await googlePickerRequest(session, `/mediaItems?${query.toString()}`);
  return c.json(result);
});

app.post("/api/import/google-to-inkjoy", async (c) => {
  const session = await readSession(c);
  requireInkjoy(session);
  const body = (await c.req.json()) as {
    albumId?: string;
    items?: Array<{
      id: string;
      filename?: string;
      mimeType?: string;
      baseUrl: string;
    }>;
  };

  if (!body.albumId) {
    return c.json({ error: "Target album is required" }, 400);
  }

  const importableItems = (body.items || []).filter((item) =>
    ["image/jpeg", "image/png"].includes(item.mimeType || ""),
  );

  const results = [];

  for (const item of importableItems) {
    try {
      const mediaResponse = await fetchGoogleMedia(session, item.baseUrl);

      if (!mediaResponse.ok) {
        throw new Error(`Google media fetch failed with ${mediaResponse.status}`);
      }

      const blob = await mediaResponse.blob();
      const form = new FormData();
      form.set("albumId", body.albumId);
      form.set("file", blob, item.filename || `${item.id}.${item.mimeType === "image/png" ? "png" : "jpg"}`);

      await inkjoyRequest("/api/v1/album/img", session, {
        method: "POST",
        body: form,
      });

      results.push({ id: item.id, status: "imported" });
    } catch (error) {
      results.push({
        id: item.id,
        status: "failed",
        error: error instanceof Error ? error.message : "Import failed",
      });
    }
  }

  return c.json({
    imported: results.filter((item) => item.status === "imported").length,
    skipped: (body.items || []).length - importableItems.length,
    results,
  });
});

const port = Number(process.env.PORT || 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Syncjoy API listening on http://127.0.0.1:${info.port}`);
});
