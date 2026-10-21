import React, { useEffect, useRef, useState } from "react";

// Dropdown with a search box inside it to type-filter its options.
export default function SearchableSelect({ value, onChange, options, allLabel, placeholder = "Search..." }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const ql = q.trim().toLowerCase();
  const shown = (ql ? options.filter((o) => String(o).toLowerCase().includes(ql)) : options).slice(0, 500);
  const pick = (v) => { onChange(v); setOpen(false); setQ(""); };
  return (
    <div ref={ref} style={{ position: "relative", minWidth: 0 }}>
      <button type="button" onClick={() => setOpen((o) => !o)} title={value || allLabel}
        style={{ width: "100%", padding: "10px", textAlign: "left", background: "#fff", border: "1px solid #767676", borderRadius: "2px",
          cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", boxSizing: "border-box" }}>
        {value || allLabel} <span style={{ float: "right", color: "#64748b" }}>▾</span>
      </button>
      {open && (
        <div style={{ position: "absolute", zIndex: 50, top: "100%", left: 0, minWidth: "100%", width: "max-content", maxWidth: "360px",
          background: "#fff", border: "1px solid #cbd5e1", borderRadius: "6px", boxShadow: "0 6px 18px rgba(0,0,0,.12)", padding: "6px" }}>
          <input autoFocus type="text" value={q} placeholder={placeholder} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); if (e.key === "Enter" && shown[0] !== undefined) pick(shown[0]); }}
            style={{ width: "100%", padding: "7px", boxSizing: "border-box", marginBottom: "4px" }} />
          <div style={{ maxHeight: "260px", overflowY: "auto", fontSize: "13px" }}>
            {[["", allLabel], ...shown.map((o) => [o, o])].map(([v, l]) => (
              <div key={v || "__all"} onClick={() => pick(v)}
                style={{ padding: "6px 8px", cursor: "pointer", borderRadius: "4px", background: v === value ? "#e0f2fe" : undefined }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                onMouseLeave={(e) => (e.currentTarget.style.background = v === value ? "#e0f2fe" : "")}>
                {l}
              </div>
            ))}
            {!shown.length && <div style={{ padding: "6px 8px", color: "#94a3b8" }}>No matches</div>}
          </div>
        </div>
      )}
    </div>
  );
}
