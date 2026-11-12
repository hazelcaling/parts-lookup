// PDF layout for the Purchase Order and Order Confirmation forms (jsPDF, letter, mm).
// Pure module (no React, no asset imports) so the same drawing code runs in the
// browser and in scripts/sample-forms-pdf.mjs.
import { money } from "../utils/money.js";

export const FILL = [217, 223, 225]; // #D9DFE1
const LINE = [150, 160, 165];
const TEXT = [33, 37, 41];
const RED = [204, 0, 0];
const YELLOW = [255, 242, 0];
const PAGE_W = 215.9;
const PAGE_H = 279.4;
const M = 12.7; // 0.5 in margins
const CW = PAGE_W - 2 * M;
const BOTTOM = PAGE_H - M - 6; // keep room for the page number
const PT = 0.3528; // mm per point

export const HTEC = {
  name: "Heat Transfer Equipment Company, Inc.",
  street: "175 Harvard Avenue",
  streetShort: "175 Harvard Ave.",
  cityLine: "Half Moon Bay, CA 94019",
  phonePO: "PH: (650) 873-4353",
  phoneOC: "Phone: (650)873-4353",
  web: "www.htecompany.com",
};
export const PO_DEFAULT_NOTES =
  "Please ensure the Job Name, Customer PO#, and Attention appear on all correspondence, packing slips, and bills of lading.";
export const OC_THANKS = "THANK YOU FOR YOUR BUSINESS!";
export const OC_FOOTER =
  "If you discover an error or have any questions regarding your order, please contact your sales associate immediately to rectify any issue or concern. Otherwise, the above order is considered accurate and will be shipped accordingly.";
export const FREIGHT_TERMS = ["FOB", "FFA"];

// ---------- numbers / dates ----------
export const num = (v, d = 0) => {
  const n = parseFloat(String(v ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : d;
};
const round2 = (n) => Math.round(n * 100) / 100;
export const lineQty = (row) => (String(row?.qty ?? "").trim() === "" ? 1 : num(row.qty));
export const lineTotal = (row) => round2(lineQty(row) * num(row?.price));
export const isBlankRow = (row) =>
  !String(row?.pn || "").trim() && !String(row?.description || "").trim() && !String(row?.price ?? "").trim();
export const usedRows = (rows) => (rows || []).filter((r) => !isBlankRow(r));
export const sumRows = (rows) => round2(usedRows(rows).reduce((s, r) => s + lineTotal(r), 0));
export const fmtMultiplier = (v) => {
  if (String(v ?? "").trim() === "") return "1.00";
  const n = num(v, 1);
  const s = String(n);
  return (s.split(".")[1] || "").length > 2 ? s : n.toFixed(2);
};
export const multiplierOf = (v) => (String(v ?? "").trim() === "" ? 1 : num(v, 1));
export const poTotals = (po) => {
  const listTotal = sumRows(po.rows);
  return { listTotal, multiplier: multiplierOf(po.multiplier), subtotal: round2(listTotal * multiplierOf(po.multiplier)) };
};
const fmtQty = (row) => {
  const s = String(row?.qty ?? "").trim();
  return s === "" ? "1" : String(num(s));
};

// Today's date in Hazel's time zone, like 11/2/2026
export const todayLA = (d = new Date()) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "numeric", day: "numeric", year: "numeric" }).format(d);
// "2026-11-25" (date input) -> "11/25/2026"; anything else is shown as typed
export const formatDateUS = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || "").trim());
  return m ? `${Number(m[2])}/${Number(m[3])}/${m[1]}` : String(v || "").trim();
};
export const safeFilePart = (s) => String(s || "").trim().replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
export const isoToday = (d = new Date()) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
};

// ---------- rich text (Special Instructions) ----------
// lines: [[{ text, b, r, h }]]  b = bold, r = red, h = yellow highlight
export const richIsEmpty = (lines) => !(lines || []).some((l) => (l || []).some((r) => String(r.text || "").trim()));
export const richFromText = (text) => String(text || "").split("\n").map((t) => (t ? [{ text: t }] : []));

const setFont = (doc, bold, italic = false) =>
  doc.setFont("helvetica", bold && italic ? "bolditalic" : bold ? "bold" : italic ? "italic" : "normal");

