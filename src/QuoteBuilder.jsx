import React, { useState } from "react";
import { jsPDF } from "jspdf";
import leftLogo from "./assets/leftLogo.jpeg";
import rightLogo from "./assets/rightLogo.png";

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

  const generateQuoteNumber = () => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(-2);
    const random = Math.floor(Math.random() * 90) + 10;
    return `Q${mm}${dd}${yy}${random}`;
  };

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

  const drawHeader = (doc, quoteNumber) => {
    const leftLogoX = 14;
    const leftLogoY = 10;
    const leftLogoW = 60;
    const leftLogoH = 30;

    const rightLogoX = 110;
    const rightLogoY = 15;
    const rightLogoW = 90;
    const rightLogoH = 30;

    try {
      doc.addImage(leftLogo, "JPEG", leftLogoX, leftLogoY, leftLogoW, leftLogoH);
    } catch (e) {}

    try {
      doc.addImage(rightLogo, "PNG", rightLogoX, rightLogoY, rightLogoW, rightLogoH);
    } catch (e) {
      console.error("Right logo failed to load", e);
    }

    // calculate bottom of logos
    const logosBottom = Math.max(
      leftLogoY + leftLogoH,
      rightLogoY + rightLogoH
    );

    let y = logosBottom + 10;

    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text("QUOTE", 105, y, { align: "center" });

    y += 10;

    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text(`Quote #: ${quoteNumber}`, 14, y);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, y + 6);

    y += 18;

    doc.text(`Company: ${company}`, 14, y);
    doc.text(`Attn: ${attn}`, 14, y + 6);
    doc.text(`Email: ${email}`, 14, y + 12);

    y += 26;

    doc.setFont(undefined, "bold");
    doc.text("Line", 14, y);
    doc.text("Part Number", 26, y);
    doc.text("Description", 65, y);
    doc.text("Qty", 148, y, { align: "center" });
    doc.text("Unit Price", 162, y, { align: "center" });
    doc.text("Total", 196, y, { align: "right" });

    y += 4;
    doc.line(14, y, 196, y);

    return y + 8;
  };

  const generatePDF = () => {
    const quoteNumber = generateQuoteNumber();
    const doc = new jsPDF();

    let y = drawHeader(doc, quoteNumber);

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
        y = drawHeader(doc, quoteNumber);
        doc.setFont(undefined, "normal");
        doc.setFontSize(10);
      }

      doc.text(String(item), 14, y);
      doc.text(r.pn || "", 26, y);
      doc.text(descLines, 65, y);
      doc.text(String(qty), 148, y, { align: "center" });
      doc.text(`$${unit.toFixed(2)}`, 162, y, { align: "center" });
      doc.text(`$${total.toFixed(2)}`, 196, y, { align: "right" });

      y += rowHeight;
      item++;
    });

    y += 4;
    doc.line(120, y, 196, y);

    y += 8;

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 196, y, { align: "right" });

    y += 12;

    doc.setFontSize(10);
    doc.setFont(undefined, "italic");
    doc.text("Freight and applicable sales tax not included.", 14, y);

    // y += 5;
    // doc.text("Pricing valid for 30 days.", 14, y);

    y += 10;

    doc.setFont(undefined, "normal");
    doc.text("Prepared by Hazel Caling", 14, y);

    doc.save(`Quote_${quoteNumber}.pdf`);

    const subject = `Quote ${quoteNumber}`;

    const body = `Hello,

Please see attached quote.

Thank you`;

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

              <td>${toNumber(row.sellPrice).toFixed(2)}</td>

              <td>
                <input
                  type="number"
                  value={row.qty}
                  onChange={(e) => updateRow(index, "qty", e.target.value)}
                  style={{ width: "60px" }}
                />
              </td>

              <td>
                ${(toNumber(row.qty, 1) * toNumber(row.sellPrice)).toFixed(2)}
              </td>

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

      <h3>Subtotal: ${subtotal.toFixed(2)}</h3>

      <button onClick={generatePDF}>Generate Quote</button>
    </div>
  );
}

export default QuoteBuilder;