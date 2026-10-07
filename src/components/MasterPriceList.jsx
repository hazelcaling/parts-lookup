import React, { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { money } from "../utils/pdfHelpers";

const pageSize = 25;

// Source note from the IPL plus generated assembly notes; an original "Includes / Included under"
// note is not repeated when the generated note (with part numbers) covers it.
function noteLines(item) {
  const gen = (item.include_note || "").split("\n").filter(Boolean);
  const src = item.desc_note || "";
  const redundant = gen.length && /^(Includes|Included under)\b/.test(src);
  return [...(src && !redundant ? [src] : []), ...gen];
}

function NotesCell({ row, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(row.notes || "");
  const [state, setState] = useState(""); // "", "saving", "error"

  const save = async () => {
    if (value === (row.notes || "")) return setEditing(false);
    setState("saving");
    try {
      const r = await api(`/master/${row.source}/${row.id}/notes`, { method: "PATCH", body: { notes: value } });
      onSaved(r.notes);
      setState(""); setEditing(false);
    } catch { setState("error"); }
  };

  if (!editing) {
    return (
      <div onClick={() => { setValue(row.notes || ""); setEditing(true); }} title="Click to add / edit notes"
        style={{ cursor: "text", minHeight: "20px", whiteSpace: "pre-wrap", wordBreak: "break-word", color: row.notes ? undefined : "#94a3b8" }}>
        {row.notes || "+ note"}
      </div>
    );
  }
  return (
    <div>
      <textarea autoFocus value={value} rows={3} onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setValue(row.notes || ""); setEditing(false); }
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save();
        }}
        style={{ width: "100%", boxSizing: "border-box", fontSize: "12px", padding: "4px" }} />
      <div style={{ display: "flex", gap: "4px", marginTop: "2px" }}>
        <button onClick={save} disabled={state === "saving"} style={{ padding: "3px 8px", fontSize: "12px", background: "#059669", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          {state === "saving" ? "..." : "Save"}
        </button>
        <button onClick={() => { setValue(row.notes || ""); setEditing(false); setState(""); }} style={{ padding: "3px 8px", fontSize: "12px" }}>Cancel</button>
      </div>
      {state === "error" && <div style={{ color: "#dc2626", fontSize: "12px" }}>Could not save</div>}
    </div>
  );
}

// Master Price List: Raypak catalog (IPL) + imported vendor price lists, searched on the server.
export default function MasterPriceList({ onAdd }) {
  const [search, setSearch] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showUnpriced, setShowUnpriced] = useState(false);
  const [page, setPage] = useState(1);
  const [facets, setFacets] = useState({ series: [], sections: [], categories: [] });
  const [data, setData] = useState({ total: 0, rows: [] });
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  useEffect(() => { api("/master/facets").then(setFacets).catch(() => {}); }, []);
  useEffect(() => { setPage(1); }, [search, seriesFilter, modelFilter, sectionFilter, categoryFilter, showUnpriced]);
  useEffect(() => {
    const my = ++reqId.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const p = new URLSearchParams({
          q: search.trim(), series: seriesFilter, model: modelFilter.trim(), section: sectionFilter,
          category: categoryFilter, unpriced: showUnpriced ? "1" : "", page: String(page), pageSize: String(pageSize),
        });
        const r = await api(`/master?${p}`);
        if (my === reqId.current) setData(r);
      } catch { /* keep previous */ }
      finally { if (my === reqId.current) setLoading(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [search, seriesFilter, modelFilter, sectionFilter, categoryFilter, showUnpriced, page]);

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));
  const setRowNotes = (row, notes) =>
    setData((d) => ({ ...d, rows: d.rows.map((x) => (x.source === row.source && x.id === row.id ? { ...x, notes } : x)) }));

  return (
    <div style={{ width: "100%", minWidth: 0, border: "1px solid #ddd", borderRadius: "10px", padding: "18px", background: "#fff", boxSizing: "border-box" }}>
      <h2 style={{ marginTop: 0, marginBottom: "16px", textAlign: "center" }}>Master Price List</h2>

      <input
        type="text"
        placeholder="Search part number, description, IPL, notes, call out, vendor"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", marginBottom: "12px", boxSizing: "border-box" }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1fr)", gap: "10px", marginBottom: "12px" }}>
        <select value={seriesFilter} onChange={(e) => setSeriesFilter(e.target.value)} style={{ padding: "10px", minWidth: 0 }}>
          <option value="">All Series</option>
          {facets.series.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="text" placeholder="Filter model" value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value.toUpperCase())}
          style={{ padding: "10px", minWidth: 0, boxSizing: "border-box" }} />
        <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} style={{ padding: "10px", minWidth: 0 }}>
          <option value="">All Sections</option>
          {facets.sections.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: "10px", minWidth: 0 }}>
          <option value="">All Categories</option>
          {facets.categories.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ fontSize: "13px", color: "#666", marginBottom: "10px", display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
        <span>Showing {data.rows.length} of {data.total} items{loading ? " …" : ""}</span>
        <label><input type="checkbox" checked={showUnpriced} onChange={(e) => setShowUnpriced(e.target.checked)} /> Include parts without a list price</label>
      </div>

      <div style={{ maxHeight: "620px", overflowY: "auto", overflowX: "auto", border: "1px solid #ddd", background: "white" }}>
        <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%", minWidth: "860px", fontSize: "13px", tableLayout: "fixed" }}>
          <thead style={{ position: "sticky", top: 0, background: "#f3f3f3", zIndex: 1 }}>
            <tr>
              <th style={{ width: "65px" }}>Add</th>
              <th style={{ width: "100px" }}>Part Number</th>
              <th>Description</th>
              <th style={{ width: "85px" }}>Model</th>
              <th style={{ width: "95px" }}>List Price</th>
              <th style={{ width: "170px" }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((item) => (
              <tr key={`${item.source}-${item.id}`}>
                <td style={{ textAlign: "center" }}>
                  <button
                    onClick={() => onAdd({ partNumber: item.part_number, description: item.description, listPrice: Number(item.list_price) || 0 })}
                    style={{ padding: "5px 10px", background: "#059669", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
                  >
                    Add
                  </button>
                </td>
                <td style={{ wordBreak: "break-word" }}>{item.part_number}</td>
                <td style={{ wordBreak: "break-word" }}>
                  <div>{item.description}</div>
                  {(item.call_out || item.option_group) && (
                    <div style={{ fontSize: "12px", color: "#888", marginTop: 3, fontWeight: "bold" }}>
                      Call Out: {item.call_out || item.option_group}{item.is_option ? " (option)" : ""}
                    </div>
                  )}
                  {item.ipl_description && <div style={{ fontSize: "12px", color: "#666", marginTop: 3 }}>IPL: {item.ipl_description}</div>}
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: 3 }}>
                    Source:{" "}
                    {item.source === "catalog"
                      ? (item.source_url
                        ? <a href={item.source_url} target="_blank" rel="noopener noreferrer">IPL</a>
                        : "IPL")
                      : item.price_list_name}
                  </div>
                  {noteLines(item).map((n, i) => (
                    <div key={i} style={{ fontSize: "12px", color: "#334155", marginTop: 3 }}>Note: {n}</div>
                  ))}
                </td>
                <td style={{ wordBreak: "break-word" }}>{item.model}</td>
                <td>{item.list_price === null ? "—" : money(item.list_price)}</td>
                <td style={{ verticalAlign: "top" }}><NotesCell row={item} onSaved={(n) => setRowNotes(item, n)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "14px", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "8px 12px", marginRight: "8px" }}>Prev</button>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "8px 12px" }}>Next</button>
        </div>
        <div style={{ fontSize: "13px" }}>Page {page} of {totalPages}</div>
      </div>
    </div>
  );
}
