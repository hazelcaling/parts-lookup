import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { inputStyle, btn } from "../components/styles";

const FIELDS = [
  ["part_number", "Part Number *"], ["description", "Description"], ["list_price", "List Price"],
  ["vendor", "Vendor"], ["manufacturer", "Manufacturer"], ["category", "Category"],
  ["weight_lbs", "Weight (lbs)"], ["freight_usd", "Freight ($)"], ["notes", "Notes"],
  ["obsolete", "Obsolete (Y/N)"], ["replacement_pn", "Replacement PN"], ["series", "Series"], ["model", "Model"],
];
// header text patterns used to guess the mapping
const GUESS = {
  part_number: /^(part ?(no|num|number|#)?|pn|p\/n|item ?(no|number|#)?|sku|catalog ?(no|number))$/i,
  description: /^(desc|description|item description|part description)$/i,
  list_price: /(list|price|cost|msrp)/i,
  vendor: /^vendor/i, manufacturer: /^(manufacturer|mfr|mfg|brand)/i, category: /^(category|cat|group|class)/i,
  weight_lbs: /weight|wt|lbs/i, freight_usd: /freight|shipping/i, notes: /^(notes?|comments?|remarks?)$/i,
  obsolete: /obsolete|discontinued/i, replacement_pn: /replace|superseded|supersede/i,
  series: /^series/i, model: /^models?$/i,
};

const box = { background: "#fff", border: "1px solid #ddd", borderRadius: "10px", padding: "18px", boxSizing: "border-box" };
const th = { padding: "8px", background: "#f3f3f3", textAlign: "left", whiteSpace: "nowrap" };
const td = { padding: "6px 8px", borderTop: "1px solid #e2e8f0", fontSize: "13px" };

function guessMapping(headers) {
  const map = {};
  for (const [f] of FIELDS) {
    const i = headers.findIndex((h, idx) => GUESS[f].test(String(h).trim()) && !Object.values(map).includes(idx));
    map[f] = i >= 0 ? i : -1;
  }
  return map;
}

export default function PriceLists() {
  const [lists, setLists] = useState([]);
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState(null); // {name, headers, rows}
  const [mapping, setMapping] = useState({});
  const [meta, setMeta] = useState({ name: "", vendor: "", manufacturer: "", effective_date: "", update_catalog: false });
  const [status, setStatus] = useState({ msg: "", err: false });
  const [busy, setBusy] = useState(false);

  const refresh = () => api("/pricelists").then(setLists).catch((e) => setStatus({ msg: e.message, err: true }));
  useEffect(() => { refresh(); }, []);

  const readFile = async (f) => {
    setStatus({ msg: "", err: false });
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) return setStatus({ msg: "Please choose an .xlsx, .xls or .csv file.", err: true });
    if (f.size > 25 * 1024 * 1024) return setStatus({ msg: "File is too large (max 25 MB).", err: true });
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const all = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
      if (!all.some((r) => r.some((c) => String(c).trim() !== ""))) throw new Error("The file is empty.");
      // Guess the header row: the row (among the first 20) with the most filled cells
      const filled = (r) => r.filter((c) => String(c).trim() !== "").length;
      let headerRow = 0;
      all.slice(0, 20).forEach((r, i) => { if (filled(r) > filled(all[headerRow])) headerRow = i; });
      applyHeaderRow(f.name, all, headerRow);
      setMeta((m) => ({ ...m, name: f.name.replace(/\.(xlsx|xls|csv)$/i, "") }));
    } catch (e) {
      setStatus({ msg: `Could not read file: ${e.message}`, err: true });
    }
  };

  const applyHeaderRow = (name, all, headerRow) => {
    const width = Math.max(...all.map((r) => r.length));
    const headers = Array.from({ length: width }, (_, i) => String(all[headerRow][i] ?? "").trim() || `Column ${i + 1}`);
    const rows = all.slice(headerRow + 1).filter((r) => r.some((c) => String(c).trim() !== ""));
    setFile({ name, all, headerRow, headers, rows });
    setMapping(guessMapping(headers));
  };

  const mapped = useMemo(() => {
    if (!file) return [];
    return file.rows.map((r) => {
      const o = {};
      for (const [f] of FIELDS) o[f] = mapping[f] >= 0 ? String(r[mapping[f]] ?? "").trim() : "";
      o.raw = Object.fromEntries(file.headers.map((h, i) => [h, r[i] ?? ""]));
      return o;
    });
  }, [file, mapping]);
  const validCount = mapped.filter((r) => r.part_number).length;

  const save = async () => {
    if (mapping.part_number < 0) return setStatus({ msg: "Map the Part Number column first.", err: true });
    if (!meta.vendor.trim() && !meta.manufacturer.trim()) return setStatus({ msg: "Enter a vendor or manufacturer.", err: true });
    setBusy(true); setStatus({ msg: "Saving...", err: false });
    try {
      const r = await api("/pricelists", { method: "POST", body: { ...meta, file_name: file.name, items: mapped } });
      setStatus({ msg: `Saved "${r.name}" with ${r.row_count} rows${meta.update_catalog ? `; updated ${r.catalog_updated} catalog parts (reload the lookup page to see them)` : ""}.`, err: false });
      setFile(null); refresh();
    } catch (e) { setStatus({ msg: e.message, err: true }); }
    finally { setBusy(false); }
  };

  const del = async (pl) => {
    if (!window.confirm(`Delete price list "${pl.name}" (${pl.row_count} rows)?`)) return;
    try { await api(`/pricelists/${pl.id}`, { method: "DELETE" }); refresh(); }
    catch (e) { setStatus({ msg: e.message, err: true }); }
  };

  return (
    <div style={{ padding: "16px 20px 28px", fontFamily: "Arial, sans-serif", maxWidth: "1900px", margin: "0 auto", boxSizing: "border-box" }}>
      <div style={box}>
        <h2 style={{ marginTop: 0, marginBottom: "16px" }}>Import Price List</h2>
        <label
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) readFile(f); }}
          style={{
            display: "block", border: `2px dashed ${drag ? "#0ea5e9" : "#94a3b8"}`, borderRadius: "10px",
            padding: "36px", textAlign: "center", cursor: "pointer", background: drag ? "#f0f9ff" : "#f8fafc", color: "#475569",
          }}
        >
          <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ""; }} />
          <strong>Drag & drop</strong> an .xlsx, .xls or .csv file here, or click to choose
        </label>
        {status.msg && <p style={{ color: status.err ? "#dc2626" : "#059669" }}>{status.msg}</p>}

        {file && (
          <>
            <h3 style={{ marginBottom: "10px" }}>{file.name} — {file.rows.length} rows ({validCount} with a part number)</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: "10px", marginBottom: "16px" }}>
              <input style={inputStyle} placeholder="Price list name *" value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} />
              <input style={inputStyle} placeholder="Vendor" value={meta.vendor} onChange={(e) => setMeta({ ...meta, vendor: e.target.value })} />
              <input style={inputStyle} placeholder="Manufacturer" value={meta.manufacturer} onChange={(e) => setMeta({ ...meta, manufacturer: e.target.value })} />
              <label style={{ fontSize: "13px", color: "#475569" }}>Effective date
                <input type="date" style={inputStyle} value={meta.effective_date} onChange={(e) => setMeta({ ...meta, effective_date: e.target.value })} />
              </label>
              <label style={{ fontSize: "13px", alignSelf: "center" }}>
                <input type="checkbox" checked={meta.update_catalog} onChange={(e) => setMeta({ ...meta, update_catalog: e.target.checked })} />{" "}
                Also update list prices of matching parts in the catalog
              </label>
            </div>

            <label style={{ fontSize: "13px", color: "#475569", display: "block", marginBottom: "12px" }}>
              Header row{" "}
              <select style={{ padding: "6px" }} value={file.headerRow}
                onChange={(e) => applyHeaderRow(file.name, file.all, Number(e.target.value))}>
                {file.all.slice(0, 20).map((r, i) => (
                  <option key={i} value={i}>Row {i + 1}: {r.filter((c) => String(c).trim()).slice(0, 4).join(" | ").slice(0, 60)}</option>
                ))}
              </select>
            </label>
            <h3 style={{ margin: "0 0 8px" }}>Column mapping</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px", marginBottom: "16px" }}>
              {FIELDS.map(([f, label]) => (
                <label key={f} style={{ fontSize: "13px", color: "#475569" }}>{label}
                  <select style={inputStyle} value={mapping[f]} onChange={(e) => setMapping({ ...mapping, [f]: Number(e.target.value) })}>
                    <option value={-1}>— not mapped —</option>
                    {file.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </label>
              ))}
            </div>

            <h3 style={{ margin: "0 0 8px" }}>Preview (first 20 rows)</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead><tr>{FIELDS.filter(([f]) => mapping[f] >= 0).map(([f, l]) => <th key={f} style={th}>{l}</th>)}</tr></thead>
                <tbody>
                  {mapped.slice(0, 20).map((r, i) => (
                    <tr key={i} style={{ opacity: r.part_number ? 1 : 0.45 }}>
                      {FIELDS.filter(([f]) => mapping[f] >= 0).map(([f]) => <td key={f} style={td}>{r[f]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
              <button onClick={save} disabled={busy || !validCount} style={btn("#1f4ed8")}>{busy ? "Saving..." : `Save Price List (${validCount} rows)`}</button>
              <button onClick={() => setFile(null)} style={btn("#64748b")}>Cancel</button>
            </div>
          </>
        )}
      </div>

      <div style={{ ...box, marginTop: "20px" }}>
        <h2 style={{ marginTop: 0, marginBottom: "16px" }}>Saved Price Lists</h2>
        {lists.length === 0 ? <p style={{ color: "#475569" }}>No price lists yet.</p> : (
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead><tr>{["Name", "Vendor", "Manufacturer", "Effective", "File", "Rows", "Uploaded", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {lists.map((pl) => (
                <tr key={pl.id}>
                  <td style={td}><strong>{pl.name}</strong></td>
                  <td style={td}>{pl.vendor}</td>
                  <td style={td}>{pl.manufacturer}</td>
                  <td style={td}>{pl.effective_date ? String(pl.effective_date).slice(0, 10) : ""}</td>
                  <td style={td}>{pl.file_name}</td>
                  <td style={td}>{pl.row_count}</td>
                  <td style={td}>{new Date(pl.uploaded_at).toLocaleString()}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <button onClick={() => del(pl)} style={{ ...btn("#dc2626"), padding: "6px 12px" }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
