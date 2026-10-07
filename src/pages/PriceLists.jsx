import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { inputStyle, btn } from "../components/styles";
import {
  FIELDS, readSheet, withHeaderRow, cleanSheetName, sheetItems, dedupeByPartNumber,
} from "../utils/priceListParse";

const box = { background: "#fff", border: "1px solid #ddd", borderRadius: "10px", padding: "18px", boxSizing: "border-box" };
const th = { padding: "8px", background: "#f3f3f3", textAlign: "left", whiteSpace: "nowrap" };
const td = { padding: "6px 8px", borderTop: "1px solid #e2e8f0", fontSize: "13px" };

export default function PriceLists() {
  const [lists, setLists] = useState([]);
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState(null); // {name, sheets:[{..., include, series, category}]}
  const [active, setActive] = useState(0);
  const [meta, setMeta] = useState({
    name: "", vendor: "", manufacturer: "", effective_date: "", update_catalog: false,
    sheetAsSeries: true, dedupe: true,
  });
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
      const sheets = wb.SheetNames.map((n) => ({
        ...readSheet(XLSX, wb.Sheets[n], n),
        include: true, series: cleanSheetName(n), category: "",
      })).filter((s) => s.rows.length > 0);
      if (!sheets.length) throw new Error("The file is empty.");
      setFile({ name: f.name, sheets });
      setActive(0);
      setMeta((m) => ({ ...m, name: f.name.replace(/\.(xlsx|xls|csv)$/i, ""), sheetAsSeries: sheets.length > 1 }));
    } catch (e) {
      setStatus({ msg: `Could not read file: ${e.message}`, err: true });
    }
  };

  const updateSheet = (i, patch) =>
    setFile((f) => ({ ...f, sheets: f.sheets.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));

  const sheet = file?.sheets[active];
  const result = useMemo(() => {
    if (!file) return { items: [], removed: [], ties: 0, total: 0 };
    const all = file.sheets.filter((s) => s.include).flatMap((s) =>
      sheetItems(s, { series: meta.sheetAsSeries ? s.series : "", category: s.category })
    ).filter((r) => r.part_number);
    if (!meta.dedupe) return { items: all, removed: [], ties: 0, total: all.length };
    return { ...dedupeByPartNumber(all), total: all.length };
  }, [file, meta.sheetAsSeries, meta.dedupe]);
  const preview = useMemo(() => (sheet ? sheetItems(sheet, { series: meta.sheetAsSeries ? sheet.series : "", category: sheet.category }) : []), [sheet, meta.sheetAsSeries]);

  const save = async () => {
    const bad = file.sheets.find((s) => s.include && s.mapping.part_number < 0);
    if (bad) return setStatus({ msg: `Map the Part Number column for sheet "${bad.name}".`, err: true });
    if (!meta.vendor.trim() && !meta.manufacturer.trim()) return setStatus({ msg: "Enter a vendor or manufacturer.", err: true });
    setBusy(true); setStatus({ msg: "Saving...", err: false });
    try {
      const r = await api("/pricelists", { method: "POST", body: { ...meta, file_name: file.name, items: result.items } });
      setStatus({
        msg: `Saved "${r.name}" with ${r.row_count} rows` +
          (result.removed.length ? ` (${result.removed.length} duplicate part numbers removed)` : "") +
          (meta.update_catalog ? `; updated ${r.catalog_updated} catalog parts` : "") + ".",
        err: false,
      });
      setFile(null); refresh();
    } catch (e) { setStatus({ msg: e.message, err: true }); }
    finally { setBusy(false); }
  };

  const del = async (pl) => {
    if (!window.confirm(`Delete price list "${pl.name}" (${pl.row_count} rows)?`)) return;
    try { await api(`/pricelists/${pl.id}`, { method: "DELETE" }); refresh(); }
    catch (e) { setStatus({ msg: e.message, err: true }); }
  };

  const mappedFields = sheet ? FIELDS.filter(([f]) => sheet.mapping[f] >= 0 || (f === "series" && meta.sheetAsSeries) || (f === "category" && sheet.category)) : [];

  return (
    <div style={{ padding: "16px 20px 28px", fontFamily: "Arial, sans-serif", maxWidth: "1900px", margin: "0 auto", boxSizing: "border-box" }}>
      <div style={box}>
        <h2 style={{ marginTop: 0, marginBottom: "16px" }}>Import Vendor Price List</h2>
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
            <h3 style={{ marginBottom: "10px" }}>
              {file.name} — {file.sheets.length} sheet{file.sheets.length > 1 ? "s" : ""}, {result.items.length} rows to save
              {result.removed.length > 0 && ` (${result.removed.length} duplicates removed${result.ties ? `, ${result.ties} ties kept first` : ""})`}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: "10px", marginBottom: "10px" }}>
              <input style={inputStyle} placeholder="Price list name *" value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} />
              <input style={inputStyle} placeholder="Vendor" value={meta.vendor} onChange={(e) => setMeta({ ...meta, vendor: e.target.value })} />
              <input style={inputStyle} placeholder="Manufacturer" value={meta.manufacturer} onChange={(e) => setMeta({ ...meta, manufacturer: e.target.value })} />
              <label style={{ fontSize: "13px", color: "#475569" }}>Effective date
                <input type="date" style={inputStyle} value={meta.effective_date} onChange={(e) => setMeta({ ...meta, effective_date: e.target.value })} />
              </label>
            </div>
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", fontSize: "13px", marginBottom: "14px" }}>
              <label><input type="checkbox" checked={meta.sheetAsSeries} onChange={(e) => setMeta({ ...meta, sheetAsSeries: e.target.checked })} /> Use each sheet name as the Series</label>
              <label><input type="checkbox" checked={meta.dedupe} onChange={(e) => setMeta({ ...meta, dedupe: e.target.checked })} /> Remove duplicate part numbers (keep the higher list price)</label>
              <label><input type="checkbox" checked={meta.update_catalog} onChange={(e) => setMeta({ ...meta, update_catalog: e.target.checked })} /> Also update list prices of matching catalog parts</label>
            </div>

            {file.sheets.length > 1 && (
              <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: "14px" }}>
                <thead><tr>{["Import", "Sheet", "Rows", "Series", "Category", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {file.sheets.map((s, i) => (
                    <tr key={s.name} style={{ background: i === active ? "#f0f9ff" : undefined }}>
                      <td style={td}><input type="checkbox" checked={s.include} onChange={(e) => updateSheet(i, { include: e.target.checked })} /></td>
                      <td style={td}>{s.name}</td>
                      <td style={td}>{s.rows.length}</td>
                      <td style={td}><input style={{ padding: "6px", width: "100%", boxSizing: "border-box" }} value={s.series} disabled={!meta.sheetAsSeries} onChange={(e) => updateSheet(i, { series: e.target.value })} /></td>
                      <td style={td}><input style={{ padding: "6px", width: "100%", boxSizing: "border-box" }} value={s.category} onChange={(e) => updateSheet(i, { category: e.target.value })} /></td>
                      <td style={td}><button onClick={() => setActive(i)} style={{ ...btn("#64748b"), padding: "6px 12px" }}>Columns / preview</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h3 style={{ margin: "0 0 8px" }}>{file.sheets.length > 1 ? `Sheet "${sheet.name}": ` : ""}Column mapping</h3>
            <label style={{ fontSize: "13px", color: "#475569", display: "block", marginBottom: "12px" }}>
              Header row{" "}
              <select style={{ padding: "6px" }} value={sheet.headerRow}
                onChange={(e) => updateSheet(active, { ...withHeaderRow(sheet, Number(e.target.value)), include: sheet.include, series: sheet.series, category: sheet.category })}>
                {sheet.all.slice(0, 20).map((r, i) => (
                  <option key={i} value={i}>Row {i + 1}: {r.filter((c) => String(c).trim()).slice(0, 4).join(" | ").slice(0, 60)}</option>
                ))}
              </select>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px", marginBottom: "16px" }}>
              {FIELDS.map(([f, label]) => (
                <label key={f} style={{ fontSize: "13px", color: "#475569" }}>{label}
                  <select style={inputStyle} value={sheet.mapping[f]}
                    onChange={(e) => updateSheet(active, { mapping: { ...sheet.mapping, [f]: Number(e.target.value) } })}>
                    <option value={-1}>— not mapped —</option>
                    {sheet.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </label>
              ))}
            </div>

            <h3 style={{ margin: "0 0 8px" }}>Preview (first 20 rows)</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead><tr>{mappedFields.map(([f, l]) => <th key={f} style={th}>{l}</th>)}</tr></thead>
                <tbody>
                  {preview.slice(0, 20).map((r, i) => (
                    <tr key={i} style={{ opacity: r.part_number ? 1 : 0.45 }}>
                      {mappedFields.map(([f]) => <td key={f} style={td}>{r[f]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.removed.length > 0 && (
              <details style={{ marginTop: "12px", fontSize: "13px" }}>
                <summary>{result.removed.length} duplicate part numbers removed</summary>
                <table style={{ borderCollapse: "collapse", marginTop: "8px" }}>
                  <thead><tr>{["Part Number", "Kept", "Removed", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {result.removed.slice(0, 200).map((d, i) => (
                      <tr key={i}>
                        <td style={td}>{d.pn}</td>
                        <td style={td}>{d.kept.list_price} ({d.kept.raw._sheet})</td>
                        <td style={td}>{d.dropped.list_price} ({d.dropped.raw._sheet})</td>
                        <td style={td}>{d.tie ? "tie: first kept" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}

            <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
              <button onClick={save} disabled={busy || !result.items.length} style={btn("#1f4ed8")}>{busy ? "Saving..." : `Save Price List (${result.items.length} rows)`}</button>
              <button onClick={() => setFile(null)} style={btn("#64748b")}>Cancel</button>
            </div>
          </>
        )}
      </div>

      <div style={{ ...box, marginTop: "20px" }}>
        <h2 style={{ marginTop: 0, marginBottom: "16px" }}>Saved Vendor Price Lists</h2>
        {lists.length === 0 ? <p style={{ color: "#475569" }}>No price lists yet.</p> : (
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead><tr>{["Name", "Vendor", "Manufacturer", "Effective", "File", "Rows", "Uploaded", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {lists.map((pl) => (
                <tr key={pl.id}>
                  <td style={td}><strong>{pl.name}</strong></td>
                  <td style={td}>{pl.vendor}</td>
                  <td style={td}>{pl.manufacturer}</td>
                  <td style={td}>{pl.effective_date || ""}</td>
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
