// Upload local data to a running server's /api/admin/seed.
// Usage: BASE_URL=https://... APP_PASSWORD=... node scripts/upload-seed.js [dataDir]
// dataDir defaults to /workspace/parts-lookup-data-backup if it exists, else src/data.
import fs from "node:fs";
import { readLocalData } from "../server/seedLib.js";

const { BASE_URL, APP_PASSWORD } = process.env;
if (!BASE_URL || !APP_PASSWORD) {
  console.error("Set BASE_URL and APP_PASSWORD");
  process.exit(1);
}
const dir = process.argv[2] ||
  (fs.existsSync("/workspace/parts-lookup-data-backup/partsData.js") ? "/workspace/parts-lookup-data-backup" : "src/data");
const { partsData, partsCatalog } = readLocalData(dir);
// JSON can't carry NaN; it becomes null (stored as NULL, shown as before)
const body = JSON.stringify({ partsData, partsCatalog });
console.log(`Uploading from ${dir} (${(body.length / 1e6).toFixed(1)} MB) to ${BASE_URL}`);
const res = await fetch(new URL("/api/admin/seed", BASE_URL), {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${APP_PASSWORD}` },
  body,
});
const text = await res.text();
console.log(res.status, text);
if (!res.ok) process.exit(1);
