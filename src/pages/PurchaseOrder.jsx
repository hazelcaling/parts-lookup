import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import LineItemsTable from "../forms/LineItemsTable.jsx";
import { blankRow, withIds } from "../forms/rows.js";
import RichTextEditor from "../forms/RichTextEditor.jsx";
import { useDraft } from "../forms/useDraft.js";
import { htecLogo, loadLogo } from "../forms/logo.js";
import {
  drawPurchaseOrder, poFileName, poTotals, fmtMultiplier, todayLA, usedRows, richIsEmpty,
  PO_DEFAULT_NOTES, FREIGHT_TERMS, HTEC,
} from "../forms/formPdf.js";
import { money } from "../utils/money.js";
import "../forms/forms.css";

const freshHeader = () => ({
  date: todayLA(), orderTo: "", poNumber: "", orderedBy: "Hazel Caling", freightTerms: "",
  shipTo: "", address: "", cityStateZip: "", attention: "", deliveryRef: "", jobName: "", shipVia: "",
  special: [], notes: PO_DEFAULT_NOTES, multiplier: "1.00",
});
const fresh = () => ({ ...freshHeader(), rows: [blankRow()] });
const normalize = (s) => ({ ...s, rows: Array.isArray(s.rows) && s.rows.length ? withIds(s.rows) : [blankRow()] });

export const OC_DRAFT_KEY = "orderConfirmationDraft";

