import React, { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { money } from "../utils/money.js";

// Part # cell with Master Price List suggestions (asked from the server as you type:
// debounced, older requests cancelled). Choosing one calls onPick(item) with
// { partNumber, description, listPrice, sourceName }. Unknown parts can still be typed.
export default function PartNumberInput({ value, onChange, onPick, id, ariaLabel, className }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const [status, setStatus] = useState("idle"); // idle | searching | done | error
  const boxRef = useRef(null);
  const timer = useRef(null);
  const ctl = useRef(null);

  useEffect(() => {
    const away = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => { document.removeEventListener("mousedown", away); clearTimeout(timer.current); ctl.current?.abort(); };
  }, []);

  const search = (q) => {
    clearTimeout(timer.current);
    ctl.current?.abort();
    if (String(q).trim().length < 2) { setItems([]); setStatus("idle"); return; }
    setStatus("searching");
    timer.current = setTimeout(async () => {
      const c = new AbortController();
      ctl.current = c;
      try {
        const r = await api(`/parts/suggest?q=${encodeURIComponent(String(q).trim().toUpperCase())}&limit=10`, { signal: c.signal });
        if (c.signal.aborted) return;
        setItems(Array.isArray(r) ? r : []);
        setHi(-1);
        setStatus("done");
      } catch (e) {
        if (e.name !== "AbortError" && !c.signal.aborted) { setItems([]); setStatus("error"); }
      }
    }, 200);
  };

  const choose = (it) => {
    setOpen(false);
    setItems([]);
    setStatus("idle");
    onPick(it);
  };

  const q = String(value || "").trim();
  const showList = open && q.length >= 2;

  return (
    <div ref={boxRef} className="df-suggest">
      <input
        id={id}
        aria-label={ariaLabel}
        className={className}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList && items.length > 0}
        aria-autocomplete="list"
        onChange={(e) => { const v = e.target.value.toUpperCase(); onChange(v); setOpen(true); search(v); }}
        onFocus={() => { setOpen(true); if (q.length >= 2 && status === "idle") search(q); }}
        onKeyDown={(e) => {
          if (!showList || items.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, items.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter" && hi >= 0) { e.preventDefault(); choose(items[hi]); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {showList && (status === "searching" || status === "error" || items.length > 0 || status === "done") && (
        <div className="df-suggest-list" role="listbox">
          {status === "searching" && items.length === 0 && <div className="df-suggest-note">Searching Master Price List…</div>}
          {status === "error" && <div className="df-suggest-note">Couldn’t search right now. You can still type the part in.</div>}
          {status === "done" && items.length === 0 && (
            <div className="df-suggest-note">Not in the Master Price List. Type the description and price yourself.</div>
          )}
          {items.map((it, idx) => (
            <div
              key={`${it.partNumber}-${idx}`}
              role="option"
              aria-selected={hi === idx}
              className={"df-suggest-item" + (hi === idx ? " active" : "")}
              onMouseDown={(ev) => { ev.preventDefault(); choose(it); }}
              onMouseEnter={() => setHi(idx)}
            >
              <div className="df-suggest-top">
                <strong>{it.partNumber}</strong>
                <span className="df-suggest-price">{Number(it.listPrice) > 0 ? money(it.listPrice) : "no price"}</span>
              </div>
              <div className="df-suggest-desc">{it.description}{it.sourceName ? ` · ${it.sourceName}` : ""}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
