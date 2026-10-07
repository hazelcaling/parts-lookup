// Usage: DATABASE_URL=... node scripts/seed.js [--from-xlsx]
// Default source: the JSON files the app used (src/data/partsData.js, src/data/partsCatalog.json).
// --from-xlsx: build from annualparts.xlsx + catalog_parts.xlsx (same logic as convert scripts).
import fs from "node:fs";
import XLSX from "xlsx";
import { pool } from "../server/db.js";
import { seedDatabase, readPartsDataJs, flattenPartsData } from "../server/seedLib.js";

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
  return flattenPartsData(readPartsDataJs("src/data/partsData.js"));
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

const annual = loadAnnual();
const catalog = loadCatalog();
try {
  // seedDatabase expects nested partsData; rebuild it from rows
  const partsData = {};
  for (const p of annual) {
    const { series, model, ...rest } = p;
    ((partsData[series] ??= {})[model] ??= []).push(rest);
  }
  const r = await seedDatabase(pool, partsData, catalog);
  console.log(`Seeded ${r.annual} annual parts, ${r.catalog} catalog parts`);
} finally {
  await pool.end();
}