export default function PurchaseOrder() {
  const navigate = useNavigate();
  const [po, setPo] = useDraft("purchaseOrderDraft", fresh, { skip: ["date"], normalize }); // date is always today when opened
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => setPo((p) => ({ ...p, [k]: e.target.value }));
  const rows = po.rows;
  const setRows = (fn) => setPo((p) => ({ ...p, rows: typeof fn === "function" ? fn(p.rows) : fn }));
  const t = poTotals(po);

  const generate = async () => {
    setBusy(true);
    setMsg("");
    try {
      const logo = await loadLogo().catch(() => null);
      const doc = new jsPDF({ unit: "mm", format: "letter", compress: true });
      drawPurchaseOrder(doc, po, { logo });
      doc.save(poFileName(po));
      setMsg(`Saved ${poFileName(po)}`);
    } catch (e) {
      setMsg(`Couldn’t make the PDF: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };
  const clearHeader = () => { setPo((p) => ({ ...freshHeader(), rows: p.rows })); setResetKey((k) => k + 1); setMsg("Header cleared. Line items kept."); };
  const clearAll = () => {
    if (!window.confirm("Clear the whole Purchase Order, including line items?")) return;
    setPo(fresh()); setResetKey((k) => k + 1); setMsg("Purchase Order cleared.");
  };
  const toOC = () => {
    let existing = null;
    try { existing = JSON.parse(localStorage.getItem(OC_DRAFT_KEY) || "null"); } catch { /* ignore */ }
    const hasWork = existing && (usedRows(existing.rows).length > 0 ||
      ["jobName", "poNumber", "htePoNumber", "billTo", "shipTo", "shipVia", "estShipDate"].some((k) => String(existing[k] || "").trim()));
    if (hasWork && !window.confirm("Replace the Order Confirmation you were working on with this PO’s details?")) return;
    const attn = po.attention.trim() ? `Attn: ${po.attention.trim()}` : "";
    const oc = {
      jobName: po.jobName, poNumber: po.deliveryRef, htePoNumber: po.poNumber, shipVia: po.shipVia,
      freightTerms: po.freightTerms, terms: "NET 30", estShipDate: "",
      billTo: [po.shipTo, attn].filter((x) => String(x).trim()).join("\n"),
      shipTo: [po.shipTo, po.address, po.cityStateZip, attn].filter((x) => String(x).trim()).join("\n"),
      rows: usedRows(po.rows).map(({ qty, pn, description, price }) => ({ qty, pn, description, price })),
    };
    localStorage.setItem(OC_DRAFT_KEY, JSON.stringify(oc));
    navigate("/order-confirmation");
  };

  const field = (k, label, opts = {}) => (
    <div className="df-field">
      <label htmlFor={`po-${k}`}>{label}</label>
      <input id={`po-${k}`} className="df-input" value={po[k]} onChange={set(k)} {...opts} />
    </div>
  );

  return (
    <div className="df-page">
      <div className="df-actions">
        <h2>Purchase Order</h2>
        <button type="button" className="df-btn primary" onClick={generate} disabled={busy}>{busy ? "Making PDF…" : "Generate PO PDF"}</button>
        <button type="button" className="df-btn" onClick={clearHeader} title="Clear the header fields, keep line items">Clear header</button>
        <button type="button" className="df-btn" onClick={clearAll}>Clear all</button>
        <button type="button" className="df-btn" onClick={toOC} title="Start an Order Confirmation with this PO’s ship-to, numbers and line items">Make Order Confirmation from this PO</button>
        {msg && <span role="status" className="df-msg">{msg}</span>}
      </div>

      <div className="df-paper">
        <div className="po-head">
          <img src={htecLogo} alt="Heat Transfer Equipment Company, Inc." className="po-logo" />
          <div className="po-title">PURCHASE ORDER</div>
          <div>{HTEC.street}, {HTEC.cityLine}</div>
          <div>{HTEC.phonePO}</div>
        </div>

        <div className="po-date">
          <label htmlFor="po-date">Date:</label>
          <input id="po-date" className="df-input" value={po.date} onChange={set("date")} style={{ width: "8.5em" }} />
        </div>

        <div className="po-cols">
          <div>
            {field("orderTo", "Order To:")}
            {field("poNumber", "Purchase Order #:")}
            {field("orderedBy", "Ordered By:")}
            <div className="df-field">
              <label htmlFor="po-freightTerms">Freight Terms:</label>
              <select id="po-freightTerms" className="df-input" value={po.freightTerms} onChange={set("freightTerms")} style={{ width: "8em" }}>
                <option value="">Select…</option>
                {FREIGHT_TERMS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
          </div>
          <div>
            {field("shipTo", "Ship To:")}
            {field("address", "Address:")}
            {field("cityStateZip", "City / State / Zip:")}
            {field("attention", "Attention:")}
            {field("deliveryRef", "Delivery Ref (Customer PO#):")}
            {field("jobName", "Job Name:")}
            {field("shipVia", "Ship Via:")}
            <div className="df-block">
              <label id="po-special-label" className="df-block-label" onClick={() => document.getElementById("po-special")?.focus()}>Special Instructions:</label>
              <RichTextEditor id="po-special" labelId="po-special-label" value={po.special} resetKey={resetKey}
                onChange={(lines) => setPo((p) => ({ ...p, special: richIsEmpty(lines) ? [] : lines }))} />
            </div>
          </div>
        </div>

        <LineItemsTable rows={rows} setRows={setRows} prefix="po"
          order={["qty", "pn", "description", "price", "total"]}
          labels={{ qty: "Qty", pn: "Part #", description: "Description", price: "List Price", total: "Total" }} />

        <table className="po-totals">
          <tbody>
            <tr><th scope="row">List Total</th><td>{money(t.listTotal)}</td></tr>
            <tr>
              <th scope="row"><label htmlFor="po-multiplier">Multiplier</label></th>
              <td><input id="po-multiplier" className="df-cell num" inputMode="decimal" value={po.multiplier}
                onChange={set("multiplier")} onBlur={() => setPo((p) => ({ ...p, multiplier: fmtMultiplier(p.multiplier) }))} /></td>
            </tr>
            <tr className="fill"><th scope="row">Subtotal</th><td>{money(t.subtotal)}</td></tr>
          </tbody>
        </table>

        <div className="df-block po-notes">
          <label htmlFor="po-notes" className="df-block-label">Notes:</label>
          <textarea id="po-notes" className="df-input" rows={2} value={po.notes} onChange={set("notes")} />
        </div>
      </div>

      <div className="df-actions bottom">
        <button type="button" className="df-btn primary" onClick={generate} disabled={busy}>{busy ? "Making PDF…" : "Generate PO PDF"}</button>
      </div>
    </div>
  );
}
