import React, { useEffect, useState } from "react";
import { api } from "../api";
import { inputStyle, btn } from "../components/styles";
import { money } from "../utils/pdfHelpers";

const th = { padding: "8px", background: "#f3f3f3", textAlign: "left", whiteSpace: "nowrap" };
const td = { padding: "6px 8px", borderTop: "1px solid #e2e8f0", fontSize: "13px", verticalAlign: "top" };

export default function MasterSearch() {
  const [q, setQ] = useState("");
  const [vendor, setVendor] = useState("");
  const [source, setSource] = useState("");
  const [vendors, setVendors] = useState([]);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api("/vendors").then(setVendors).catch(() => {}); }, []);

  const search = async (e) => {
    e?.preventDefault();
    if (!q.trim() && !vendor) return setError("Enter a part number / description or pick a vendor.");
    setError(""); setBusy(true);
    try {
      const p = new URLSearchParams({ q: q.trim(), vendor, source, limit: "300" });
      setRows(await api(`/search?${p}`));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ padding: "16px 20px 28px", fontFamily: "Arial, sans-serif", maxWidth: "1900px", margin: "0 auto", boxSizing: "border-box" }}>
      <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: "10px", padding: "18px" }}>
        <h2 style={{ marginTop: 0, marginBottom: "16px" }}>Master Price List</h2>
        <form onSubmit={search} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "10px", marginBottom: "16px" }}>
          <input style={inputStyle} placeholder="Part number or description" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <select style={inputStyle} value={vendor} onChange={(e) => setVendor(e.target.value)}>
            <option value="">All vendors / manufacturers</option>
            {vendors.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select style={inputStyle} value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">Catalog + price lists</option>
            <option value="catalog">Catalog only</option>
            <option value="pricelist">Price lists only</option>
          </select>
          <button type="submit" style={btn("#0ea5e9")} disabled={busy}>{busy ? "Searching..." : "Search"}</button>
        </form>
        {error && <p style={{ color: "#dc2626" }}>{error}</p>}
        {rows && (
          <>
            <p style={{ color: "#475569", marginTop: 0 }}>{rows.length} result{rows.length === 1 ? "" : "s"}{rows.length >= 300 ? " (showing first 300, refine your search)" : ""}</p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead><tr>{["Part Number", "Description", "List Price", "Vendor", "Manufacturer", "Series / Model", "Source", "Effective"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td style={td}><strong>{r.part_number}</strong>
                        {r.obsolete && <div style={{ color: "#dc2626", fontWeight: 600 }}>OBSOLETE{r.replacement_pn ? ` → ${r.replacement_pn}` : ""}</div>}
                      </td>
                      <td style={td}>{r.description}</td>
                      <td style={{ ...td, color: "#059669", fontWeight: 600, whiteSpace: "nowrap" }}>{r.list_price === null ? "" : money(r.list_price)}</td>
                      <td style={td}>{r.vendor}</td>
                      <td style={td}>{r.manufacturer}</td>
                      <td style={td}>{[r.series, r.model].filter(Boolean).join(" / ")}</td>
                      <td style={td}>{r.source === "Catalog" ? "Catalog" : `Price list: ${r.price_list_name}`}</td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{r.effective_date ? String(r.effective_date).slice(0, 10) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
