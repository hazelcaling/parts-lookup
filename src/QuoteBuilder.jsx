import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { generateQuoteNumber, money, drawQuoteHeader } from "./utils/pdfHelpers";

function QuoteBuilder() {
  const [company, setCompany] = useState("");
  const [attn, setAttn] = useState("");
  const [email, setEmail] = useState("");

  const [rows, setRows] = useState([
    {
      pn: "",
      description: "",
      listPrice: 0,
      multiplier: 1,
      markup: 0.2,
      sellPrice: 0,
      qty: 1,
    },
  ]);

  const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const updateRow = (index, field, value) => {
    const updated = [...rows];

    if (["listPrice", "multiplier", "markup", "qty"].includes(field)) {
      updated[index][field] = value === "" ? "" : Number(value);
    } else {
      updated[index][field] = value;
    }

    const lp = toNumber(updated[index].listPrice, 0);
    const mult = toNumber(updated[index].multiplier, 0);
    const mark = toNumber(updated[index].markup, 0);

    updated[index].sellPrice = Math.ceil(lp * mult * (1 + mark));

    setRows(updated);
  };

  const addRow = () => {
    setRows([
      ...rows,
      {
        pn: "",
        description: "",
        listPrice: 0,
        multiplier: 1,
        markup: 0.2,
        sellPrice: 0,
        qty: 1,
      },
    ]);
  };

  const deleteRow = (index) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const subtotal = rows.reduce(
    (sum, row) => sum + toNumber(row.sellPrice) * toNumber(row.qty, 1),
    0
  );

  const drawTableHeader = (doc, y) => {
    doc.setFont(undefined, "bold");
    doc.setFontSize(11);
    doc.text("Line", 14, y);
    doc.text("Part Number", 26, y);
    doc.text("Description", 65, y);
    doc.text("Qty", 148, y, { align: "center" });
    doc.text("Unit Price", 168, y, { align: "center" });
    doc.text("Total", 196, y, { align: "right" });

    y += 4;
    doc.line(14, y, 196, y);

    return y + 8;
  };

  const generatePDF = () => {
    const quoteNumber = generateQuoteNumber();
    const doc = new jsPDF();

    let y = drawQuoteHeader(doc, {
      quoteNumber,
      company,
      attn,
      email,
    });

    y = drawTableHeader(doc, y);

    doc.setFont(undefined, "normal");
    doc.setFontSize(10);

    let item = 1;

    rows.forEach((r) => {
      const unit = toNumber(r.sellPrice);
      const qty = toNumber(r.qty, 1);
      const total = unit * qty;

      const descLines = doc.splitTextToSize(r.description || "", 78);
      const rowHeight = Math.max(descLines.length * 5 + 2, 8);

      if (y + rowHeight > 265) {
        doc.addPage();

        y = drawQuoteHeader(doc, {
          quoteNumber,
          company,
          attn,
          email,
        });

        y = drawTableHeader(doc, y);

        doc.setFont(undefined, "normal");
        doc.setFontSize(10);
      }

      doc.text(String(item), 14, y);
      doc.text(r.pn || "", 26, y);
      doc.text(descLines, 65, y);
      doc.text(String(qty), 148, y, { align: "center" });
      doc.text(money(unit), 168, y, { align: "center" });
      doc.text(money(total), 196, y, { align: "right" });

      y += rowHeight;
      item++;
    });

    y += 4;
    doc.line(120, y, 196, y);

    y += 8;
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text(`Subtotal: ${money(subtotal)}`, 196, y, { align: "right" });

    y += 12;
    doc.setFontSize(10);
    doc.setFont(undefined, "italic");
    doc.text("Freight and applicable sales tax not included.", 14, y);

    y += 10;
    doc.setFont(undefined, "normal");
    doc.text("Prepared by Hazel Caling", 14, y);

    doc.save(`Quote_${quoteNumber}.pdf`);

    const subject = `Quote ${quoteNumber}`;
    const body = `Hello,

Please see the attached quote.

Thank you.`;

    if (email.trim()) {
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>Create Quote</h2>

      <input
        placeholder="Company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        style={{ marginRight: "10px" }}
      />

      <input
        placeholder="Attn"
        value={attn}
        onChange={(e) => setAttn(e.target.value)}
        style={{ marginRight: "10px" }}
      />

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br />
      <br />

      <table border="1" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>PN</th>
            <th>Description</th>
            <th>List Price</th>
            <th>Multiplier</th>
            <th>Markup</th>
            <th>Sell Price</th>
            <th>Qty</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td>
                <input
                  value={row.pn}
                  onChange={(e) => updateRow(index, "pn", e.target.value)}
                />
              </td>

              <td>
                <input
                  value={row.description}
                  onChange={(e) =>
                    updateRow(index, "description", e.target.value)
                  }
                />
              </td>

              <td>
                <input
                  type="number"
                  value={row.listPrice}
                  onChange={(e) =>
                    updateRow(index, "listPrice", e.target.value)
                  }
                />
              </td>

              <td>
                <input
                  type="number"
                  value={row.multiplier}
                  onChange={(e) =>
                    updateRow(index, "multiplier", e.target.value)
                  }
                />
              </td>

              <td>
                <input
                  type="number"
                  step="0.01"
                  value={row.markup}
                  onChange={(e) => updateRow(index, "markup", e.target.value)}
                />
              </td>

              <td>{money(toNumber(row.sellPrice))}</td>

              <td>
                <input
                  type="number"
                  value={row.qty}
                  onChange={(e) => updateRow(index, "qty", e.target.value)}
                  style={{ width: "60px" }}
                />
              </td>

              <td>{money(toNumber(row.qty, 1) * toNumber(row.sellPrice))}</td>

              <td>
                <button onClick={() => deleteRow(index)}>X</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <br />

      <button onClick={addRow}>Add Line Item</button>

      <br />
      <br />

      <h3>Subtotal: {money(subtotal)}</h3>

      <button onClick={generatePDF}>Generate Quote</button>
    </div>
  );
}

export default QuoteBuilder;