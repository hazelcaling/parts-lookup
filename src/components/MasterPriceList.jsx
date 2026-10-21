import React, { useEffect, useRef, useState } from "react";
import SearchableSelect from "./SearchableSelect";
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

// Inline notes editor: click to edit; Enter or leaving the field saves, Shift+Enter = new line, Esc cancels.
// The "Obsolete" tag comes from the part's obsolete flag, so it always shows, whatever the note says.
export function NotesCell({ row, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(row.notes || "");
  const [state, setState] = useState(""); // "", "saving", "saved", "error"
  const [err, setErr] = useState("");
  const cancelled = useRef(false);

  const save = async () => {
    if (cancelled.current) { cancelled.current = false; return; }
    if (value === (row.notes || "")) return setEditing(false);
    setState("saving");
    try {
      const r = await api(`/master/${row.source}/${row.id}/notes`, { method: "PATCH", body: { notes: value } });
      onSaved(r.notes);
      setEditing(false); setState("saved");
      setTimeout(() => setState((s) => (s === "saved" ? "" : s)), 2000);
    } catch (e) { setErr(e.message || "Could not save"); setState("error"); }
  };
  const tag = row.obsolete
    ? <span style={{ display: "inline-block", fontSize: "11px", fontWeight: 600, color: "#b91c1c", background: "#fee2e2", borderRadius: "8px", padding: "0 6px", marginRight: "4px" }}>Obsolete</span>
    : null;

  if (!editing) {
    return (
      <div>
        {tag}
        <div onClick={() => { setValue(row.notes || ""); setState(""); setEditing(true); }} title="Click to add / edit notes"
          style={{ display: "inline", cursor: "text", whiteSpace: "pre-wrap", wordBreak: "break-word", color: row.notes ? undefined : "#94a3b8" }}>
          {row.notes || "+ note"}
        </div>
        {state === "saved" && <div style={{ color: "#059669", fontSize: "11px" }}>Saved</div>}
      </div>
    );
  }
  return (
    <div>
      {tag}
      <textarea autoFocus value={value} rows={3} disabled={state === "saving"} onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Escape") { cancelled.current = true; setValue(row.notes || ""); setEditing(false); setState(""); }
          else if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); }
        }}
        style={{ width: "100%", boxSizing: "border-box", fontSize: "12px", padding: "4px" }} />
      <div style={{ fontSize: "11px", color: state === "error" ? "#dc2626" : "#64748b" }}>
        {state === "saving" ? "Saving..." : state === "error" ? `${err} (Enter to retry, Esc to cancel)` : "Enter = save, Shift+Enter = new line, Esc = cancel"}
      </div>
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
  const [vendorFilter, setVendorFilter] = useState("");
  const [page, setPage] = useState(1);
  const [facets, setFacets] = useState({ series: [], sections: [], categories: [], models: [], vendors: [] });
  const [data, setData] = useState({ total: 0, rows: [] });
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  useEffect(() => { api("/master/facets").then(setFacets).catch(() => {}); }, []);
  useEffect(() => { setPage(1); }, [search, seriesFilter, modelFilter, sectionFilter, categoryFilter, vendorFilter]);
  useEffect(() => {
    const my = ++reqId.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const p = new URLSearchParams({
          q: search.trim(), series: seriesFilter, model: modelFilter.trim(), section: sectionFilter,
          category: categoryFilter, vendor: vendorFilter, page: String(page), pageSize: String(pageSize),
        });
        const r = await api(`/master?${p}`);
        if (my === reqId.current) setData(r);
      } catch { /* keep previous */ }
      finally { if (my === reqId.current) setLoading(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [search, seriesFilter, modelFilter, sectionFilter, categoryFilter, vendorFilter, page]);

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));
  const hasFilters = !!(search || seriesFilter || modelFilter || sectionFilter || categoryFilter || vendorFilter);
  const clearAll = () => {
    setSearch(""); setSeriesFilter(""); setModelFilter(""); setSectionFilter(""); setCategoryFilter(""); setVendorFilter(""); setPage(1);
  };
  const setRowNotes = (row, notes) =>
    setData((d) => ({ ...d, rows: d.rows.map((x) => (x.source === row.source && x.id === row.id ? { ...x, notes } : x)) }));

  return (
    <div style={{ width: "100%", minWidth: 0, border: "1px solid #ddd", borderRadius: "10px", padding: "18px", background: "#fff", boxSizing: "border-box" }}>
      <h2 style={{ marginTop: 0, marginBottom: "16px", textAlign: "center" }}>Master Price List</h2>

      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
        <input
          type="text"
          placeholder="Search part number, description, IPL description, notes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 0, padding: "10px 12px", boxSizing: "border-box" }}
        />
        <button onClick={clearAll} disabled={!hasFilters} title="Clear search and all filters"
          style={{ padding: "10px 14px", cursor: hasFilters ? "pointer" : "default", opacity: hasFilters ? 1 : 0.5 }}>
          Clear
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "10px", marginBottom: "12px" }}>
        <SearchableSelect value={seriesFilter} onChange={setSeriesFilter} options={facets.series || []} allLabel="All Series" placeholder="Search series" />
        <SearchableSelect value={modelFilter} onChange={setModelFilter} options={facets.models || []} allLabel="All Models" placeholder="Search model" />
        <SearchableSelect value={sectionFilter} onChange={setSectionFilter} options={facets.sections || []} allLabel="All Sections" placeholder="Search section" />
        <SearchableSelect value={categoryFilter} onChange={setCategoryFilter} options={facets.categories || []} allLabel="All Categories" placeholder="Search category" />
        <SearchableSelect value={vendorFilter} onChange={setVendorFilter} options={facets.vendors || []} allLabel="All Vendors" placeholder="Search vendor" />
      </div>

      <div style={{ fontSize: "13px", color: "#666", marginBottom: "10px", display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
        <span>Showing {data.rows.length} of {data.total} items{loading ? " …" : ""}</span>
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
                    {item.source === "catalog" && item.from_price_list
                      ? (item.price_list_name || "Raypak Price List")
                      : item.source === "catalog"
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
