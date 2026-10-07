// Add parsed Raypak IPL rows to the catalog (repeatable / idempotent per series).
// 1) python3 scripts/raypak/build_ipl_import.py <dataDir>/partsCatalog.json <pdfDir> rows.json report.json
// 2) DATABASE_URL=... node scripts/raypak/import-ipl.js rows.json [dataDir ...]
// Updates partsCatalog.json in each data dir (so re-seed keeps the rows) and the database.
import fs from "node:fs";
import path from "node:path";
import { pool } from "../../server/db.js";
import { migrate } from "../../server/migrate.js";
import { applyLatestRaypakList } from "../../server/raypak.js";

const [rowsFile, ...dirs] = process.argv.slice(2);
if (!rowsFile) { console.error("usage: import-ipl.js rows.json [dataDir ...]"); process.exit(1); }
const rows = JSON.parse(fs.readFileSync(rowsFile, "utf8")).filter((r) => r.partNumber && !/^N\/?A$/i.test(r.partNumber)).map((r) => ({
  series: r.series, model: r.model, partNumber: r.partNumber, description: r.description,
  listPrice: r.listPrice ?? null, callOut: r.callOut || "", section: r.section || "",
  iplDescription: r.iplDescription || "", notes: "",
  sourceUrl: r.sourceUrl || "", priceSource: r.priceSource || "", iplQty: r.iplQty || "",
  descNote: r.descNote || "", isOption: !!r.isOption, optionGroup: r.optionGroup || "",
  parentCallOut: r.parentCallOut || "", includeNote: r.includeNote || "",
}));
const seriesSet = new Set(rows.map((r) => r.series));

for (const dir of dirs.length ? dirs : ["/workspace/parts-lookup-data-backup"]) {
  const f = path.join(dir, "partsCatalog.json");
  if (!fs.existsSync(f)) continue;
  // replace every previously imported IPL row (they carry sourceUrl) plus any same-named series
  const cur = JSON.parse(fs.readFileSync(f, "utf8")).filter((r) => !r.sourceUrl && !seriesSet.has(r.series));
  fs.writeFileSync(f, JSON.stringify([...cur, ...rows], null, 2));
  console.log(`${f}: ${cur.length} existing + ${rows.length} IPL rows`);
}

if (process.env.DATABASE_URL) {
  await migrate(pool);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM catalog_parts WHERE source_url IS NOT NULL OR series = ANY($1)", [[...seriesSet]]);
    const cols = ["series", "model", "part_number", "description", "list_price", "call_out", "section", "ipl_description", "notes", "source_url", "price_source", "ipl_qty", "desc_note", "is_option", "option_group", "parent_call_out", "include_note"];
    for (let i = 0; i < rows.length; i += 1000) {
      const chunk = rows.slice(i, i + 1000);
      const vals = [];
      const ph = chunk.map((r, j) => {
        const v = [r.series, r.model, r.partNumber, r.description, r.listPrice, r.callOut, r.section, r.iplDescription, r.notes, r.sourceUrl || null, r.priceSource || null, r.iplQty || null, r.descNote, r.isOption, r.optionGroup || null, r.parentCallOut || null, r.includeNote || ""];
        vals.push(...v);
        return "(" + v.map((_, k) => `$${j * v.length + k + 1}`).join(",") + ")";
      });
      await client.query(`INSERT INTO catalog_parts (${cols.join(",")}) VALUES ${ph.join(",")}`, vals);
    }
    await client.query("UPDATE catalog_parts SET manufacturer='Raypak', vendor='Raypak' WHERE series = ANY($1)", [[...seriesSet]]);
    // prices come from the newest uploaded Raypak price list (if any), not the borrowed IPL prices
    const raypak = await applyLatestRaypakList(client);
    if (raypak) console.log("Raypak price list re-applied:", raypak);
    await client.query("COMMIT");
    console.log(`database: ${rows.length} rows in ${seriesSet.size} series (restart the server to refresh its cache)`);
  } catch (e) { await client.query("ROLLBACK"); throw e; }
  finally { client.release(); await pool.end(); }
}
