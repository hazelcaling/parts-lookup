import fs from "node:fs";
import path from "node:path";

// Flatten { series: { model: [parts] } } into rows
export function flattenPartsData(data) {
  const out = [];
  for (const series in data)
    for (const model in data[series])
      for (const p of data[series][model]) out.push({ series, model, ...p });
  return out;
}

// partsData.js is a JS literal (contains NaN), so evaluate instead of JSON.parse
export function readPartsDataJs(file) {
  const src = fs.readFileSync(file, "utf8").replace(/^export const partsData = /, "");
  return new Function(`return (${src.replace(/;\s*$/, "")});`)();
}

export function readLocalData(dir) {
  return {
    partsData: readPartsDataJs(path.join(dir, "partsData.js")),
    partsCatalog: JSON.parse(fs.readFileSync(path.join(dir, "partsCatalog.json"), "utf8")),
  };
}

export function validate(partsData, partsCatalog) {
  if (!partsData || typeof partsData !== "object" || Array.isArray(partsData))
    throw new Error("partsData must be an object");
  if (!Array.isArray(partsCatalog)) throw new Error("partsCatalog must be an array");
}

const num = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

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

// Create tables, truncate, insert, all in one transaction
export async function seedDatabase(pool, partsData, partsCatalog) {
  validate(partsData, partsCatalog);
  const annual = flattenPartsData(partsData);
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
        list_price DOUBLE PRECISION NOT NULL DEFAULT 0, call_out TEXT NOT NULL DEFAULT '',
        section TEXT NOT NULL DEFAULT '', ipl_description TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '');
      CREATE INDEX IF NOT EXISTS catalog_parts_pn_idx ON catalog_parts (part_number);
      TRUNCATE annual_parts, catalog_parts RESTART IDENTITY;`);
    await insertBatched(client, "annual_parts",
      ["series", "model", "pn", "description", "price", "annual", "default_qty"],
      annual.map((p) => [p.series, p.model, String(p.pn ?? ""), String(p.description ?? ""),
        num(p.price), Boolean(p.annual), num(p.defaultQty) ?? 1]));
    await insertBatched(client, "catalog_parts",
      ["series", "model", "part_number", "description", "list_price", "call_out", "section", "ipl_description", "notes"],
      partsCatalog.map((c) => [c.series ?? "", c.model ?? "", c.partNumber ?? "", c.description ?? "",
        num(c.listPrice) ?? 0, c.callOut ?? "", c.section ?? "", c.iplDescription ?? "", c.notes ?? ""]));
    await client.query("COMMIT");
    return { annual: annual.length, catalog: partsCatalog.length };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
