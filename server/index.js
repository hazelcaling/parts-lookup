import express from "express";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";

const { APP_PASSWORD, SESSION_SECRET } = process.env;
if (!APP_PASSWORD || !SESSION_SECRET) {
  throw new Error("APP_PASSWORD and SESSION_SECRET must be set");
}
const PORT = process.env.PORT || 3000;
const SESSION_DAYS = 30;
const COOKIE = "pl_session";
const isProd = process.env.NODE_ENV === "production";

const app = express();
app.set("trust proxy", 1);
app.use(express.json());
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
  return Number.isFinite(exp) && exp > Date.now();
};

const requireAuth = (req, res, next) =>
  isLoggedIn(req) ? next() : res.status(401).json({ error: "unauthorized" });

// Very small brute-force guard: per-IP failed attempts
const fails = new Map();
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
  const exp = Date.now() + SESSION_DAYS * 86400000;
  res.cookie(COOKIE, String(exp), {
    signed: true,
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: SESSION_DAYS * 86400000,
  });
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

app.get("/api/session", (req, res) => res.json({ loggedIn: isLoggedIn(req) }));

// Cache data in memory (data only changes when re-seeded; restart to refresh)
let cache = null;
async function loadData() {
  if (cache) return cache;
  const annual = await pool.query(
    "SELECT series, model, pn, description, price, annual, default_qty FROM annual_parts ORDER BY id"
  );
  const partsData = {};
  for (const r of annual.rows) {
    ((partsData[r.series] ??= {})[r.model] ??= []).push({
      pn: r.pn,
      description: r.description,
      price: r.price,
      annual: r.annual,
      defaultQty: r.default_qty,
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

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
app.use(express.static(dist));
app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(dist, "index.html")));

app.listen(PORT, () => console.log(`parts-lookup listening on ${PORT}`));
