import React, { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import { generateQuoteNumber, money, drawQuoteHeader } from "./utils/pdfHelpers";
import { useData } from "./DataContext";
import "./App.css";

function QuoteBuilder() {
  const { partsCatalog } = useData();
  const [company, setCompany] = useState("");
  const [attn, setAttn] = useState("");
  const [email, setEmail] = useState("");

  const [rows, setRows] = useState([
    {
      pn: "",
      description: "",
      listPrice: 0,
      multiplier: 0.80,
      markup: 0,
      sellPrice: 0,
      qty: 1,
    },
  ]);

  // Autocomplete
  const [activeSuggestIndex, setActiveSuggestIndex] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const suggestRef = useRef(null);

  // Load items that were added from Annual Kit / Catalog
  useEffect(() => {
    const pending = JSON.parse(localStorage.getItem("pendingQuoteItems") || "[]");
    if (pending.length === 0) return;

    const newRows = pending.map((item) => ({
      pn: item.pn || "",
      description: item.description || "",
      listPrice: Number(item.price) || 0,
      multiplier: 1,
      markup: 0,
      sellPrice: Number(item.price) || 0,
      qty: Number(item.qty) || 1,
    }));

    setRows((prev) => {
      // If the first row is still empty, replace it
      if (prev.length === 1 && !prev[0].pn && !prev[0].description) {
        return newRows;
      }
      return [...prev, ...newRows];
    });

    // Clear so they don't keep re-adding
    localStorage.removeItem("pendingQuoteItems");
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target)) {
        setActiveSuggestIndex(null);
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  // ---------- Autocomplete ----------
  const handlePnChange = (index, value) => {
    updateRow(index, "pn", value.toUpperCase());

    if (value.length < 2) {
      setSuggestions([]);
      setActiveSuggestIndex(null);
      return;
    }

    const matches = partsCatalog
      .filter((item) =>
        String(item.partNumber || "")
          .toUpperCase()
          .includes(value.toUpperCase())
      )
      .slice(0, 8);

    setSuggestions(matches);
    setActiveSuggestIndex(index);
  };

  const selectSuggestion = (index, item) => {
    const updated = [...rows];
    updated[index].pn = item.partNumber || "";
    updated[index].description = item.description || "";
    updated[index].listPrice = Number(item.sellPrice) || 0;
    updated[index].multiplier = 1;
    updated[index].markup = 0;
    updated[index].sellPrice = Number(item.sellPrice) || 0;

    setRows(updated);
    setSuggestions([]);
    setActiveSuggestIndex(null);
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

  // ---------- PDF ----------
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

    let y = drawQuoteHeader(doc, { quoteNumber, company, attn, email });
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
        y = drawQuoteHeader(doc, { quoteNumber, company, attn, email });
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
    doc.text("Heat Transfer Equipment Company, Inc. | partsales@htecompany.com", 14, y);

    y += 6;
    doc.setFontSize(9);
    doc.text("If you have any questions, please feel free to reach out.", 14, y);

    const blob = doc.output("blob");
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank");

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `Quote_${quoteNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (email.trim()) {
      setTimeout(() => {
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(
          `Quote ${quoteNumber}`
        )}&body=${encodeURIComponent("Hello,\n\nPlease see the attached quote.\n\nThank you.")}`;
      }, 500);
    }

    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  };

  return (
    <div className="app-container">
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

      <table
        className="quote-table"
        border="1"
        style={{ borderCollapse: "collapse", width: "100%" }}
      >
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
              <td style={{ position: "relative" }} ref={activeSuggestIndex === index ? suggestRef : null}>
                <input
                  value={row.pn}
                  onChange={(e) => handlePnChange(index, e.target.value)}
                  onFocus={() => {
                    if (row.pn.length >= 2) handlePnChange(index, row.pn);
                  }}
                  autoComplete="off"
                />

                {activeSuggestIndex === index && suggestions.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "white",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      maxHeight: "220px",
                      overflowY: "auto",
                      zIndex: 50,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                  >
                    {suggestions.map((item, idx) => (
                      <div
                        key={`${item.partNumber}-${idx}`}
                        onClick={() => selectSuggestion(index, item)}
                        style={{
                          padding: "8px 10px",
                          cursor: "pointer",
                          borderBottom: "1px solid #eee",
                          fontSize: "13px",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f9ff")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                      >
                        <strong>{item.partNumber}</strong>
                        <div style={{ color: "#555", fontSize: "12px" }}>{item.description}</div>
                        <div style={{ color: "#059669", fontSize: "12px" }}>
                          {money(item.sellPrice || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </td>

              <td>
                <textarea
                  value={row.description}
                  rows={1}
                  style={{ width: "100%", resize: "none", overflow: "hidden" }}
                  onChange={(e) => {
                    updateRow(index, "description", e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                />
              </td>

              <td>
                <input
                  type="number"
                  value={row.listPrice}
                  onChange={(e) => updateRow(index, "listPrice", e.target.value)}
                />
              </td>

              <td>
                <input
                  type="number"
                  value={row.multiplier}
                  onChange={(e) => updateRow(index, "multiplier", e.target.value)}
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
                <button className="delete-btn" onClick={() => deleteRow(index)}>
                  X
                </button>
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