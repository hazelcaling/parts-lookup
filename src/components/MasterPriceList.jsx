import React, { useEffect, useRef, useState } from "react";
import SearchableSelect from "./SearchableSelect";
import { api } from "../api";
import Spinner from "./Spinner";
import { statusText } from "../utils/statusText";
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

const SEARCH_DELAY_MS = 300; // wait until the user pauses typing before searching

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
  const [facetsLoading, setFacetsLoading] = useState(true);
  const [data, setData] = useState({ total: 0, rows: [] });
  const [loaded, setLoaded] = useState(false); // first results have arrived
  // busy: "" when idle, otherwise why results are loading: initial | searching | filtering | clearing | page | retry
  const [busy, setBusy] = useState("initial");
  const [error, setError] = useState("");
  const [retryTick, setRetryTick] = useState(0);
  const nextKind = useRef("initial");

  useEffect(() => {
    api("/master/facets").then(setFacets).catch(() => {}).finally(() => setFacetsLoading(false));
  }, []);

  // Every change says right away what is happening and goes back to page 1 (except paging itself)
  // (picking the value that is already selected changes nothing, so it doesn't show a message)
  const change = (kind, cur, set) => (v) => {
    if (v === cur && page === 1) return;
    nextKind.current = kind; setBusy(kind); setError(""); set(v); setPage(1);
  };
  const onSearch = change("searching", search, setSearch);
  const onSeries = change("filtering", seriesFilter, setSeriesFilter);
  const onModel = change("filtering", modelFilter, setModelFilter);
  const onSection = change("filtering", sectionFilter, setSectionFilter);
  const onCategory = change("filtering", categoryFilter, setCategoryFilter);
  const onVendor = change("filtering", vendorFilter, setVendorFilter);
  const goPage = (p) => { if (p === page) return; nextKind.current = "page"; setBusy("page"); setError(""); setPage(p); };

  useEffect(() => {
    const kind = nextKind.current;
    setBusy(kind);
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const p = new URLSearchParams({
          q: search.trim(), series: seriesFilter, model: modelFilter.trim(), section: sectionFilter,
          category: categoryFilter, vendor: vendorFilter, page: String(page), pageSize: String(pageSize),
        });
        const r = await api(`/master?${p}`, { signal: ctl.signal });
        if (ctl.signal.aborted) return;
        setData(r); setLoaded(true); setError(""); setBusy("");
      } catch (e) {
        if (ctl.signal.aborted || e.name === "AbortError") return; // a newer search replaced this one
        setError(e.message || "Could not load results"); setBusy("");
      }
    }, kind === "searching" ? SEARCH_DELAY_MS : 0);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [search, seriesFilter, modelFilter, sectionFilter, categoryFilter, vendorFilter, page, retryTick]);

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));
  const hasFilters = !!(search || seriesFilter || modelFilter || sectionFilter || categoryFilter || vendorFilter);
  const clearAll = () => {
    nextKind.current = "clearing"; setBusy("clearing"); setError("");
    setSearch(""); setSeriesFilter(""); setModelFilter(""); setSectionFilter(""); setCategoryFilter(""); setVendorFilter(""); setPage(1);
  };
  const retry = () => { nextKind.current = "retry"; setBusy("retry"); setError(""); setRetryTick((n) => n + 1); };
  const setRowNotes = (row, notes) =>
    setData((d) => ({ ...d, rows: d.rows.map((x) => (x.source === row.source && x.id === row.id ? { ...x, notes } : x)) }));
  const isBusy = !!busy;

  return (
    <div style={{ width: "100%", minWidth: 0, border: "1px solid #ddd", borderRadius: "10px", padding: "18px", background: "#fff", boxSizing: "border-box" }}>
      <h2 style={{ marginTop: 0, marginBottom: "16px", textAlign: "center" }}>Master Price List</h2>

      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <input
            type="text"
            placeholder="Search part number, description, IPL description, notes"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            aria-busy={busy === "searching"}
            style={{ width: "100%", padding: "10px 36px 10px 12px", boxSizing: "border-box" }}
          />
          {busy === "searching" && <Spinner style={{ position: "absolute", right: 12, top: "50%", marginTop: -7 }} />}
        </div>
        <button onClick={clearAll} disabled={!hasFilters} title="Clear search and all filters"
          style={{ padding: "10px 14px", cursor: hasFilters ? "pointer" : "default", opacity: hasFilters ? 1 : 0.5 }}>
          Clear
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "10px", marginBottom: "12px" }}>
        <SearchableSelect value={seriesFilter} onChange={onSeries} options={facets.series || []} allLabel="All Series" placeholder="Search series" loading={facetsLoading} />
        <SearchableSelect value={modelFilter} onChange={onModel} options={facets.models || []} allLabel="All Models" placeholder="Search model" loading={facetsLoading} />
        <SearchableSelect value={sectionFilter} onChange={onSection} options={facets.sections || []} allLabel="All Sections" placeholder="Search section" loading={facetsLoading} />
        <SearchableSelect value={categoryFilter} onChange={onCategory} options={facets.categories || []} allLabel="All Categories" placeholder="Search category" loading={facetsLoading} />
        <SearchableSelect value={vendorFilter} onChange={onVendor} options={facets.vendors || []} allLabel="All Vendors" placeholder="Search vendor" loading={facetsLoading} />
      </div>

      <div style={{ fontSize: "13px", color: "#666", marginBottom: "10px", display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
        <span role="status" aria-live="polite" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          {isBusy ? (
            <><Spinner /><span style={{ color: "#1d4ed8", fontWeight: 600 }}>{statusText(busy, { search, page })}</span></>
          ) : error ? (
            <span style={{ color: "#dc2626" }}>
              Could not load results ({error}).{" "}
              <button onClick={retry} style={{ padding: "2px 8px", fontSize: "12px" }}>Try again</button>
            </span>
          ) : (
            <span>Showing {data.rows.length} of {data.total} items{search.trim() ? ` for “${search.trim()}”` : ""}</span>
          )}
        </span>
      </div>

      <div aria-busy={isBusy} style={{ position: "relative", maxHeight: "620px", overflowY: "auto", overflowX: "auto", border: "1px solid #ddd", background: "white" }}>
        {isBusy && loaded && (
          <div style={{ position: "sticky", top: 0, left: 0, height: 0, zIndex: 2, display: "flex", justifyContent: "center" }}>
            <span style={{ marginTop: "40px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: "16px",
              padding: "6px 14px", fontSize: "13px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "8px", boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}>
              <Spinner /> {statusText(busy, { search, page })}
            </span>
          </div>
        )}
        <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%", minWidth: "860px", fontSize: "13px", tableLayout: "fixed",
          opacity: isBusy && loaded ? 0.45 : 1, transition: "opacity .15s" }}>
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
            {!data.rows.length && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "28px", color: "#64748b" }}>
                  {!loaded && !error ? <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}><Spinner /> Loading Master Price List…</span>
                    : isBusy ? null
                    : error ? "Results could not be loaded."
                    : hasFilters ? "No parts match your search or filters. Try fewer words, or press Clear."
                    : "No parts found."}
                </td>
              </tr>
            )}
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
          <button onClick={() => goPage(Math.max(1, page - 1))} disabled={page === 1 || busy === "page"} style={{ padding: "8px 12px", marginRight: "8px" }}>Prev</button>
          <button onClick={() => goPage(Math.min(totalPages, page + 1))} disabled={page === totalPages || busy === "page"} style={{ padding: "8px 12px" }}>Next</button>
        </div>
        <div style={{ fontSize: "13px" }}>Page {page} of {totalPages}</div>
      </div>
    </div>
  );
}
