import test from "node:test";
import assert from "node:assert/strict";
import { jsPDF } from "jspdf";
import {
  drawPurchaseOrder, drawOrderConfirmation, poTotals, sumRows, lineTotal, wrapRich, formatDateUS, fmtMultiplier, todayLA,
} from "../src/forms/formPdf.js";

const rows = [
  { qty: "1", pn: "99547B", description: "OLD PN 99547 - 3/4 IN. ELEMENT BOLT (QTY of 6)", price: "26.00" },
  { qty: "2", pn: "103540", description: "BOILER GASKET KIT", price: "60.00" },
  { qty: "", pn: "", description: "", price: "" }, // blank row is ignored
];

test("PO totals match the sample (List Total x Multiplier)", () => {
  const t = poTotals({ rows, multiplier: "0.80" });
  assert.equal(t.listTotal, 146);
  assert.equal(t.subtotal, 116.8);
  assert.equal(poTotals({ rows, multiplier: "" }).subtotal, 146); // blank multiplier = 1
  assert.equal(fmtMultiplier(".8"), "0.80");
  assert.equal(lineTotal({ qty: "", price: "5" }), 5); // empty qty counts as 1
  assert.equal(sumRows(rows), 146);
});

test("dates", () => {
  assert.equal(formatDateUS("2026-11-25"), "11/25/2026");
  assert.equal(todayLA(new Date("2026-11-03T05:00:00Z")), "11/2/2026"); // still Nov 2 in California
});

test("special instructions wrap keeps bold/red/highlight runs", () => {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const lines = wrapRich(doc, [[{ text: "plain " }, { text: "bold red", b: true, r: true }], [], [{ text: "hl", h: true }]], 90);
  assert.equal(lines.length, 3);
  assert.deepEqual(lines[0].map((s) => [s.text, !!s.b, !!s.r]), [["plain ", false, false], ["bold red", true, true]]);
  assert.equal(lines[2][0].h, true);
  const long = wrapRich(doc, [[{ text: "word ".repeat(60), b: true }]], 90);
  assert.ok(long.length > 2);
});

test("PO and OC PDFs draw, with extra pages for many lines", () => {
  const many = Array.from({ length: 45 }, (_, i) => ({ qty: "1", pn: `P${i}`, description: "GASKET ".repeat(i % 4 ? 1 : 12), price: "10" }));
  for (const [draw, data] of [[drawPurchaseOrder, { rows, multiplier: "0.8", special: [] }], [drawOrderConfirmation, { rows, terms: "NET 30" }]]) {
    const one = new jsPDF({ unit: "mm", format: "letter" });
    draw(one, data);
    assert.equal(one.getNumberOfPages(), 1);
    const big = new jsPDF({ unit: "mm", format: "letter" });
    draw(big, { ...data, rows: many });
    assert.ok(big.getNumberOfPages() >= 2);
  }
});