// Word-wrap styled runs to a width; returns visual lines of measured segments
export function wrapRich(doc, lines, width) {
  const out = [];
  for (const line of lines || []) {
    let cur = [];
    let curW = 0;
    let contd = false; // current visual line continues a wrapped line
    const same = (a, b) => !!a.b === !!b.b && !!a.r === !!b.r && !!a.h === !!b.h;
    const push = () => {
      while (cur.length && /^\s+$/.test(cur[cur.length - 1].text)) curW -= cur.pop().w;
      const merged = [];
      for (const s of cur) {
        const last = merged[merged.length - 1];
        if (last && same(last, s)) { last.text += s.text; last.w += s.w; } else merged.push({ ...s });
      }
      out.push(merged);
      cur = [];
      curW = 0;
    };
    const measure = (t, b) => { setFont(doc, b); return doc.getTextWidth(t); };
    const tokens = [];
    for (const run of line || []) {
      for (const t of String(run.text || "").replace(/\t/g, "    ").split(/(\s+)/)) if (t) tokens.push({ text: t, b: !!run.b, r: !!run.r, h: !!run.h });
    }
    if (!tokens.length) { out.push([]); continue; }
    for (const tok of tokens) {
      const space = /^\s+$/.test(tok.text);
      if (space && !cur.length && contd) continue;
      let w = measure(tok.text, tok.b);
      if (curW + w > width && cur.length) {
        push();
        contd = true;
        if (space) continue;
      }
      if (w > width) { // one very long word: break it by characters
        let s = tok.text;
        while (s) {
          let i = s.length;
          while (i > 1 && curW + measure(s.slice(0, i), tok.b) > width) i--;
          const piece = s.slice(0, i);
          cur.push({ ...tok, text: piece, w: measure(piece, tok.b) });
          curW += cur[cur.length - 1].w;
          s = s.slice(i);
          if (s) { push(); contd = true; }
        }
        continue;
      }
      cur.push({ ...tok, w });
      curW += w;
    }
    push();
  }
  // drop trailing empty lines
  while (out.length && !out[out.length - 1].length) out.pop();
  return out;
}

export function drawRich(doc, vlines, x, y, lineH, fontSize) {
  doc.setFontSize(fontSize);
  for (const vl of vlines) {
    let cx = x;
    for (const seg of vl) {
      if (seg.h) {
        doc.setFillColor(...YELLOW);
        doc.rect(cx, y - fontSize * PT * 0.82, seg.w, fontSize * PT * 1.12, "F");
      }
      setFont(doc, seg.b);
      doc.setTextColor(...(seg.r ? RED : TEXT));
      doc.text(seg.text, cx, y);
      cx += seg.w;
    }
    y += lineH;
  }
  doc.setTextColor(...TEXT);
  setFont(doc, false);
  return y;
}

// ---------- small drawing helpers ----------
const str = (v) => String(v ?? "").trim();
function addLogo(doc, logo, x, y, w) {
  if (!logo) return 0;
  try {
    const p = doc.getImageProperties(logo);
    const h = (w * p.height) / p.width;
    doc.addImage(logo, "PNG", x, y, w, h);
    return h;
  } catch (e) {
    console.error("logo failed to load", e);
    return 0;
  }
}
// "Label:  value" with the value wrapped to maxW; returns height used
function labelValue(doc, label, value, x, y, maxW, { size = 10, step = 6.4, lineH = 4.4 } = {}) {
  doc.setFontSize(size);
  setFont(doc, true);
  doc.setTextColor(...TEXT);
  doc.text(label, x, y);
  const lw = doc.getTextWidth(label) + 2;
  setFont(doc, false);
  const v = str(value);
  if (!v) return step;
  const lines = doc.splitTextToSize(v, Math.max(maxW - lw, 20));
  doc.text(lines, x + lw, y, { lineHeightFactor: lineH / (size * PT) });
  return step + (lines.length - 1) * lineH;
}
function hline(doc, x1, x2, y, w = 0.25, color = LINE) {
  doc.setDrawColor(...color);
  doc.setLineWidth(w);
  doc.line(x1, y, x2, y);
}
function addPageNumbers(doc) {
  const n = doc.getNumberOfPages();
  if (n < 2) return;
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    setFont(doc, false);
    doc.setTextColor(110, 110, 110);
    doc.text(`Page ${i} of ${n}`, PAGE_W / 2, PAGE_H - M + 2, { align: "center" });
  }
  doc.setTextColor(...TEXT);
}
const cellText = (doc, text, col, x, y, pad) => {
  const tx = col.align === "right" ? x + col.w - pad : col.align === "center" ? x + col.w / 2 : x + pad;
  doc.text(text, tx, y, { align: col.align || "left" });
};

