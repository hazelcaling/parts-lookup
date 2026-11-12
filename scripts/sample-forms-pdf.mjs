// Writes sample Purchase Order / Order Confirmation PDFs with the same drawing code the app uses.
// Usage: node scripts/sample-forms-pdf.mjs [outDir]   (default: ./sample-forms)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jsPDF } from "jspdf";
import { drawPurchaseOrder, drawOrderConfirmation, PO_DEFAULT_NOTES } from "../src/forms/formPdf.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.resolve(process.argv[2] || path.join(root, "sample-forms"));
fs.mkdirSync(outDir, { recursive: true });
const logo = "data:image/png;base64," + fs.readFileSync(path.join(root, "src/assets/htecLogo.png")).toString("base64");

const rows = [
  { qty: "1", pn: "99547B", description: "OLD PN 99547 - 3/4 IN. ELEMENT BOLT (QTY of 6)", price: "26.00" },
  { qty: "2", pn: "103540", description: "BOILER GASKET KIT", price: "60.00" },
];
export const samplePO = {
  date: "11/2/2026", orderTo: "Sussman", poNumber: "SUS872943HC", orderedBy: "Hazel Caling", freightTerms: "FOB",
  shipTo: "TAKEDA C/O VALLEN", address: "5067 West San Fernando Road", cityStateZip: "Los Angeles, CA 90039",
  attention: "Rene Ramirez, E1 System User TD", deliveryRef: "U-135699 / 31376", jobName: "", shipVia: "",
  special: [
    [{ text: "Call before delivery. " }, { text: "Dock closes at 2 PM.", b: true }],
    [{ text: "Do not substitute parts", r: true }, { text: " without approval." }],
    [{ text: "Include packing slip", h: true }, { text: " with " }, { text: "PO# on every box", b: true, r: true, h: true }, { text: "." }],
  ],
  rows, multiplier: "0.80", notes: PO_DEFAULT_NOTES,
};
export const sampleOC = {
  jobName: "", poNumber: "U-135699 / 31376", date: "11/2/2026", htePoNumber: "SUS872943HC",
  billTo: "TAKEDA C/O VALLEN\nAttn: Rene Ramirez, E1 System User TD",
  shipTo: "TAKEDA C/O VALLEN\n5067 West San Fernando Road\nLos Angeles, CA 90039\nAttn: Rene Ramirez, E1 System User TD",
  shipVia: "", terms: "NET 30", freightTerms: "FOB", estShipDate: "", rows,
};

const write = (name, draw, data) => {
  const doc = new jsPDF({ unit: "mm", format: "letter", compress: true });
  draw(doc, data, { logo });
  fs.writeFileSync(path.join(outDir, name), Buffer.from(doc.output("arraybuffer")));
  console.log("wrote", path.join(outDir, name));
};
write("sample-po.pdf", drawPurchaseOrder, samplePO);
write("sample-oc.pdf", drawOrderConfirmation, sampleOC);
if (process.env.LONG) {
  const many = Array.from({ length: 40 }, (_, i) => ({ qty: String(i % 3 + 1), pn: `P${1000 + i}`, description: i % 5 ? "GASKET" : "VERY LONG DESCRIPTION ".repeat(6), price: String(10 + i) }));
  write("long-po.pdf", drawPurchaseOrder, { ...samplePO, rows: many });
  write("long-oc.pdf", drawOrderConfirmation, { ...sampleOC, rows: many });
}
