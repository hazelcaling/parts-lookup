import React, { useEffect, useRef, useState } from "react";

// Text input with a suggestion dropdown (same look as the PN autocomplete).
// fetchItems(q) -> Promise<items>; renderItem(item) -> node; onSelect(item);
// addLabel(q) / onAdd(q): optional "+ Add ..." entry shown at the bottom.
export default function Autosuggest({
  value, onChange, placeholder, fetchItems, renderItem, onSelect,
  addLabel, onAdd, minChars = 1, style, disabled,
}) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const boxRef = useRef(null);
  const reqId = useRef(0);

  useEffect(() => {
    const handler = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const load = (q) => {
    if (String(q).trim().length < minChars) { setItems([]); return; }
    const my = ++reqId.current;
    setTimeout(async () => {
      if (my !== reqId.current) return; // debounce
      try {
        const r = await fetchItems(q);
        if (my === reqId.current) { setItems(r); setHi(-1); }
      } catch { /* ignore */ }
    }, 150);
  };

  const showAdd = onAdd && addLabel && String(value || "").trim() !== "";
  const entries = [...items.map((it) => ({ it })), ...(showAdd ? [{ add: true }] : [])];

  const choose = (e) => {
    setOpen(false);
    if (e.add) onAdd(String(value || "").trim());
    else onSelect(e.it);
  };

  return (
    <div ref={boxRef} style={{ position: "relative", ...(style || {}) }}>
      <input
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setOpen(true); load(e.target.value); }}
        onFocus={() => { setOpen(true); load(value || ""); }}
        onKeyDown={(e) => {
          if (!open || entries.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, entries.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter" && hi >= 0) { e.preventDefault(); choose(entries[hi]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        style={{ padding: "10px", width: "100%", boxSizing: "border-box" }}
      />
      {open && entries.length > 0 && (
        <div
          style={{
            position: "absolute", top: "100%", left: 0, right: 0, minWidth: "260px",
            background: "white", border: "1px solid #94a3b8", borderRadius: "6px",
            maxHeight: "280px", overflowY: "auto", zIndex: 9999,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          }}
        >
          {entries.map((e, idx) => (
            <div
              key={e.add ? "__add" : idx}
              onMouseDown={(ev) => { ev.preventDefault(); choose(e); }}
              onMouseEnter={() => setHi(idx)}
              style={{
                padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid #e2e8f0",
                fontSize: "13px", background: hi === idx ? "#f0f9ff" : "white",
                color: e.add ? "#0ea5e9" : undefined, fontWeight: e.add ? 600 : undefined,
              }}
            >
              {e.add ? addLabel(String(value || "").trim()) : renderItem(e.it)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