// ---------- table (shared) ----------
// opts: cols [{label, w, align, value(row) -> string, wrap}], grid (vertical lines),
// banded, minRows, size, onNewPage(doc) -> y
function drawTable(doc, rows, y, opts) {
  const { cols, grid, banded, minRows = 0, size = 9.5, headerSize = size, pad = 1.8, onNewPage, headerH = 7 } = opts;
  const lineH = size * PT * 1.25;
  const header = (yy) => {
    doc.setFillColor(...FILL);
    doc.rect(M, yy, CW, headerH, "F");
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.25);
    if (grid) doc.rect(M, yy, CW, headerH, "S");
    else { hline(doc, M, M + CW, yy, 0.35, [60, 60, 60]); hline(doc, M, M + CW, yy + headerH, 0.35, [60, 60, 60]); }
    doc.setFontSize(headerSize);
    setFont(doc, true);
    doc.setTextColor(...TEXT);
    let x = M;
    for (const c of cols) {
      if (grid && x > M) doc.line(x, yy, x, yy + headerH);
      cellText(doc, c.label, { ...c, align: c.headerAlign || c.align }, x, yy + headerH / 2 + headerSize * PT * 0.35, pad + 0.6);
      x += c.w;
    }
    return yy + headerH;
  };
  y = header(y);
  const list = [...rows];
  while (list.length < minRows) list.push(null);
  list.forEach((row, i) => {
    doc.setFontSize(size);
    setFont(doc, false);
    const cells = cols.map((c) => {
      const v = row ? str(c.value(row)) : "";
      return c.wrap ? (v ? doc.splitTextToSize(v, c.w - 2 * pad) : [""]) : [v];
    });
    const n = Math.max(...cells.map((c) => c.length), 1);
    const h = Math.max(n * lineH + 2.8, 6.4);
    if (y + h > BOTTOM) {
      if (!row) return; // don't start a page just for blank filler rows
      doc.addPage();
      y = header(onNewPage(doc));
      doc.setFontSize(size);
      setFont(doc, false);
    }
    if (banded && i % 2 === 0) { doc.setFillColor(...FILL); doc.rect(M, y, CW, h, "F"); }
    doc.setTextColor(...TEXT);
    let x = M;
    cols.forEach((c, ci) => {
      doc.text(cells[ci], c.align === "right" ? x + c.w - pad : c.align === "center" ? x + c.w / 2 : x + pad,
        y + 1.4 + size * PT * 0.95, { align: c.align || "left", lineHeightFactor: 1.25 });
      x += c.w;
    });
    if (grid) {
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.25);
      doc.rect(M, y, CW, h, "S");
      let gx = M;
      for (const c of cols.slice(0, -1)) { gx += c.w; doc.line(gx, y, gx, y + h); }
    }
    y += h;
  });
  return y;
}

// ---------- Purchase Order ----------
function poContinuationHeader(doc, po) {
  let y = M + 4;
  doc.setFontSize(12);
  setFont(doc, true);
  doc.setTextColor(...TEXT);
  doc.text("PURCHASE ORDER", M, y);
  setFont(doc, false);
  doc.setFontSize(10);
  const right = [str(po.poNumber) && `PO #: ${str(po.poNumber)}`, str(po.date) && `Date: ${str(po.date)}`].filter(Boolean).join("     ");
  if (right) doc.text(right, PAGE_W - M, y, { align: "right" });
  hline(doc, M, PAGE_W - M, y + 3);
  return y + 8;
}

