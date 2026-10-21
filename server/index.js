import express from "express";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";
import { seedDatabase } from "./seedLib.js";
import { migrate } from "./migrate.js";
import { apiRouter } from "./routes/api.js";
import { applyLatestRaypakList } from "./raypak.js";

const { APP_PASSWORD, SESSION_SECRET } = process.env;
if (!APP_PASSWORD || !SESSION_SECRET) {
  throw new Error("APP_PASSWORD and SESSION_SECRET must be set");
}
const PORT = process.env.PORT || 3000;
const SESSION_MS = 10 * 60 * 60 * 1000; // auto-logout after 10 hours
const COOKIE = "pl_session";
const isProd = process.env.NODE_ENV === "production";

const app = express();
app.set("trust proxy", 1);
app.use(cookieParser(SESSION_SECRET));

const safeEqual = (a, b) => {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

const isLoggedIn = (req) => {
  const v = req.signedCookies?.[COOKIE];
  if (!v) return false;
  const exp = Number(v);
  // also rejects old 30-day cookies: expiry must be within 10 hours of now
  return Number.isFinite(exp) && exp > Date.now() && exp <= Date.now() + SESSION_MS;
};

const requireAuth = (req, res, next) =>
  isLoggedIn(req) ? next() : res.status(401).json({ error: "unauthorized" });

// Very small brute-force guard: per-IP failed attempts
const fails = new Map();
app.use("/api/admin", express.json({ limit: "50mb" }));
app.use("/api/pricelists", express.json({ limit: "100mb" })); // items + base64 original file (max 25 MB)
app.use(express.json());

const locked = (ip) => {
  const f = fails.get(ip);
  return f && f.n >= 10 && Date.now() - f.t < 15 * 60 * 1000;
};
const recordFail = (ip) => {
  const f = fails.get(ip) || { n: 0, t: 0 };
  fails.set(ip, { n: f.n + 1, t: Date.now() });
};

app.post("/api/login", (req, res) => {
  const ip = req.ip;
  const f = fails.get(ip) || { n: 0, t: 0 };
  if (f.n >= 10 && Date.now() - f.t < 15 * 60 * 1000) {
    return res.status(429).json({ error: "Too many attempts. Try again later." });
  }
  if (!safeEqual(req.body?.password ?? "", APP_PASSWORD)) {
    fails.set(ip, { n: f.n + 1, t: Date.now() });
    return res.status(401).json({ error: "Incorrect password" });
  }
  fails.delete(ip);
  const exp = Date.now() + SESSION_MS;
  res.cookie(COOKIE, String(exp), {
    signed: true,
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: SESSION_MS,
  });
  res.json({ ok: true });
});

app.post("/api/admin/seed", async (req, res) => {
  const ip = req.ip;
  if (locked(ip)) return res.status(429).json({ error: "Too many attempts. Try again later." });
  const m = /^Bearer (.+)$/.exec(req.get("authorization") || "");
  if (!m || !safeEqual(m[1], APP_PASSWORD)) {
    recordFail(ip);
    return res.status(401).json({ error: "unauthorized" });
  }
  fails.delete(ip);
  try {
    const { partsData, partsCatalog } = req.body || {};
    const result = await seedDatabase(pool, partsData, partsCatalog);
    cache = null;
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error("seed failed:", e.message);
    res.status(400).json({ error: e.message });
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

// Public health check: row counts only (no part data)
app.get("/api/health", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT (SELECT count(*) FROM annual_parts)::int AS annual_rows,
              (SELECT count(*) FROM catalog_parts)::int AS catalog_rows,
              (SELECT count(*) FROM catalog_parts WHERE NOT from_price_list)::int AS ipl_rows,
              (SELECT count(*) FROM catalog_parts WHERE NOT from_price_list AND source_url IS NOT NULL)::int AS ipl_rows_with_link,
              (SELECT count(*) FROM catalog_parts WHERE COALESCE(list_price, 0) > 0)::int AS catalog_priced,
              (SELECT count(*) FROM catalog_parts WHERE list_price = 0 AND notes ~* '\\mobsolete\\M')::int AS catalog_obsolete_zero,
              (SELECT count(*) FROM annual_parts WHERE price = 0 AND notes ~* '\\mobsolete\\M')::int AS annual_obsolete_zero,
              (SELECT count(*) FROM price_lists WHERE is_raypak)::int AS raypak_lists,
              (SELECT count(*) FROM price_lists)::int AS price_lists`);
    res.json({ ok: true, rule: "raypak-obsolete-v2", ...rows[0], startup_raypak: startupRaypak });
  } catch (e) {
    res.status(500).json({ ok: false, error: "database error" });
  }
});

app.get("/api/session", (req, res) => res.json({ loggedIn: isLoggedIn(req) }));

// Cache data in memory (data only changes when re-seeded; restart to refresh)
let cache = null;
async function loadData() {
  if (cache) return cache;
  const annual = await pool.query(
    "SELECT series, model, pn, description, price, annual, default_qty, notes FROM annual_parts ORDER BY id"
  );
  const partsData = {};
  for (const r of annual.rows) {
    ((partsData[r.series] ??= {})[r.model] ??= []).push({
      pn: r.pn,
      description: r.description,
      price: r.price,
      annual: r.annual,
      defaultQty: r.default_qty,
      notes: r.notes || "",
    });
  }
  const cat = await pool.query(
    `SELECT series, model, part_number AS "partNumber", description, list_price AS "listPrice",
            call_out AS "callOut", section, ipl_description AS "iplDescription", notes
       FROM catalog_parts ORDER BY id`
  );
  cache = { partsData, partsCatalog: cat.rows };
  return cache;
}

app.get("/api/data", requireAuth, async (req, res) => {
  try {
    res.set("Cache-Control", "private, no-store");
    res.json(await loadData());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "database error" });
  }
});

app.use("/api", requireAuth, apiRouter(pool, { onCatalogChanged: () => { cache = null; } }));
app.use("/api", (req, res) => res.status(404).json({ error: "not found" }));

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
app.use(express.static(dist));
app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(dist, "index.html")));

// Re-apply the newest Raypak price list on boot (idempotent) so rule changes take effect on existing data
let startupRaypak = null;
async function applyRaypakOnBoot() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    startupRaypak = await applyLatestRaypakList(client);
    await client.query("COMMIT");
    cache = null;
    console.log("raypak list re-applied:", JSON.stringify(startupRaypak));
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    startupRaypak = { error: e.message };
    console.error("raypak re-apply failed:", e.message);
  } finally {
    client.release();
  }
}

migrate(pool)
  .then(applyRaypakOnBoot)
  .then(() => app.listen(PORT, () => console.log(`parts-lookup listening on ${PORT}`)))
  .catch((e) => { console.error(e.message); process.exit(1); });
