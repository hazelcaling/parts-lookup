const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const inputFile = path.join(__dirname, "catalog_parts.xlsx");
const outputFile = path.join(__dirname, "src", "data", "partsCatalog.json");

const workbook = XLSX.readFile(inputFile);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

const data = rows.map((row) => ({
  series: String(row["SERIES"] || "").trim(),
  model: String(row["model"] || "").trim().toUpperCase(),
  partNumber: String(row["part number"] || "").trim().toUpperCase(),
  description: String(row["DESCRIPTION"] || "").trim(),
  sellPrice: Number(row["SELL PRICE"] || 0),
  callOut: String(row["call out"] || "").trim().toUpperCase(),
  section: String(row["section"] || "").trim(),
  iplDescription: String(row["IPL DESCRIPTION"] || "").trim(),
  notes: String(row["notes"] || "").trim(),
}));

fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), "utf8");

console.log(`Done. Saved ${data.length} rows to src/data/partsCatalog.json`);