export function drawPurchaseOrder(doc, po, { logo } = {}) {
  doc.setTextColor(...TEXT);
  // Logo, centered title, address
  const lh = addLogo(doc, logo, (PAGE_W - 58) / 2, 9, 58);
  let y = 9 + lh + 8;
  doc.setFontSize(20);
  setFont(doc, true);
  doc.setTextColor(51, 51, 51);
  doc.text("PURCHASE ORDER", PAGE_W / 2, y, { align: "center" });
  doc.setTextColor(...TEXT);
  doc.setFontSize(10);
  setFont(doc, false);
  y += 6;
  doc.text(`${HTEC.street}, ${HTEC.cityLine}`, PAGE_W / 2, y, { align: "center" });
  y += 5;
  doc.text(HTEC.phonePO, PAGE_W / 2, y, { align: "center" });

  // Date (right)
  y += 11;
  doc.setFontSize(11);
  setFont(doc, true);
  doc.text(`Date: ${str(po.date)}`, PAGE_W - M, y, { align: "right" });

  // Two columns of fields
  y += 11;
  const lx = M + 1;
  const rx = M + CW * 0.505;
  const lW = rx - lx - 5;
  const rW = PAGE_W - M - rx;
  let ly = y;
  ly += labelValue(doc, "Order To:", po.orderTo, lx, ly, lW);
  ly += labelValue(doc, "Purchase Order #:", po.poNumber, lx, ly, lW);
  ly += labelValue(doc, "Ordered By:", po.orderedBy, lx, ly, lW);
  ly += labelValue(doc, "Freight Terms:", po.freightTerms, lx, ly, lW);

  let ry = y;
  ry += labelValue(doc, "Ship To:", po.shipTo, rx, ry, rW);
  ry += labelValue(doc, "Address:", po.address, rx, ry, rW);
  ry += labelValue(doc, "City / State / Zip:", po.cityStateZip, rx, ry, rW);
  ry += labelValue(doc, "Attention:", po.attention, rx, ry, rW);
  ry += labelValue(doc, "Delivery Ref (Customer PO#):", po.deliveryRef, rx, ry, rW);
  ry += labelValue(doc, "Job Name:", po.jobName, rx, ry, rW);
  ry += labelValue(doc, "Ship Via:", po.shipVia, rx, ry, rW);
  // Special Instructions: label on its own line, text below it (about 4 lines reserved)
  doc.setFontSize(10);
  setFont(doc, true);
  doc.text("Special Instructions:", rx, ry);
  ry += 5.2;
  const siLineH = 4.6;
  const vlines = wrapRich(doc, po.special, rW);
  drawRich(doc, vlines, rx, ry, siLineH, 10);
  ry += Math.max(vlines.length, 4) * siLineH;

  y = Math.max(ly, ry) + 4;

  // Line items
  const W = (f) => (CW * f) / 762;
  const cols = [
    { label: "Qty", w: W(55), align: "center", value: fmtQty },
    { label: "Part #", w: W(113), align: "center", value: (r) => r.pn, wrap: true },
    { label: "Description", w: W(354), align: "left", value: (r) => r.description, wrap: true },
    { label: "List Price", w: W(120), align: "right", value: (r) => money(num(r.price)) },
    { label: "Total", w: W(120), align: "right", value: (r) => money(lineTotal(r)) },
  ];
  const cont = () => poContinuationHeader(doc, po);
  y = drawTable(doc, usedRows(po.rows), y, { cols, grid: true, size: 9.5, headerSize: 10, onNewPage: cont });

  // Totals box (lower right)
  const t = poTotals(po);
  const boxW = W(240);
  const bx = PAGE_W - M - boxW;
  const rowH = 7.4;
  y += 9;
  if (y + rowH * 3 > BOTTOM) { doc.addPage(); y = cont(); }
  const totals = [["List Total", money(t.listTotal)], ["Multiplier", fmtMultiplier(po.multiplier)], ["Subtotal", money(t.subtotal)]];
  totals.forEach(([label, value], i) => {
    const yy = y + i * rowH;
    if (i === 2) { doc.setFillColor(...FILL); doc.rect(bx, yy, boxW, rowH, "F"); }
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.25);
    doc.rect(bx, yy, boxW, rowH, "S");
    doc.line(bx + boxW / 2, yy, bx + boxW / 2, yy + rowH);
    doc.setFontSize(10);
    setFont(doc, true);
    doc.text(label, bx + boxW / 2 - 2, yy + rowH / 2 + 1.3, { align: "right" });
    doc.text(value, bx + boxW - 2, yy + rowH / 2 + 1.3, { align: "right" });
  });
  y += rowH * 3 + 13;

  // Notes
  const notes = str(po.notes);
  doc.setFontSize(9.5);
  setFont(doc, false);
  const noteLines = notes ? doc.splitTextToSize(notes, CW) : [];
  if (y + 6 + noteLines.length * 4.6 > BOTTOM) { doc.addPage(); y = cont() + 4; }
  doc.setFontSize(10);
  setFont(doc, true);
  doc.text("Notes:", M, y);
  doc.setFontSize(9.5);
  setFont(doc, false);
  if (noteLines.length) doc.text(noteLines, M, y + 5.5, { lineHeightFactor: 4.6 / (9.5 * PT) });

  addPageNumbers(doc);
  return doc;
}

