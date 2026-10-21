import { migrate } from "./migrate.js";
import { applyLatestRaypakList } from "./raypak.js";
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
  // "N/A" part numbers in an IPL mean "not used on this model": never store them
  partsCatalog = partsCatalog.filter((c) => c.partNumber && !/^N\/?A$/i.test(String(c.partNumber).trim()));
  await migrate(pool);
  const annual = flattenPartsData(partsData);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Only the two parts tables are replaced; companies/quotes/price lists are untouched.
    // Keep notes that users edited inline (matched by series/model/part number/call out)
    const kept = (await client.query(
      `SELECT series, model, part_number, call_out, notes, notes_edited_at FROM catalog_parts WHERE notes_edited_at IS NOT NULL`
    )).rows;
    const keptAnnual = (await client.query(
      `SELECT series, model, pn, notes, notes_edited_at FROM annual_parts WHERE notes_edited_at IS NOT NULL`
    )).rows;
    await client.query(`TRUNCATE annual_parts, catalog_parts RESTART IDENTITY;`);
    await insertBatched(client, "annual_parts",
      ["series", "model", "pn", "description", "price", "annual", "default_qty"],
      annual.map((p) => [p.series, p.model, String(p.pn ?? ""), String(p.description ?? ""),
        num(p.price), Boolean(p.annual), num(p.defaultQty) ?? 1]));
    await insertBatched(client, "catalog_parts",
      ["series", "model", "part_number", "description", "list_price", "call_out", "section", "ipl_description", "notes", "source_url", "price_source", "ipl_qty", "desc_note", "is_option", "option_group", "parent_call_out", "include_note"],
      partsCatalog.map((c) => [c.series ?? "", c.model ?? "", c.partNumber ?? "", c.description ?? "",
        num(c.listPrice), c.callOut ?? "", c.section ?? "", c.iplDescription ?? "", c.notes ?? "", c.sourceUrl || null, c.priceSource || null, c.iplQty || null,
        c.descNote ?? "", !!c.isOption, c.optionGroup || null, c.parentCallOut || null, c.includeNote ?? ""]));
    for (const k of kept) {
      await client.query(
        `UPDATE catalog_parts SET notes=$5, notes_edited_at=$6
          WHERE series=$1 AND model=$2 AND part_number=$3 AND call_out=$4`,
        [k.series, k.model, k.part_number, k.call_out, k.notes, k.notes_edited_at]);
    }
    for (const k of keptAnnual) {
      await client.query(
        `UPDATE annual_parts SET notes=$4, notes_edited_at=$5 WHERE series=$1 AND model=$2 AND pn=$3`,
        [k.series, k.model, k.pn, k.notes, k.notes_edited_at]);
    }
    // Raypak prices come from the newest uploaded Raypak price list (if any), not from the seed data
    // (after restoring edited notes so the "Obsolete" note is kept)
    const raypak = await applyLatestRaypakList(client);
    await client.query("COMMIT");
    return { notesKept: kept.length, annualNotesKept: keptAnnual.length, annual: annual.length, catalog: partsCatalog.length, raypak };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
