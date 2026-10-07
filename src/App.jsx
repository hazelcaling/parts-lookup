import React, { useEffect, useMemo, useState, useRef } from "react";
import { useData } from "./DataContext";
import { jsPDF } from "jspdf";
import {
  generateQuoteNumber,
  money,
  drawQuoteHeader,
} from "./utils/pdfHelpers";

function App() {
  const { partsData, partsCatalog } = useData();
  // ===== Annual Kit =====
  const [model, setModel] = useState("");
  const [annualResults, setAnnualResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [seriesName, setSeriesName] = useState("");
  const [searchedModel, setSearchedModel] = useState("");

  // ===== Catalog =====
  const [catalogSearch, setCatalogSearch] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [catalogPage, setCatalogPage] = useState(1);

  // ===== Create Quote form =====
  const [company, setCompany] = useState("");
  const [attn, setAttn] = useState("");
  const [modelField, setModelField] = useState("");
  const [serial, setSerial] = useState("");
  const [job, setJob] = useState("");

  const [rows, setRows] = useState([
    {
      pn: "",
      description: "",
      listPrice: 0,
      multiplier: 0.8,
      markup: 0,
      sellPrice: 0,
      qty: 1,
    },
  ]);

  // Autocomplete
  const [activeSuggestIndex, setActiveSuggestIndex] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const suggestRef = useRef(null);
  const quoteFormRef = useRef(null);

  // Close suggestions when clicking outside
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

  // ---------- Helpers ----------
  const normalizeModel = (value) => String(value || "").trim().toUpperCase();

  const splitModels = (value) =>
    normalizeModel(value)
      .split(/[\s,;/|]+/)
      .map((m) => m.trim())
      .filter(Boolean);

  const modelMatches = (itemModelValue, targetModel) => {
    const target = normalizeModel(targetModel);
    if (!target) return true;
    const itemModels = splitModels(itemModelValue);
    if (itemModels.length === 0) return false;
    return itemModels.includes(target);
  };

  const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  // ONE formula only
  const calcSellPrice = (listPrice, multiplier, markup) => {
    const lp = toNumber(listPrice, 0);
    const mult = toNumber(multiplier, 0);
    const mark = toNumber(markup, 0);
    return Math.ceil(lp * mult * (1 + mark));
  };

  // ---------- Annual Kit ----------
  const searchParts = () => {
    const modelKey = normalizeModel(model);
    let modelParts = [];
    let foundSeries = "";

    for (const series in partsData) {
      if (partsData[series][modelKey]) {
        modelParts = partsData[series][modelKey];
        foundSeries = series;
        break;
      }
    }

    const partsWithQty = modelParts.map((p) => ({
      ...p,
      qty: p.defaultQty || 1,
      selected: true,
      source: "annual-kit",
      model: modelKey,
      series: foundSeries,
    }));

    setAnnualResults(partsWithQty);
    setSeriesName(foundSeries);
    setSearchedModel(modelKey);
    setSearched(true);
  };

  const clearSearch = () => {
    setModel("");
    setAnnualResults([]);
    setSearched(false);
    setSeriesName("");
    setSearchedModel("");
  };

  const toggleAnnualItemSelected = (index) => {
    const updated = [...annualResults];
    updated[index].selected = !updated[index].selected;
    setAnnualResults(updated);
  };

  const toggleSelectAllAnnual = (checked) => {
    setAnnualResults(
      annualResults.map((item) => ({ ...item, selected: checked }))
    );
  };

  const updateAnnualQty = (index, value) => {
    const updated = [...annualResults];
    updated[index].qty = Number(value) || 1;
    setAnnualResults(updated);
  };

  const addSelectedAnnualToQuote = () => {
    const selected = annualResults.filter((item) => item.selected);
    if (selected.length === 0) {
      alert("Please select at least one annual kit item.");
      return;
    }

    const newRows = selected.map((item) => {
      const list = Number(item.price) || 0;
      return {
        pn: item.pn || "",
        description: item.description || "",
        listPrice: list,
        multiplier: 0.8,
        markup: 0,
        qty: Number(item.qty) || 1,
        sellPrice: calcSellPrice(list, 0.8, 0),
      };
    });

    setRows((prev) => {
      if (prev.length === 1 && !prev[0].pn && !prev[0].description) {
        return newRows;
      }
      return [...prev, ...newRows];
    });

    setTimeout(() => {
      quoteFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // ---------- Catalog ----------
  const uniqueSeries = useMemo(
    () =>
      [...new Set(partsCatalog.map((item) => item.series).filter(Boolean))].sort(),
    []
  );

  const uniqueSections = useMemo(
    () =>
      [...new Set(partsCatalog.map((item) => item.section).filter(Boolean))].sort(),
    []
  );

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    const normalizedModelFilter = normalizeModel(modelFilter);

    return partsCatalog.filter((item) => {
      const price = Number(item.listPrice || item.sellPrice) || 0;
      if (price <= 0) return false;

      const matchesSearch =
        !q ||
        String(item.partNumber || "").toLowerCase().includes(q) ||
        String(item.description || "").toLowerCase().includes(q) ||
        String(item.iplDescription || "").toLowerCase().includes(q) ||
        String(item.notes || "").toLowerCase().includes(q) ||
        String(item.callOut || "").toLowerCase().includes(q);

      const matchesSeries = !seriesFilter || item.series === seriesFilter;
      const matchesModel = !normalizedModelFilter
        ? true
        : modelMatches(item.model, normalizedModelFilter);
      const matchesSection = !sectionFilter || item.section === sectionFilter;

      return matchesSearch && matchesSeries && matchesModel && matchesSection;
    });
  }, [catalogSearch, seriesFilter, modelFilter, sectionFilter]);

  useEffect(() => {
    setCatalogPage(1);
  }, [catalogSearch, seriesFilter, modelFilter, sectionFilter]);

  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(filteredCatalog.length / pageSize));
  const pagedCatalog = filteredCatalog.slice(
    (catalogPage - 1) * pageSize,
    catalogPage * pageSize
  );

  const addCatalogItemToQuote = (item) => {
    const list = Number(item.listPrice || item.sellPrice) || 0;

    const newRow = {
      pn: item.partNumber || "",
      description: item.description || "",
      listPrice: list,
      multiplier: 0.8,
      markup: 0,
      qty: 1,
      sellPrice: calcSellPrice(list, 0.8, 0),
    };

    setRows((prev) => {
      if (prev.length === 1 && !prev[0].pn && !prev[0].description) {
        return [newRow];
      }
      return [...prev, newRow];
    });
  };

  // ---------- Create Quote form helpers ----------
  const updateRow = (index, field, value) => {
    const updated = [...rows];

    if (["listPrice", "multiplier", "markup", "qty"].includes(field)) {
      updated[index][field] = value === "" ? "" : Number(value);
    } else {
      updated[index][field] = value;
    }

    updated[index].sellPrice = calcSellPrice(
      updated[index].listPrice,
      updated[index].multiplier,
      updated[index].markup
    );

    setRows(updated);
  };

  const handlePnChange = (index, value) => {
    const upper = value.toUpperCase();
    updateRow(index, "pn", upper);

    if (upper.length < 2) {
      setSuggestions([]);
      setActiveSuggestIndex(null);
      return;
    }

    const seen = new Set();
    const matches = [];

    for (const item of partsCatalog) {
      const pn = String(item.partNumber || "").toUpperCase();
      const price = Number(item.listPrice || item.sellPrice) || 0;

      if (price <= 0) continue;
      if (!pn.includes(upper) || seen.has(pn)) continue;

      seen.add(pn);
      matches.push(item);
      if (matches.length >= 10) break;
    }

    setSuggestions(matches);
    setActiveSuggestIndex(index);
  };

  const selectSuggestion = (index, item) => {
    const list = Number(item.listPrice || item.sellPrice) || 0;

    const updated = [...rows];
    updated[index].pn = item.partNumber || "";
    updated[index].description = item.description || "";
    updated[index].listPrice = list;
    updated[index].multiplier = 0.8;
    updated[index].markup = 0;
    updated[index].qty = updated[index].qty || 1;
    updated[index].sellPrice = calcSellPrice(list, 0.8, 0);

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
        multiplier: 0.8,
        markup: 0,
        sellPrice: 0,
        qty: 1,
      },
    ]);
  };

  const deleteRow = (index) => {
    if (rows.length === 1) {
      setRows([
        {
          pn: "",
          description: "",
          listPrice: 0,
          multiplier: 0.8,
          markup: 0,
          sellPrice: 0,
          qty: 1,
        },
      ]);
    } else {
      setRows(rows.filter((_, i) => i !== index));
    }
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

    let y = drawQuoteHeader(doc, {
      quoteNumber,
      company,
      attn,
      model: modelField,
      serial,
      job,
    });

    y = drawTableHeader(doc, y);

    doc.setFont(undefined, "normal");
    doc.setFontSize(10);

    let item = 1;
    rows.forEach((r) => {
      if (!r.pn && !r.description) return;

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
          model: modelField,
          serial,
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
    doc.text(
      "Heat Transfer Equipment Company, Inc. | partsales@htecompany.com",
      14,
      y
    );

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

    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  };

  const allAnnualSelected =
    annualResults.length > 0 && annualResults.every((item) => item.selected);

  const scrollToQuoteForm = () => {
    quoteFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      style={{
        padding: "16px 20px 28px",
        fontFamily: "Arial, sans-serif",
        width: "100%",
        maxWidth: "1900px",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {/* ========== TWO COLUMN: Annual Kit + Catalog ========== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: "20px",
          alignItems: "start",
          width: "100%",
        }}
      >
        {/* LEFT - Annual Kit */}
        <div
          style={{
            width: "100%",
            minWidth: 0,
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "10px",
            padding: "18px",
            boxSizing: "border-box",
          }}
        >
          <button
            onClick={scrollToQuoteForm}
            style={{
              padding: "10px 18px",
              marginBottom: "16px",
              background: "#0ea5e9",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Create Quote
          </button>

          <h2 style={{ marginTop: 0, marginBottom: "16px" }}>Annual Kit Lookup</h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              searchParts();
            }}
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            <input
              type="text"
              placeholder="Enter model (ex: 1007 or 399B)"
              value={model}
              onChange={(e) => setModel(e.target.value.toUpperCase())}
              style={{
                padding: "10px 12px",
                minWidth: "220px",
                flex: "1 1 220px",
                boxSizing: "border-box",
              }}
            />
            <button type="submit" style={{ padding: "10px 16px" }}>
              Search
            </button>
            <button type="button" onClick={clearSearch} style={{ padding: "10px 16px" }}>
              Clear
            </button>
          </form>

          {searched && annualResults.length > 0 && (
            <>
              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "14px", color: "#666" }}>
                  Recommended Annual Kit
                </div>
                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: "700",
                    lineHeight: 1.1,
                    marginTop: "4px",
                    wordBreak: "break-word",
                  }}
                >
                  {seriesName} {searchedModel}
                </div>
              </div>

              <div style={{ overflowX: "auto", width: "100%" }}>
                <table
                  border="1"
                  cellPadding="8"
                  style={{
                    borderCollapse: "collapse",
                    width: "100%",
                    minWidth: "700px",
                    tableLayout: "fixed",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ width: "46px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={allAnnualSelected}
                          onChange={(e) => toggleSelectAllAnnual(e.target.checked)}
                        />
                      </th>
                      <th style={{ width: "50px" }}>Line</th>
                      <th style={{ width: "120px" }}>Part Number</th>
                      <th>Description</th>
                      <th style={{ width: "100px" }}>List Price</th>
                      <th style={{ width: "80px", textAlign: "center" }}>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {annualResults.map((part, index) => (
                      <tr
                        key={`${part.pn}-${index}`}
                        style={{ opacity: part.selected ? 1 : 0.55 }}
                      >
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={!!part.selected}
                            onChange={() => toggleAnnualItemSelected(index)}
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>{index + 1}</td>
                        <td>{part.pn}</td>
                        <td style={{ wordBreak: "break-word" }}>{part.description}</td>
                        <td>{money(part.price)}</td>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="number"
                            min="1"
                            value={part.qty}
                            onChange={(e) => updateAnnualQty(index, e.target.value)}
                            style={{ width: "55px", textAlign: "center" }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={addSelectedAnnualToQuote}
                style={{
                  marginTop: "14px",
                  padding: "10px 18px",
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Add Selected Annual Kit Items to Quote
              </button>
            </>
          )}

          {searched && annualResults.length === 0 && <p>No parts found</p>}
        </div>

        {/* RIGHT - Raypak IPL Parts */}
        <div
          style={{
            width: "100%",
            minWidth: 0,
            border: "1px solid #ddd",
            borderRadius: "10px",
            padding: "18px",
            background: "#fff",
            boxSizing: "border-box",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "16px", textAlign: "center" }}>
            Raypak IPL Parts
          </h2>

          <input
            type="text"
            placeholder="Search part number, description, IPL, notes, call out"
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              marginBottom: "12px",
              boxSizing: "border-box",
            }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr)",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <select
              value={seriesFilter}
              onChange={(e) => setSeriesFilter(e.target.value)}
              style={{ padding: "10px", minWidth: 0 }}
            >
              <option value="">All Series</option>
              {uniqueSeries.map((series) => (
                <option key={series} value={series}>
                  {series}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Filter model"
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value.toUpperCase())}
              style={{ padding: "10px", minWidth: 0, boxSizing: "border-box" }}
            />

            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              style={{ padding: "10px", minWidth: 0 }}
            >
              <option value="">All Sections</option>
              {uniqueSections.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: "13px", color: "#666", marginBottom: "10px" }}>
            Showing {pagedCatalog.length} of {filteredCatalog.length} items
          </div>

          <div
            style={{
              maxHeight: "620px",
              overflowY: "auto",
              overflowX: "auto",
              border: "1px solid #ddd",
              background: "white",
            }}
          >
            <table
              border="1"
              cellPadding="6"
              style={{
                borderCollapse: "collapse",
                width: "100%",
                minWidth: "680px",
                fontSize: "13px",
                tableLayout: "fixed",
              }}
            >
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  background: "#f3f3f3",
                  zIndex: 1,
                }}
              >
                <tr>
                  <th style={{ width: "65px" }}>Add</th>
                  <th style={{ width: "90px" }}>Part Number</th>
                  <th>Description</th>
                  <th style={{ width: "85px" }}>Model</th>
                  <th style={{ width: "95px" }}>List Price</th>
                </tr>
              </thead>
              <tbody>
                {pagedCatalog.map((item, index) => {
                  const globalIndex = (catalogPage - 1) * pageSize + index;
                  return (
                    <tr key={`${item.partNumber}-${globalIndex}`}>
                      <td style={{ textAlign: "center" }}>
                        <button
                          onClick={() => addCatalogItemToQuote(item)}
                          style={{
                            padding: "5px 10px",
                            background: "#059669",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          Add
                        </button>
                      </td>
                      <td>{item.partNumber}</td>
                      <td style={{ wordBreak: "break-word" }}>
                        <div>{item.description}</div>
                        {item.callOut && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#888",
                              marginTop: 3,
                              fontWeight: "bold",
                            }}
                          >
                            Call Out: {item.callOut}
                          </div>
                        )}
                        {item.iplDescription && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#666",
                              marginTop: 3,
                            }}
                          >
                            IPL: {item.iplDescription}
                          </div>
                        )}
                      </td>
                      <td>{item.model}</td>
                      <td>{money(item.listPrice || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "14px",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              <button
                onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                disabled={catalogPage === 1}
                style={{ padding: "8px 12px", marginRight: "8px" }}
              >
                Prev
              </button>
              <button
                onClick={() => setCatalogPage((p) => Math.min(totalPages, p + 1))}
                disabled={catalogPage === totalPages}
                style={{ padding: "8px 12px" }}
              >
                Next
              </button>
            </div>
            <div style={{ fontSize: "13px" }}>
              Page {catalogPage} of {totalPages}
            </div>
          </div>
        </div>
      </div>

      {/* ========== CREATE QUOTE FORM ========== */}
      <div
        ref={quoteFormRef}
        style={{
          marginTop: "32px",
          border: "1px solid #ddd",
          borderRadius: "10px",
          padding: "24px",
          background: "#fff",
          minHeight: "520px",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "16px" }}>Create Quote</h2>
<div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginBottom: "20px",
  }}
>
  <input
    placeholder="Company"
    value={company}
    onChange={(e) => setCompany(e.target.value)}
    style={{ padding: "10px", width: "100%", boxSizing: "border-box" }}
  />
  <input
    placeholder="Model"
    value={modelField}
    onChange={(e) => setModelField(e.target.value)}
    style={{ padding: "10px", width: "100%", boxSizing: "border-box" }}
  />
  <input
    placeholder="Attn"
    value={attn}
    onChange={(e) => setAttn(e.target.value)}
    style={{ padding: "10px", width: "100%", boxSizing: "border-box" }}
  />
  <input
    placeholder="Serial"
    value={serial}
    onChange={(e) => setSerial(e.target.value)}
    style={{ padding: "10px", width: "100%", boxSizing: "border-box" }}
  />
  <div></div>
  <input
    placeholder="Job"
    value={job}
    onChange={(e) => setJob(e.target.value)}
    style={{ padding: "10px", width: "100%", boxSizing: "border-box" }}
  />
</div>

        <div style={{ overflow: "visible", position: "relative" }}>
          <table
            border="1"
            style={{
              borderCollapse: "collapse",
              width: "100%",
              minWidth: "1100px",
              position: "relative",
            }}
          >
            <thead>
              <tr style={{ background: "#f3f3f3" }}>
                <th style={{ padding: "10px", width: "140px" }}>PN</th>
                <th style={{ padding: "10px" }}>Description</th>
                <th style={{ padding: "10px", width: "100px" }}>List Price</th>
                <th style={{ padding: "10px", width: "90px" }}>Multiplier</th>
                <th style={{ padding: "10px", width: "90px" }}>Markup</th>
                <th style={{ padding: "10px", width: "100px" }}>Sell Price</th>
                <th style={{ padding: "10px", width: "70px" }}>Qty</th>
                <th style={{ padding: "10px", width: "100px" }}>Total</th>
                <th style={{ padding: "10px", width: "50px" }}></th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr key={index} style={{ position: "relative" }}>
                  <td
                    style={{
                      position: "relative",
                      padding: "6px",
                      overflow: "visible",
                      zIndex: activeSuggestIndex === index ? 100 : 1,
                    }}
                    ref={activeSuggestIndex === index ? suggestRef : null}
                  >
                    <input
                      value={row.pn}
                      onChange={(e) => handlePnChange(index, e.target.value)}
                      onFocus={() => {
                        if (row.pn.length >= 2) handlePnChange(index, row.pn);
                      }}
                      autoComplete="off"
                      style={{
                        width: "100%",
                        padding: "8px",
                        boxSizing: "border-box",
                        fontSize: "14px",
                      }}
                    />

                    {activeSuggestIndex === index && suggestions.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          minWidth: "320px",
                          width: "max-content",
                          maxWidth: "420px",
                          background: "white",
                          border: "1px solid #94a3b8",
                          borderRadius: "6px",
                          maxHeight: "280px",
                          overflowY: "auto",
                          zIndex: 9999,
                          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                        }}
                      >
                        {suggestions.map((item, idx) => (
                          <div
                            key={`${item.partNumber}-${idx}`}
                            onClick={() => selectSuggestion(index, item)}
                            style={{
                              padding: "10px 12px",
                              cursor: "pointer",
                              borderBottom: "1px solid #e2e8f0",
                              fontSize: "13px",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "#f0f9ff")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "white")
                            }
                          >
                            <strong style={{ color: "#0f172a" }}>
                              {item.partNumber}
                            </strong>
                            <div style={{ color: "#475569", marginTop: 2 }}>
                              {item.description}
                            </div>
                            <div
                              style={{
                                color: "#059669",
                                marginTop: 2,
                                fontWeight: 600,
                              }}
                            >
                              LIST PRICE {money(item.listPrice || 0)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  <td style={{ padding: "6px" }}>
                    <textarea
                      value={row.description}
                      rows={1}
                      style={{
                        width: "100%",
                        resize: "none",
                        overflow: "hidden",
                        padding: "8px",
                        boxSizing: "border-box",
                        fontSize: "14px",
                        minHeight: "38px",
                      }}
                      onChange={(e) => {
                        updateRow(index, "description", e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                      }}
                    />
                  </td>

                  <td style={{ padding: "6px" }}>
                    <input
                      type="number"
                      value={row.listPrice}
                      onChange={(e) => updateRow(index, "listPrice", e.target.value)}
                      style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
                    />
                  </td>

                  <td style={{ padding: "6px" }}>
                    <input
                      type="number"
                      value={row.multiplier}
                      onChange={(e) => updateRow(index, "multiplier", e.target.value)}
                      style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
                    />
                  </td>

                  <td style={{ padding: "6px" }}>
                    <input
                      type="number"
                      step="0.01"
                      value={row.markup}
                      onChange={(e) => updateRow(index, "markup", e.target.value)}
                      style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
                    />
                  </td>

                  <td style={{ padding: "6px", textAlign: "right", fontWeight: 600 }}>
                    {money(toNumber(row.sellPrice))}
                  </td>

                  <td style={{ padding: "6px" }}>
                    <input
                      type="number"
                      value={row.qty}
                      onChange={(e) => updateRow(index, "qty", e.target.value)}
                      style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
                    />
                  </td>

                  <td style={{ padding: "6px", textAlign: "right", fontWeight: 600 }}>
                    {money(toNumber(row.qty, 1) * toNumber(row.sellPrice))}
                  </td>

                  <td style={{ padding: "6px", textAlign: "center" }}>
                    <button
                      onClick={() => deleteRow(index)}
                      style={{
                        padding: "6px 12px",
                        background: "#dc2626",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            marginTop: "20px",
            display: "flex",
            gap: "16px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={addRow}
            style={{
              padding: "10px 18px",
              background: "#64748b",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Add Line Item
          </button>

          <h3 style={{ margin: 0, fontSize: "20px" }}>
            Subtotal: {money(subtotal)}
          </h3>
        </div>

        <button
          onClick={generatePDF}
          style={{
            marginTop: "20px",
            padding: "12px 26px",
            background: "#1f4ed8",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "15px",
          }}
        >
          Generate Quote PDF
        </button>
      </div>
    </div>
  );
}

export default App;