// ---------- Order Confirmation ----------
function ocContinuationHeader(doc, oc) {
  let y = M + 4;
  doc.setFontSize(12);
  setFont(doc, false);
  doc.setTextColor(75, 90, 96);
  doc.text("Order Confirmation", M, y);
  doc.setTextColor(...TEXT);
  doc.setFontSize(9.5);
  const right = [str(oc.poNumber) && `P.O. Number: ${str(oc.poNumber)}`, str(oc.date) && `Date: ${str(oc.date)}`].filter(Boolean).join("     ");
  if (right) doc.text(right, PAGE_W - M, y, { align: "right" });
  hline(doc, M, PAGE_W - M, y + 3);
  return y + 8;
}

export function drawOrderConfirmation(doc, oc, { logo } = {}) {
  doc.setTextColor(...TEXT);
  const logoW = 68;
  const lh = addLogo(doc, logo, M, 8, logoW) || 24;

  // Title (top right), shrunk if ever needed so it never clips
  let ts = 30;
  doc.setFontSize(ts);
  setFont(doc, false);
  while (doc.getTextWidth("Order Confirmation") > CW - logoW - 6 && ts > 16) doc.setFontSize(--ts);
  doc.setTextColor(75, 90, 96);
  doc.text("Order Confirmation", PAGE_W - M, 8 + ts * PT * 0.95, { align: "right" });
  doc.setTextColor(...TEXT);

  // Company block under the logo
  let cy = 8 + lh + 6.5;
  doc.setFontSize(10);
  setFont(doc, false);
  doc.text(HTEC.streetShort, M, cy);
  doc.text(HTEC.cityLine, M, cy + 5.2);
  doc.text(HTEC.phoneOC, M, cy + 10.4);
  doc.textWithLink(HTEC.web, M, cy + 15.4, { url: `https://${HTEC.web}` });
  hline(doc, M, M + doc.getTextWidth(HTEC.web), cy + 16.1, 0.2, TEXT);
  cy += 15.4;

  // Header fields (right): shaded label cells, value beside
  const labX = 108;
  const labW = 44;
  const valX = labX + labW;
  const valW = PAGE_W - M - valX;
  let fy = 8 + lh - 1.5;
  const fields = [["Job Name:", oc.jobName], ["P.O. Number:", oc.poNumber], ["DATE:", oc.date], ["HTE P.O. Number:", oc.htePoNumber]];
  for (const [label, value] of fields) {
    doc.setFontSize(10);
    setFont(doc, false);
    const lines = str(value) ? doc.splitTextToSize(str(value), valW - 3) : [""];
    const h = Math.max(6, lines.length * 4.4 + 1.6);
    doc.setFillColor(...FILL);
    doc.rect(labX, fy, labW, h, "F");
    hline(doc, valX, PAGE_W - M, fy + h);
    setFont(doc, true);
    doc.text(label, valX - 2, fy + 4.2, { align: "right" });
    setFont(doc, false);
    doc.text(lines, valX + 2, fy + 4.2, { lineHeightFactor: 4.4 / (10 * PT) });
    fy += h + 0.8;
  }

  // BILL TO / SHIP TO
  let y = Math.max(cy, fy) + 9;
  const billX = M + 20;
  const shipX = 124;
  doc.setFontSize(10.5);
  setFont(doc, true);
  doc.text("BILL TO:", billX, y);
  doc.text("SHIP TO:", shipX, y);
  doc.setFontSize(10);
  setFont(doc, false);
  const bill = str(oc.billTo) ? doc.splitTextToSize(str(oc.billTo), shipX - billX - 6) : [];
  const ship = str(oc.shipTo) ? doc.splitTextToSize(str(oc.shipTo), PAGE_W - M - shipX) : [];
  const addrLH = 4.8;
  if (bill.length) doc.text(bill, billX, y + 6, { lineHeightFactor: addrLH / (10 * PT) });
  if (ship.length) doc.text(ship, shipX, y + 6, { lineHeightFactor: addrLH / (10 * PT) });
  y += 6 + Math.max(bill.length, ship.length, 5) * addrLH + 3;

  // SHIP VIA | TERMS, FREIGHT TERMS | ESTIMATED SHIP DATE
  const rowH = 5.6;
  const splitRow = (yy, l1, v1, l2, v2, fill) => {
    if (fill) { doc.setFillColor(...FILL); doc.rect(M, yy, CW, rowH, "F"); }
    doc.setFontSize(8.5);
    const base = yy + rowH / 2 + 1.1;
    setFont(doc, true);
    doc.text(l1, M + 1, base);
    let w = doc.getTextWidth(l1) + 1.5;
    setFont(doc, false);
    doc.text(str(v1), M + 1 + w, base);
    setFont(doc, true);
    doc.text(l2, shipX, base);
    w = doc.getTextWidth(l2) + 1.5;
    setFont(doc, false);
    doc.text(str(v2), shipX + w, base);
  };
  hline(doc, M, PAGE_W - M, y, 0.35, [60, 60, 60]);
  splitRow(y, "SHIP VIA:", oc.shipVia, "TERMS:", oc.terms, false);
  hline(doc, M, PAGE_W - M, y + rowH, 0.35, [60, 60, 60]);
  splitRow(y + rowH, "FREIGHT TERMS:", oc.freightTerms, "ESTIMATED SHIP DATE:", formatDateUS(oc.estShipDate), true);
  hline(doc, M, PAGE_W - M, y + rowH * 2, 0.35, [60, 60, 60]);
  y += rowH * 2 + 6;

  // Line items
  const cols = [
    { label: "PART NUMBER", w: 40, align: "left", value: (r) => r.pn, wrap: true },
    { label: "DESCRIPTION", w: 78, align: "left", value: (r) => r.description, wrap: true },
    { label: "QUANTITY", w: 23, align: "center", value: fmtQty },
    { label: "AMOUNT", w: 24.5, align: "right", value: (r) => money(num(r.price)) },
    { label: "TOTAL", w: CW - 40 - 78 - 23 - 24.5, align: "right", value: (r) => money(lineTotal(r)) },
  ];
  const cont = () => ocContinuationHeader(doc, oc);
  y = drawTable(doc, usedRows(oc.rows), y, { cols, grid: false, banded: true, minRows: 8, size: 9, headerSize: 8.5, headerH: 6, onNewPage: cont });

  // TOTAL DUE
  if (y + 30 > BOTTOM) { doc.addPage(); y = cont(); }
  hline(doc, M, PAGE_W - M, y, 0.35, [60, 60, 60]);
  const totalX = PAGE_W - M - cols[4].w;
  doc.setFontSize(9.5);
  setFont(doc, true);
  doc.text("TOTAL DUE", totalX - 4, y + 4.4, { align: "right" });
  doc.text(money(sumRows(oc.rows)), PAGE_W - M - 1.8, y + 4.4, { align: "right" });
  hline(doc, M, PAGE_W - M, y + 6.2, 0.35, [60, 60, 60]);
  doc.setFontSize(8);
  doc.text("Sales Tax Not Included", PAGE_W - M - 1.8, y + 10.2, { align: "right" });
  y += 17;

  // Footer
  doc.setFontSize(9.5);
  setFont(doc, false, true);
  const foot = doc.splitTextToSize(OC_FOOTER, CW - 10);
  if (y + 5 + foot.length * 4.6 > BOTTOM) { doc.addPage(); y = cont() + 4; }
  doc.text(OC_THANKS, M, y);
  doc.text(foot, M, y + 4.8, { lineHeightFactor: 4.6 / (9.5 * PT) });
  setFont(doc, false);

  addPageNumbers(doc);
  return doc;
}

export const poFileName = (po) => `PO_${safeFilePart(po.poNumber) || isoToday()}.pdf`;
export const ocFileName = (oc) => `Order_Confirmation_${safeFilePart(oc.htePoNumber || oc.poNumber) || isoToday()}.pdf`;
