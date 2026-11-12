import React, { useState } from "react";
import { jsPDF } from "jspdf";
import LineItemsTable from "../forms/LineItemsTable.jsx";
import { blankRow, withIds } from "../forms/rows.js";
import { useDraft } from "../forms/useDraft.js";
import { htecLogo, loadLogo } from "../forms/logo.js";
import { drawOrderConfirmation, ocFileName, sumRows, todayLA, FREIGHT_TERMS, HTEC, OC_THANKS, OC_FOOTER } from "../forms/formPdf.js";
import { money } from "../utils/money.js";
import "../forms/forms.css";

const freshHeader = () => ({
  jobName: "", poNumber: "", date: todayLA(), htePoNumber: "", billTo: "", shipTo: "",
  shipVia: "", terms: "NET 30", freightTerms: "", estShipDate: "",
});
const fresh = () => ({ ...freshHeader(), rows: [blankRow()] });
const normalize = (s) => ({ ...s, rows: Array.isArray(s.rows) && s.rows.length ? withIds(s.rows) : [blankRow()] });

export default function OrderConfirmation() {
  const [oc, setOc] = useDraft("orderConfirmationDraft", fresh, { skip: ["date"], normalize }); // date is always today when opened
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => setOc((p) => ({ ...p, [k]: e.target.value }));
  const rows = oc.rows;
  const setRows = (fn) => setOc((p) => ({ ...p, rows: typeof fn === "function" ? fn(p.rows) : fn }));

  const generate = async () => {
    setBusy(true);
    setMsg("");
    try {
      const logo = await loadLogo().catch(() => null);
      const doc = new jsPDF({ unit: "mm", format: "letter", compress: true });
      drawOrderConfirmation(doc, oc, { logo });
      doc.save(ocFileName(oc));
      setMsg(`Saved ${ocFileName(oc)}`);
    } catch (e) {
      setMsg(`Couldn’t make the PDF: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };
  const clearHeader = () => { setOc((p) => ({ ...freshHeader(), rows: p.rows })); setMsg("Header cleared. Line items kept."); };
  const clearAll = () => {
    if (!window.confirm("Clear the whole Order Confirmation, including line items?")) return;
    setOc(fresh()); setMsg("Order Confirmation cleared.");
  };

  const hField = (k, label) => (
    <div className="oc-hrow">
      <label htmlFor={`oc-${k}`}>{label}</label>
      <input id={`oc-${k}`} className="df-input" value={oc[k]} onChange={set(k)} />
    </div>
  );

  return (
    <div className="df-page">
      <div className="df-actions">
        <h2>Order Confirmation</h2>
        <button type="button" className="df-btn primary" onClick={generate} disabled={busy}>{busy ? "Making PDF…" : "Generate Order Confirmation PDF"}</button>
        <button type="button" className="df-btn" onClick={clearHeader} title="Clear the header fields, keep line items">Clear header</button>
        <button type="button" className="df-btn" onClick={clearAll}>Clear all</button>
        {msg && <span role="status" className="df-msg">{msg}</span>}
      </div>

      <div className="df-paper">
        <div className="oc-top">
          <div className="oc-company">
            <img src={htecLogo} alt="Heat Transfer Equipment Company, Inc." className="oc-logo" />
            <div>{HTEC.streetShort}</div>
            <div>{HTEC.cityLine}</div>
            <div>{HTEC.phoneOC}</div>
            <a href={`https://${HTEC.web}`} target="_blank" rel="noreferrer">{HTEC.web}</a>
          </div>
          <div className="oc-right">
            <div className="oc-title">Order Confirmation</div>
            <div className="oc-hfields">
              {hField("jobName", "Job Name:")}
              {hField("poNumber", "P.O. Number:")}
              {hField("date", "DATE:")}
              {hField("htePoNumber", "HTE P.O. Number:")}
            </div>
          </div>
        </div>

        <div className="oc-addr">
          <div>
            <label htmlFor="oc-billTo">BILL TO:</label>
            <textarea id="oc-billTo" className="df-input" rows={5} value={oc.billTo} onChange={set("billTo")} />
          </div>
          <div>
            <label htmlFor="oc-shipTo">SHIP TO:</label>
            <textarea id="oc-shipTo" className="df-input" rows={5} value={oc.shipTo} onChange={set("shipTo")} />
          </div>
        </div>

        <div className="oc-split">
          <div className="oc-srow">
            <div><label htmlFor="oc-shipVia">SHIP VIA:</label><input id="oc-shipVia" className="df-input" value={oc.shipVia} onChange={set("shipVia")} /></div>
            <div><label htmlFor="oc-terms">TERMS:</label><input id="oc-terms" className="df-input" value={oc.terms} onChange={set("terms")} /></div>
          </div>
          <div className="oc-srow fill">
            <div>
              <label htmlFor="oc-freightTerms">FREIGHT TERMS:</label>
              <select id="oc-freightTerms" className="df-input" value={oc.freightTerms} onChange={set("freightTerms")} style={{ width: "8em" }}>
                <option value="">Select…</option>
                {FREIGHT_TERMS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div><label htmlFor="oc-estShipDate">ESTIMATED SHIP DATE:</label><input id="oc-estShipDate" type="date" className="df-input" value={oc.estShipDate} onChange={set("estShipDate")} style={{ width: "11em" }} /></div>
          </div>
        </div>

        <LineItemsTable rows={rows} setRows={setRows} prefix="oc"
          order={["pn", "description", "qty", "price", "total"]}
          labels={{ pn: "PART NUMBER", description: "DESCRIPTION", qty: "QUANTITY", price: "AMOUNT", total: "TOTAL" }} />

        <div className="oc-due">
          <div className="oc-due-row"><span>TOTAL DUE</span><span>{money(sumRows(oc.rows))}</span></div>
          <div className="oc-tax">Sales Tax Not Included</div>
        </div>

        <div className="oc-footer">
          <div>{OC_THANKS}</div>
          <div>{OC_FOOTER}</div>
        </div>
      </div>

      <div className="df-actions bottom">
        <button type="button" className="df-btn primary" onClick={generate} disabled={busy}>{busy ? "Making PDF…" : "Generate Order Confirmation PDF"}</button>
      </div>
    </div>
  );
}
