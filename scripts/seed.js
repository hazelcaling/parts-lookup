// Usage: DATABASE_URL=... node scripts/seed.js [--from-xlsx]
// Default source: the JSON files the app used (src/data/partsData.js, src/data/partsCatalog.json).
// --from-xlsx: build from annualparts.xlsx + catalog_parts.xlsx (same logic as convert scripts).
import fs from "node:fs";
import XLSX from "xlsx";
import { pool } from "../server/db.js";

const fromXlsx = process.argv.includes("--from-xlsx");

function loadAnnual() {
  if (fromXlsx) {
    const wb = XLSX.readFile("annualparts.xlsx");
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    return rows.map((r) => ({
      series: String(r["SERIES"]), model: String(r["MODEL"]), pn: String(r["PN"]),
      description: String(r["DESCRIPTION"]),
      price: Number(r["list price"] ?? r["SELL PRICE"] ?? 0),
      annual: Boolean(r["ANNUAL"]), defaultQty: Number(r["DEFAULT QTY"]),
    }));
  }
  const src = fs.readFileSync("src/data/partsData.js", "utf8").replace(/^export const partsData = /, "");
  // partsData.js is a JS literal (contains NaN), so evaluate it rather than JSON.parse
  const data = new Function(`return (${src.replace(/;\s*$/, "")});`)();
  const out = [];
  for (const series in data)
    for (const model in data[series])
      for (const p of data[series][model]) out.push({ series, model, ...p });
  return out;
}

function loadCatalog() {
  if (fromXlsx) {
    const wb = XLSX.readFile("catalog_parts.xlsx");
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    return rows.map((row) => ({
      series: String(row["SERIES"] || "").trim(),
      model: String(row["model"] || "").trim().toUpperCase(),
      partNumber: String(row["part number"] || "").trim().toUpperCase(),
      description: String(row["DESCRIPTION"] || "").trim(),
      listPrice: Number(row["list price"] || row["SELL PRICE"] || 0),
      callOut: String(row["call out"] || "").trim().toUpperCase(),
      section: String(row["section"] || "").trim(),
      iplDescription: String(row["IPL DESCRIPTION"] || "").trim(),
      notes: String(row["notes"] || "").trim(),
    }));
  }
  return JSON.parse(fs.readFileSync("src/data/partsCatalog.json", "utf8"));
}

async function insertBatched(client, table, cols, rows) {
  const size = 1000;
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    const vals = [];
    const ph = chunk.map((r, j) =>
      "(" + r.map((v, k) => { vals.push(v); return `$${j * r.length + k + 1}`; }).join(",") + ")"
    );
    await client.query(`INSERT INTO ${table} (${cols.join(",")}) VALUES ${ph.join(",")}`, vals);
  }
}

const annual = loadAnnual();
const catalog = loadCatalog();
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(`
    CREATE TABLE IF NOT EXISTS annual_parts (
      id SERIAL PRIMARY KEY, series TEXT NOT NULL, model TEXT NOT NULL, pn TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '', price DOUBLE PRECISION,
      annual BOOLEAN NOT NULL DEFAULT true, default_qty DOUBLE PRECISION NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS catalog_parts (
      id SERIAL PRIMARY KEY, series TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '',
      part_number TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
      list_price DOUBLE PRECISION, call_out TEXT NOT NULL DEFAULT '',
      section TEXT NOT NULL DEFAULT '', ipl_description TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '');
    CREATE INDEX IF NOT EXISTS catalog_parts_pn_idx ON catalog_parts (part_number);
    TRUNCATE annual_parts, catalog_parts RESTART IDENTITY;`);
  await insertBatched(client, "annual_parts",
    ["series", "model", "pn", "description", "price", "annual", "default_qty"],
    annual.map((p) => [p.series, p.model, p.pn, p.description, Number.isFinite(p.price) ? p.price : null, p.annual, p.defaultQty]));
  await insertBatched(client, "catalog_parts",
    ["series", "model", "part_number", "description", "list_price", "call_out", "section", "ipl_description", "notes"],
    catalog.map((c) => [c.series, c.model, c.partNumber, c.description, c.listPrice, c.callOut, c.section, c.iplDescription, c.notes]));
  await client.query("COMMIT");
  console.log(`Seeded ${annual.length} annual parts, ${catalog.length} catalog parts`);
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
  await pool.end();
}
