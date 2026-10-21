// Shared price list parsing (used by the Vendor Price Lists page and scripts/import-pricelist.js)

// Upload columns. Required: Part Number, Description, List Price. The rest are optional.
export const FIELDS = [
  ["part_number", "Part Number *"], ["description", "Description *"], ["list_price", "List Price *"],
  ["series", "Series"], ["model", "Model"], ["category", "Category"],
  ["annual_kit", "Annual Kit (Y/N)"], ["qty", "Qty"],
];
export const REQUIRED_FIELDS = [["part_number", "Part Number"], ["description", "Description"], ["list_price", "List Price"]];

const GUESS = {
  // "Part Number", "PART #", "Item Number", "Item No.", "Raypak Part No", "Catalog #", "PN", "SKU" ...
  part_number: /^([a-z]+ )?(part|item|catalog|stock|product)[ _]?(no\.?|num\.?|number|#)?$|^(pn|p\/n|p\/n #|sku)$/i,
  description: /^(desc|description|item description|part description)$/i,
  list_price: /(list|price|cost|msrp)/i,
  category: /^(category|cat|group|class)/i,
  series: /^series/i, model: /^models?$/i,
  annual_kit: /annual/i, qty: /^(qty|quantity|default qty)\b/i,
};

export function guessMapping(headers) {
  const map = {};
  for (const [f] of FIELDS) {
    const i = headers.findIndex((h, idx) => GUESS[f].test(String(h).trim()) && !Object.values(map).includes(idx));
    map[f] = i >= 0 ? i : -1;
  }
  return map;
}

const filled = (r) => r.filter((c) => String(c ?? "").trim() !== "").length;

// Read one worksheet into a sheet object {name, all, headerRow, headers, rows, mapping}
export function readSheet(XLSX, ws, name) {
  const all = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
  let headerRow = 0;
  all.slice(0, 20).forEach((r, i) => { if (filled(r) > filled(all[headerRow] || [])) headerRow = i; });
  return withHeaderRow({ name, all }, headerRow);
}

export function withHeaderRow(sheet, headerRow) {
  const { all } = sheet;
  const hdr = all[headerRow] || [];
  // ignore trailing empty columns
  const width = Math.max(0, ...all.map((r) => { let w = r.length; while (w > 0 && String(r[w - 1] ?? "").trim() === "") w--; return w; }));
  const headers = Array.from({ length: width }, (_, i) => String(hdr[i] ?? "").trim() || `Column ${i + 1}`);
  const rows = all.slice(headerRow + 1).filter((r) => filled(r) > 0);
  return { ...sheet, headerRow, headers, rows, mapping: guessMapping(headers) };
}

// "ES STD BOILER PN & LIST PRICE" -> "ES STD", "EWX EWX BOILER & LIST PRICE" -> "EWX", "SSB PARTS LIST" -> "SSB"
export function cleanSheetName(name) {
  let s = String(name).trim().replace(/\s+/g, " ");
  s = s.replace(/\s*\b(BOILERS?|BLR)\b.*$/i, "").replace(/\s*\bPARTS? LIST\b.*$/i, "")
       .replace(/\s*\b(PN\s*)?&?\s*LIST PRICE\b.*$/i, "").trim();
  const words = s.split(" ");
  const dedup = words.filter((w, i) => i === 0 || w.toUpperCase() !== words[i - 1].toUpperCase());
  return dedup.join(" ") || String(name).trim();
}

export function sheetItems(sheet, { series, category } = {}) {
  return sheet.rows.map((r) => {
    const o = {};
    for (const [f] of FIELDS) o[f] = sheet.mapping[f] >= 0 ? String(r[sheet.mapping[f]] ?? "").trim() : "";
    if (series && !o.series) o.series = series;
    if (category && !o.category) o.category = category;
    o.raw = { ...Object.fromEntries(sheet.headers.map((h, i) => [h, r[i] ?? ""])), _sheet: sheet.name };
    return o;
  });
}

const priceOf = (v) => {
  const n = Number(String(v ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n : null;
};
export const normPn = (pn) => String(pn ?? "").trim().toUpperCase();

// Keep one row per part number: the higher list price wins; on a tie the first row is kept.
export function dedupeByPartNumber(items) {
  const best = new Map();
  const removed = [];
  items.forEach((it, idx) => {
    const pn = normPn(it.part_number);
    if (!pn) return;
    const cur = best.get(pn);
    if (!cur) { best.set(pn, { it, idx }); return; }
    const a = priceOf(cur.it.list_price) ?? -Infinity, b = priceOf(it.list_price) ?? -Infinity;
    if (b > a) {
      removed.push({ pn, kept: it, dropped: cur.it, tie: false });
      best.set(pn, { it, idx: cur.idx });
    } else {
      removed.push({ pn, kept: cur.it, dropped: it, tie: a === b });
    }
  });
  const keep = new Set([...best.values()].map((v) => v.it));
  const ties = removed.filter((d) => d.tie).length;
  return {
    items: items.filter((it) => !normPn(it.part_number) || keep.has(it)),
    removed, ties,
  };
}

export function guessSheetCategory(name) {
  if (/\bPARTS?\b/i.test(name)) return "Parts";
  if (/\b(BOILERS?|BLR)\b/i.test(name)) return "Boilers";
  return "";
}

// "Sussman.xlsx" -> "Sussman", "sussman-pricelist.xlsx" -> "Sussman", "Acme_Price_List_2026-01.xlsx" -> "Acme 2026-01"
export function vendorFromFileName(fileName) {
  const base = String(fileName ?? "").replace(/^.*[\\/]/, "").replace(/\.(xlsx|xls|csv)$/i, "").trim();
  let s = base.replace(/(?<![a-z])(price[\s_-]*lists?|price[\s_-]*sheets?|list[\s_-]*prices?|prices?)(?![a-z])/gi, " ");
  s = s.replace(/_+/g, " ").replace(/\s*-\s*(?=\s|$)/g, " ").replace(/(^|\s)-\s*/g, " ").replace(/\s+/g, " ").trim();
  if (!s) s = base.replace(/_+/g, " ").trim();
  if (s === s.toLowerCase()) s = s.replace(/(^|\s)([a-z])/g, (m, a, b) => a + b.toUpperCase());
  return s;
}

// Raypak price list (updates the Raypak catalog prices): detected from the file / vendor name
export const isRaypakName = (...names) => names.some((n) => /raypak/i.test(String(n ?? "")));
