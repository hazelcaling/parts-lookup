import React from "react";
import PartNumberInput from "./PartNumberInput.jsx";
import { lineTotal, num } from "./formPdf.js";
import { money } from "../utils/money.js";
import { blankRow } from "./rows.js";


// Editable line items. order: column keys in display order (qty, pn, description, price, total)
export default function LineItemsTable({ rows, setRows, order, labels, prefix }) {
  const update = (id, patch) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const pick = (id, it) =>
    setRows((rs) => rs.map((r) => {
      if (r.id !== id) return r;
      const price = Number(it.listPrice);
      return {
        ...r,
        pn: it.partNumber || r.pn,
        description: it.description || r.description,
        price: price > 0 ? price.toFixed(2) : r.price,
        qty: String(r.qty ?? "").trim() === "" ? "1" : r.qty,
      };
    }));
  const remove = (id) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : [blankRow()]));

  const cell = (key, r, i) => {
    const aria = `${labels[key]} line ${i + 1}`;
    switch (key) {
      case "qty":
        return <input className="df-cell num center" inputMode="decimal" aria-label={aria} value={r.qty}
          onChange={(e) => update(r.id, { qty: e.target.value })} />;
      case "pn":
        return <PartNumberInput className="df-cell" ariaLabel={aria} id={`${prefix}-pn-${i}`} value={r.pn}
          onChange={(v) => update(r.id, { pn: v })} onPick={(it) => pick(r.id, it)} />;
      case "description":
        return <textarea className="df-cell" rows={1} aria-label={aria} value={r.description}
          onChange={(e) => update(r.id, { description: e.target.value })}
          ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }} />;
      case "price":
        return <input className="df-cell num" inputMode="decimal" aria-label={aria} value={r.price} placeholder="0.00"
          onChange={(e) => update(r.id, { price: e.target.value })}
          onBlur={(e) => { const v = e.target.value.trim(); if (v !== "") update(r.id, { price: num(v).toFixed(2) }); }} />;
      case "total":
        return <span className="df-total">{money(lineTotal(r))}</span>;
      default:
        return null;
    }
  };

  return (
    <>
      <table className={`df-items df-items-${prefix}`}>
        <thead>
          <tr>
            {order.map((k) => <th key={k} className={`col-${k}`}>{labels[k]}</th>)}
            <th className="col-x"><span className="sr-only">Remove</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              {order.map((k) => <td key={k} className={`col-${k}`}>{cell(k, r, i)}</td>)}
              <td className="col-x">
                <button type="button" className="df-x" aria-label={`Remove line ${i + 1}`} title="Remove line" onClick={() => remove(r.id)}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="df-add" onClick={() => setRows((rs) => [...rs, blankRow()])}>+ Add Line Item</button>
      <span className="df-hint">Type 2+ characters of a part number to see Master Price List matches; picking one fills the description and price.</span>
    </>
  );
}
