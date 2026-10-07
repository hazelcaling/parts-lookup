// Import a (multi-sheet) price list workbook through the API, same logic as the Vendor Price Lists page.
// Usage: BASE_URL=http://localhost:5173 APP_PASSWORD=... node scripts/import-pricelist.js <file.xlsx>
//        [--vendor NAME (default: from the file name)] [--manufacturer NAME] [--name "List name"] [--effective YYYY-MM-DD]
//        [--no-sheet-series] [--no-dedupe] [--report report.json]
//        [--raypak | --not-raypak]  (default: Raypak when the file/vendor name contains "raypak";
//                                    a Raypak list replaces all Raypak prices in the catalog)
import fs from "node:fs";
import * as XLSX from "xlsx";
import { readSheet, cleanSheetName, sheetItems, dedupeByPartNumber, vendorFromFileName, isRaypakName } from "../src/utils/priceListParse.js";

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const file = args[0];
const { BASE_URL, APP_PASSWORD } = process.env;
if (!file || !BASE_URL || !APP_PASSWORD) { console.error("usage: see header"); process.exit(1); }

const bytes = fs.readFileSync(file);
const wb = XLSX.read(bytes, { type: "buffer" });
const sheetSeries = !args.includes("--no-sheet-series");
const sheets = wb.SheetNames.map((n) => ({ ...readSheet(XLSX, wb.Sheets[n], n), series: cleanSheetName(n), category: "" }));
let all = [];
for (const s of sheets) {
  if (s.mapping.part_number < 0) { console.log(`sheet "${s.name}": no part number column found, skipped`); continue; }
  const items = sheetItems(s, { series: sheetSeries ? s.series : "", category: s.category }).filter((r) => r.part_number);
  console.log(`sheet "${s.name}" -> series "${s.series}", category "${s.category}": ${items.length} rows`);
  all.push(...items);
}
const total = all.length;
let dd = { removed: [], ties: 0 };
if (!args.includes("--no-dedupe")) { dd = dedupeByPartNumber(all); all = dd.items; }
console.log(`${total} rows, ${dd.removed.length} duplicate part numbers removed (${dd.ties} ties kept first) -> ${all.length} rows`);
if (opt("--report")) fs.writeFileSync(opt("--report"), JSON.stringify(dd.removed.map((d) => ({
  pn: d.pn, kept_price: d.kept.list_price, kept_sheet: d.kept.raw._sheet, removed_price: d.dropped.list_price, removed_sheet: d.dropped.raw._sheet, tie: d.tie,
})), null, 1));

const login = await fetch(new URL("/api/login", BASE_URL), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: APP_PASSWORD }) });
if (!login.ok) { console.error("login failed", login.status); process.exit(1); }
const cookie = login.headers.get("set-cookie").split(";")[0];
const fileName = file.split("/").pop();
const vendor = opt("--vendor") ?? vendorFromFileName(fileName);
const isRaypak = args.includes("--raypak") || (!args.includes("--not-raypak") && isRaypakName(fileName, vendor));
const res = await fetch(new URL("/api/pricelists", BASE_URL), {
  method: "POST", headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({
    name: opt("--name") || `${vendor} Price List`,
    vendor, manufacturer: opt("--manufacturer") || "", effective_date: opt("--effective") || "",
    file_name: fileName, file_base64: bytes.toString("base64"), is_raypak: isRaypak, dedupe: !args.includes("--no-dedupe"), items: all,
  }),
});
console.log(res.status, await res.text());
if (!res.ok) process.exit(1);
