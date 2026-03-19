// import React, { useEffect, useMemo, useState } from "react";
// import { partsData } from "./data/partsData";
// import partsCatalog from "./data/partsCatalog.json";
// import { jsPDF } from "jspdf";
// import { useNavigate } from "react-router-dom";
// import {
//   generateQuoteNumber,
//   money,
//   drawQuoteHeader,
// } from "./utils/pdfHelpers";

// function App() {
//   const navigate = useNavigate();

//   const [model, setModel] = useState("");
//   const [annualResults, setAnnualResults] = useState([]);
//   const [quoteItems, setQuoteItems] = useState([]);
//   const [searched, setSearched] = useState(false);
//   const [seriesName, setSeriesName] = useState("");
//   const [searchedModel, setSearchedModel] = useState("");

//   const [company, setCompany] = useState("");
//   const [attn, setAttn] = useState("");
//   const [email, setEmail] = useState("");

//   const [catalogSearch, setCatalogSearch] = useState("");
//   const [seriesFilter, setSeriesFilter] = useState("");
//   const [modelFilter, setModelFilter] = useState("");
//   const [sectionFilter, setSectionFilter] = useState("");
//   const [catalogPage, setCatalogPage] = useState(1);
//   const [selectedCatalog, setSelectedCatalog] = useState({});

//   const makeQuoteKey = (item) =>
//     `${item.pn}|${item.description}|${item.model || ""}|${item.source || ""}`;

//   const makeCatalogKey = (item) =>
//     `${item.series}|${item.model}|${item.partNumber}|${item.callOut}|${item.description}`;

//   const normalizeModel = (value) =>
//     String(value || "").trim().toUpperCase();

//   const splitModels = (value) =>
//     normalizeModel(value)
//       .split(/[\s,;/|]+/)
//       .map((m) => m.trim())
//       .filter(Boolean);

//   const modelMatches = (itemModelValue, targetModel) => {
//     const target = normalizeModel(targetModel);
//     if (!target) return true;

//     const itemModels = splitModels(itemModelValue);
//     if (itemModels.length === 0) return false;

//     return itemModels.includes(target);
//   };

//   const searchParts = () => {
//     const modelKey = normalizeModel(model);

//     let modelParts = [];
//     let foundSeries = "";

//     for (const series in partsData) {
//       if (partsData[series][modelKey]) {
//         modelParts = partsData[series][modelKey];
//         foundSeries = series;
//         break;
//       }
//     }

//     const partsWithQty = modelParts.map((p) => ({
//       ...p,
//       qty: p.defaultQty || 1,
//       selected: true,
//       source: "annual-kit",
//       model: modelKey,
//       series: foundSeries,
//     }));

//     setAnnualResults(partsWithQty);
//     setSeriesName(foundSeries);
//     setSearchedModel(modelKey);
//     setSearched(true);
//   };

//   const clearSearch = () => {
//     setModel("");
//     setAnnualResults([]);
//     setSearched(false);
//     setSeriesName("");
//     setSearchedModel("");
//   };

//   const toggleAnnualItemSelected = (index) => {
//     const updated = [...annualResults];
//     updated[index].selected = !updated[index].selected;
//     setAnnualResults(updated);
//   };

//   const toggleSelectAllAnnual = (checked) => {
//     const updated = annualResults.map((item) => ({
//       ...item,
//       selected: checked,
//     }));
//     setAnnualResults(updated);
//   };

//   const updateAnnualQty = (index, value) => {
//     const updated = [...annualResults];
//     updated[index].qty = Number(value) || 1;
//     setAnnualResults(updated);
//   };

//   const addSelectedAnnualToQuote = () => {
//     const selectedAnnual = annualResults.filter((item) => item.selected);

//     if (selectedAnnual.length === 0) {
//       alert("Please select at least one annual kit item.");
//       return;
//     }

//     const merged = [...quoteItems];

//     selectedAnnual.forEach((item) => {
//       const quoteItem = {
//         pn: item.pn || "",
//         description: item.description || "",
//         price: Number(item.price || 0),
//         qty: Number(item.qty || 1),
//         selected: true,
//         source: "annual-kit",
//         model: item.model || searchedModel,
//         series: item.series || seriesName,
//       };

//       const existingIndex = merged.findIndex(
//         (q) =>
//           q.pn === quoteItem.pn &&
//           q.description === quoteItem.description &&
//           (q.model || "") === (quoteItem.model || "")
//       );

//       if (existingIndex >= 0) {
//         merged[existingIndex].qty += quoteItem.qty;
//         merged[existingIndex].selected = true;
//       } else {
//         merged.push(quoteItem);
//       }
//     });

//     setQuoteItems(merged);
//   };

//   const toggleCatalogItem = (item) => {
//     const key = makeCatalogKey(item);
//     setSelectedCatalog((prev) => ({
//       ...prev,
//       [key]: !prev[key],
//     }));
//   };

//   const uniqueSeries = useMemo(
//     () =>
//       [...new Set(partsCatalog.map((item) => item.series).filter(Boolean))].sort(),
//     []
//   );

//   const uniqueSections = useMemo(
//     () =>
//       [...new Set(partsCatalog.map((item) => item.section).filter(Boolean))].sort(),
//     []
//   );

//   const filteredCatalog = useMemo(() => {
//     const q = catalogSearch.trim().toLowerCase();
//     const normalizedModelFilter = normalizeModel(modelFilter);

//     return partsCatalog.filter((item) => {
//       const matchesSearch =
//         !q ||
//         String(item.partNumber || "").toLowerCase().includes(q) ||
//         String(item.description || "").toLowerCase().includes(q) ||
//         String(item.iplDescription || "").toLowerCase().includes(q) ||
//         String(item.notes || "").toLowerCase().includes(q) ||
//         String(item.callOut || "").toLowerCase().includes(q);

//       const matchesSeries = !seriesFilter || item.series === seriesFilter;
//       const matchesModel = !normalizedModelFilter
//         ? true
//         : modelMatches(item.model, normalizedModelFilter);
//       const matchesSection = !sectionFilter || item.section === sectionFilter;

//       return matchesSearch && matchesSeries && matchesModel && matchesSection;
//     });
//   }, [catalogSearch, seriesFilter, modelFilter, sectionFilter]);

//   useEffect(() => {
//     setCatalogPage(1);
//   }, [catalogSearch, seriesFilter, modelFilter, sectionFilter]);

//   const pageSize = 25;
//   const totalPages = Math.max(1, Math.ceil(filteredCatalog.length / pageSize));
//   const pagedCatalog = filteredCatalog.slice(
//     (catalogPage - 1) * pageSize,
//     catalogPage * pageSize
//   );

//   const addSelectedCatalogToQuote = () => {
//     const selectedItems = filteredCatalog
//       .filter((item) => selectedCatalog[makeCatalogKey(item)])
//       .map((item) => ({
//         pn: item.partNumber,
//         description: item.description || "",
//         price: Number(item.sellPrice || 0),
//         qty: 1,
//         selected: true,
//         source: "catalog",
//         series: item.series || "",
//         model: item.model || "",
//         section: item.section || "",
//         callOut: item.callOut || "",
//         iplDescription: item.iplDescription || "",
//         notes: item.notes || "",
//       }));

//     if (selectedItems.length === 0) {
//       alert("Please select at least one catalog item.");
//       return;
//     }

//     const merged = [...quoteItems];

//     selectedItems.forEach((item) => {
//       const existingIndex = merged.findIndex(
//         (q) =>
//           q.pn === item.pn &&
//           q.description === item.description &&
//           (q.model || "") === (item.model || "")
//       );

//       if (existingIndex >= 0) {
//         merged[existingIndex].qty += 1;
//         merged[existingIndex].selected = true;
//       } else {
//         merged.push(item);
//       }
//     });

//     setQuoteItems(merged);
//   };

//   const updateQuoteQty = (index, value) => {
//     const updated = [...quoteItems];
//     updated[index].qty = Number(value) || 1;
//     setQuoteItems(updated);
//   };

//   const toggleQuoteItemSelected = (index) => {
//     const updated = [...quoteItems];
//     updated[index].selected = !updated[index].selected;
//     setQuoteItems(updated);
//   };

//   const removeQuoteItem = (index) => {
//     const updated = [...quoteItems];
//     updated.splice(index, 1);
//     setQuoteItems(updated);
//   };

//   const toggleSelectAllQuote = (checked) => {
//     const updated = quoteItems.map((item) => ({
//       ...item,
//       selected: checked,
//     }));
//     setQuoteItems(updated);
//   };

//   const quoteSubtotal = quoteItems.reduce(
//     (sum, part) =>
//       sum + (part.selected ? Number(part.qty || 0) * Number(part.price || 0) : 0),
//     0
//   );

//   const drawTableHeader = (doc, y) => {
//     doc.setFont(undefined, "bold");
//     doc.setFontSize(11);

//     doc.text("Line", 14, y);
//     doc.text("Part Number", 26, y);
//     doc.text("Description", 62, y);
//     doc.text("Qty", 148, y, { align: "center" });
//     doc.text("Unit Price", 168, y, { align: "center" });
//     doc.text("Total", 196, y, { align: "right" });

//     y += 4;
//     doc.line(14, y, 196, y);

//     return y + 8;
//   };

//   const generatePDF = () => {
//     const selectedQuoteItems = quoteItems.filter((item) => item.selected);

//     if (selectedQuoteItems.length === 0) {
//       alert("Please select at least one quote item.");
//       return;
//     }

//     const quoteNumber = generateQuoteNumber();
//     const doc = new jsPDF();

//     let y = drawQuoteHeader(doc, {
//       quoteNumber,
//       company,
//       attn,
//       email,
//       subtitle: "Selected Parts Quote",
//       subtitle2: [
//         `Series: ${seriesName || "N/A"}`,
//         `Model: ${searchedModel || "N/A"}`,
//       ],
//     });

//     y = drawTableHeader(doc, y);

//     doc.setFont(undefined, "normal");
//     doc.setFontSize(10);

//     let item = 1;

//     selectedQuoteItems.forEach((p) => {
//       const unit = Number(p.price || 0);
//       const qty = Number(p.qty || 1);
//       const total = unit * qty;

//       const descLines = doc.splitTextToSize(p.description || "", 78);
//       const rowHeight = Math.max(descLines.length * 5 + 2, 8);

//       if (y + rowHeight > 265) {
//         doc.addPage();

//         y = drawQuoteHeader(doc, {
//           quoteNumber,
//           company,
//           attn,
//           email,
//           subtitle: "Selected Parts Quote",
//           subtitle2: [
//             `Series: ${seriesName || "N/A"}`,
//             `Model: ${searchedModel || "N/A"}`,
//           ],
//         });

//         y = drawTableHeader(doc, y);

//         doc.setFont(undefined, "normal");
//         doc.setFontSize(10);
//       }

//       doc.text(String(item), 14, y);
//       doc.text(p.pn || "", 26, y);
//       doc.text(descLines, 62, y);
//       doc.text(String(qty), 148, y, { align: "center" });
//       doc.text(money(unit), 168, y, { align: "center" });
//       doc.text(money(total), 196, y, { align: "right" });

//       y += rowHeight;
//       item++;
//     });

//     y += 4;
//     doc.line(120, y, 196, y);

//     y += 8;
//     doc.setFontSize(12);
//     doc.setFont(undefined, "bold");
//     doc.text(`Subtotal: ${money(quoteSubtotal)}`, 196, y, { align: "right" });

//     y += 12;
//     doc.setFontSize(10);
//     doc.setFont(undefined, "italic");
//     doc.text("Freight and applicable sales tax not included.", 14, y);

//     y += 10;
//     doc.setFont(undefined, "normal");
//     doc.text("Prepared by Hazel Caling", 14, y);

//     doc.save(`Quote_${quoteNumber}.pdf`);

//     const subject = `Quote #${quoteNumber}`;
//     const body = `Hello,

// Please see the attached quote.

// Thank you.`;

//     if (email.trim()) {
//       window.location.href = `mailto:${email}?subject=${encodeURIComponent(
//         subject
//       )}&body=${encodeURIComponent(body)}`;
//     }
//   };

//   const allAnnualSelected =
//     annualResults.length > 0 && annualResults.every((item) => item.selected);

//   const allQuoteSelected =
//     quoteItems.length > 0 && quoteItems.every((item) => item.selected);

//   return (
//     <div
//       style={{
//         padding: "16px 20px 28px",
//         fontFamily: "Arial, sans-serif",
//         width: "100%",
//         maxWidth: "1900px",
//         margin: "0 auto",
//         boxSizing: "border-box",
//       }}
//     >
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
//           gap: "20px",
//           alignItems: "start",
//           width: "100%",
//         }}
//       >
//         <div
//           style={{
//             width: "100%",
//             minWidth: 0,
//             background: "#fff",
//             border: "1px solid #ddd",
//             borderRadius: "10px",
//             padding: "18px",
//             boxSizing: "border-box",
//           }}
//         >
//           <button
//             onClick={() => navigate("/quote")}
//             style={{
//               padding: "10px 18px",
//               marginBottom: "16px",
//               background: "#0ea5e9",
//               color: "white",
//               border: "none",
//               borderRadius: "4px",
//               cursor: "pointer",
//             }}
//           >
//             Create Manual Quote
//           </button>

//           <h2 style={{ marginTop: 0, marginBottom: "16px" }}>Annual Kit Lookup</h2>

//           <form
//             onSubmit={(e) => {
//               e.preventDefault();
//               searchParts();
//             }}
//             style={{
//               display: "flex",
//               gap: "10px",
//               flexWrap: "wrap",
//               marginBottom: "18px",
//             }}
//           >
//             <input
//               type="text"
//               placeholder="Enter model (ex: 1007 or 399B)"
//               value={model}
//               onChange={(e) => setModel(e.target.value.toUpperCase())}
//               style={{
//                 padding: "10px 12px",
//                 minWidth: "220px",
//                 flex: "1 1 220px",
//                 boxSizing: "border-box",
//               }}
//             />

//             <button type="submit" style={{ padding: "10px 16px" }}>
//               Search
//             </button>

//             <button type="button" onClick={clearSearch} style={{ padding: "10px 16px" }}>
//               Clear
//             </button>
//           </form>

//           {searched && annualResults.length > 0 && (
//             <>
//               <div style={{ marginBottom: "14px" }}>
//                 <div style={{ fontSize: "14px", color: "#666" }}>
//                   Recommended Annual Kit
//                 </div>

//                 <div
//                   style={{
//                     fontSize: "32px",
//                     fontWeight: "700",
//                     lineHeight: 1.1,
//                     marginTop: "4px",
//                     wordBreak: "break-word",
//                   }}
//                 >
//                   {seriesName} {searchedModel}
//                 </div>
//               </div>

//               <div style={{ overflowX: "auto", width: "100%" }}>
//                 <table
//                   border="1"
//                   cellPadding="8"
//                   style={{
//                     borderCollapse: "collapse",
//                     width: "100%",
//                     minWidth: "760px",
//                     tableLayout: "fixed",
//                   }}
//                 >
//                   <thead>
//                     <tr>
//                       <th style={{ width: "46px", textAlign: "center" }}>
//                         <input
//                           type="checkbox"
//                           checked={allAnnualSelected}
//                           onChange={(e) => toggleSelectAllAnnual(e.target.checked)}
//                         />
//                       </th>
//                       <th style={{ width: "60px" }}>Line</th>
//                       <th style={{ width: "130px" }}>Part Number</th>
//                       <th>Description</th>
//                       <th style={{ width: "120px" }}>Unit Price</th>
//                       <th style={{ width: "90px", textAlign: "center" }}>Qty</th>
//                     </tr>
//                   </thead>

//                   <tbody>
//                     {annualResults.map((part, index) => (
//                       <tr
//                         key={`${part.pn}-${index}`}
//                         style={{ opacity: part.selected ? 1 : 0.55 }}
//                       >
//                         <td style={{ textAlign: "center" }}>
//                           <input
//                             type="checkbox"
//                             checked={!!part.selected}
//                             onChange={() => toggleAnnualItemSelected(index)}
//                           />
//                         </td>
//                         <td style={{ textAlign: "center" }}>{index + 1}</td>
//                         <td>{part.pn}</td>
//                         <td style={{ wordBreak: "break-word" }}>{part.description}</td>
//                         <td>{money(part.price)}</td>
//                         <td style={{ textAlign: "center" }}>
//                           <input
//                             type="number"
//                             min="1"
//                             value={part.qty}
//                             onChange={(e) => updateAnnualQty(index, e.target.value)}
//                             style={{ width: "60px", textAlign: "center" }}
//                           />
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>

//               <button
//                 onClick={addSelectedAnnualToQuote}
//                 style={{
//                   marginTop: "14px",
//                   padding: "10px 18px",
//                   background: "#2563eb",
//                   color: "white",
//                   border: "none",
//                   borderRadius: "4px",
//                   cursor: "pointer",
//                 }}
//               >
//                 Add Selected Annual Kit Items to Quote
//               </button>
//             </>
//           )}

//           {searched && annualResults.length === 0 && <p>No parts found</p>}
//         </div>

//         <div
//           style={{
//             width: "100%",
//             minWidth: 0,
//             border: "1px solid #ddd",
//             borderRadius: "10px",
//             padding: "18px",
//             background: "#fff",
//             boxSizing: "border-box",
//           }}
//         >
//           <h2 style={{ marginTop: 0, marginBottom: "16px", textAlign: "center" }}>
//             Raypak IPL Parts
//           </h2>

//           <input
//             type="text"
//             placeholder="Search part number, description, IPL, notes, call out"
//             value={catalogSearch}
//             onChange={(e) => setCatalogSearch(e.target.value)}
//             style={{
//               width: "100%",
//               padding: "10px 12px",
//               marginBottom: "12px",
//               boxSizing: "border-box",
//             }}
//           />

//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr)",
//               gap: "10px",
//               marginBottom: "12px",
//             }}
//           >
//             <select
//               value={seriesFilter}
//               onChange={(e) => setSeriesFilter(e.target.value)}
//               style={{ padding: "10px", minWidth: 0 }}
//             >
//               <option value="">All Series</option>
//               {uniqueSeries.map((series) => (
//                 <option key={series} value={series}>
//                   {series}
//                 </option>
//               ))}
//             </select>

//             <input
//               type="text"
//               placeholder="Filter model"
//               value={modelFilter}
//               onChange={(e) => setModelFilter(e.target.value.toUpperCase())}
//               style={{ padding: "10px", minWidth: 0, boxSizing: "border-box" }}
//             />

//             <select
//               value={sectionFilter}
//               onChange={(e) => setSectionFilter(e.target.value)}
//               style={{ padding: "10px", minWidth: 0 }}
//             >
//               <option value="">All Sections</option>
//               {uniqueSections.map((section) => (
//                 <option key={section} value={section}>
//                   {section}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div style={{ fontSize: "13px", color: "#666", marginBottom: "10px" }}>
//             Showing {pagedCatalog.length} of {filteredCatalog.length} items
//           </div>

//           <div
//             style={{
//               maxHeight: "720px",
//               overflowY: "auto",
//               overflowX: "auto",
//               border: "1px solid #ddd",
//               background: "white",
//             }}
//           >
//             <table
//               border="1"
//               cellPadding="6"
//               style={{
//                 borderCollapse: "collapse",
//                 width: "100%",
//                 minWidth: "720px",
//                 fontSize: "13px",
//                 tableLayout: "fixed",
//               }}
//             >
//               <thead style={{ position: "sticky", top: 0, background: "#f3f3f3", zIndex: 1 }}>
//                 <tr>
//                   <th style={{ width: "58px" }}>Select</th>
//                   <th style={{ width: "90px" }}>Part Number</th>
//                   <th>Description</th>
//                   <th style={{ width: "90px" }}>Model</th>
//                   <th style={{ width: "90px" }}>Price</th>
//                 </tr>
//               </thead>

//               <tbody>
//                 {pagedCatalog.map((item) => {
//                   const key = makeCatalogKey(item);

//                   return (
//                     <tr key={key}>
//                       <td style={{ textAlign: "center" }}>
//                         <input
//                           type="checkbox"
//                           checked={!!selectedCatalog[key]}
//                           onChange={() => toggleCatalogItem(item)}
//                         />
//                       </td>
//                       <td>{item.partNumber}</td>
//                       <td style={{ wordBreak: "break-word" }}>
//                         <div>{item.description}</div>

//                         {item.callOut && (
//                           <div
//                             style={{
//                               fontSize: "12px",
//                               color: "#888",
//                               marginTop: "4px",
//                               fontWeight: "bold",
//                             }}
//                           >
//                             Call Out: {item.callOut}
//                           </div>
//                         )}

//                         {item.iplDescription && (
//                           <div
//                             style={{
//                               fontSize: "12px",
//                               color: "#666",
//                               marginTop: "4px",
//                             }}
//                           >
//                             IPL: {item.iplDescription}
//                           </div>
//                         )}

//                         {item.notes && (
//                           <div
//                             style={{
//                               fontSize: "12px",
//                               color: "#888",
//                               marginTop: "4px",
//                             }}
//                           >
//                             Notes: {item.notes}
//                           </div>
//                         )}
//                       </td>
//                       <td>{item.model}</td>
//                       <td>{money(item.sellPrice || 0)}</td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>

//           <div
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               marginTop: "14px",
//               alignItems: "center",
//               flexWrap: "wrap",
//               gap: "10px",
//             }}
//           >
//             <div>
//               <button
//                 onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
//                 disabled={catalogPage === 1}
//                 style={{ padding: "8px 12px", marginRight: "8px" }}
//               >
//                 Prev
//               </button>

//               <button
//                 onClick={() => setCatalogPage((p) => Math.min(totalPages, p + 1))}
//                 disabled={catalogPage === totalPages}
//                 style={{ padding: "8px 12px" }}
//               >
//                 Next
//               </button>
//             </div>

//             <div style={{ fontSize: "13px" }}>
//               Page {catalogPage} of {totalPages}
//             </div>
//           </div>

//           <button
//             onClick={addSelectedCatalogToQuote}
//             style={{
//               marginTop: "16px",
//               padding: "10px 18px",
//               background: "#059669",
//               color: "white",
//               border: "none",
//               borderRadius: "4px",
//               cursor: "pointer",
//               width: "100%",
//             }}
//           >
//             Add Selected Items to Quote
//           </button>
//         </div>
//       </div>

//       <div
//         style={{
//           marginTop: "24px",
//           border: "1px solid #ddd",
//           borderRadius: "10px",
//           padding: "18px",
//           background: "#fff",
//         }}
//       >
//         <h3 style={{ marginTop: 0 }}>Selected Items for Quote</h3>

//         {quoteItems.length === 0 ? (
//           <p>No items added yet.</p>
//         ) : (
//           <>
//             <div style={{ overflowX: "auto", width: "100%" }}>
//               <table
//                 border="1"
//                 cellPadding="8"
//                 style={{
//                   borderCollapse: "collapse",
//                   width: "100%",
//                   minWidth: "1100px",
//                 }}
//               >
//                 <thead>
//                   <tr>
//                     <th style={{ textAlign: "center" }}>
//                       <input
//                         type="checkbox"
//                         checked={allQuoteSelected}
//                         onChange={(e) => toggleSelectAllQuote(e.target.checked)}
//                       />
//                     </th>
//                     <th>Line</th>
//                     <th>Part Number</th>
//                     <th>Description</th>
//                     <th>Source</th>
//                     <th>Unit Price</th>
//                     <th style={{ textAlign: "center" }}>Qty</th>
//                     <th>Total</th>
//                     <th>Remove</th>
//                   </tr>
//                 </thead>

//                 <tbody>
//                   {quoteItems.map((item, index) => (
//                     <tr
//                       key={makeQuoteKey(item) + index}
//                       style={{ opacity: item.selected ? 1 : 0.55 }}
//                     >
//                       <td style={{ textAlign: "center" }}>
//                         <input
//                           type="checkbox"
//                           checked={!!item.selected}
//                           onChange={() => toggleQuoteItemSelected(index)}
//                         />
//                       </td>
//                       <td style={{ textAlign: "center" }}>{index + 1}</td>
//                       <td>{item.pn}</td>
//                       <td style={{ wordBreak: "break-word" }}>
//                         <div>{item.description}</div>

//                         {item.source === "catalog" && item.callOut && (
//                           <div
//                             style={{
//                               fontSize: "12px",
//                               color: "#888",
//                               marginTop: "4px",
//                               fontWeight: "bold",
//                             }}
//                           >
//                             Call Out: {item.callOut}
//                           </div>
//                         )}

//                         {item.source === "catalog" && item.iplDescription && (
//                           <div
//                             style={{
//                               fontSize: "12px",
//                               color: "#666",
//                               marginTop: "4px",
//                             }}
//                           >
//                             IPL: {item.iplDescription}
//                           </div>
//                         )}

//                         {item.source === "catalog" && item.notes && (
//                           <div
//                             style={{
//                               fontSize: "12px",
//                               color: "#888",
//                               marginTop: "4px",
//                             }}
//                           >
//                             Notes: {item.notes}
//                           </div>
//                         )}
//                       </td>
//                       <td>{item.source === "annual-kit" ? "Annual Kit" : "Catalog"}</td>
//                       <td>{money(item.price)}</td>
//                       <td style={{ textAlign: "center" }}>
//                         <input
//                           type="number"
//                           min="1"
//                           value={item.qty}
//                           onChange={(e) => updateQuoteQty(index, e.target.value)}
//                           style={{ width: "60px", textAlign: "center" }}
//                         />
//                       </td>
//                       <td>{money(item.selected ? item.qty * item.price : 0)}</td>
//                       <td style={{ textAlign: "center" }}>
//                         <button
//                           onClick={() => removeQuoteItem(index)}
//                           style={{
//                             padding: "6px 10px",
//                             background: "#dc2626",
//                             color: "white",
//                             border: "none",
//                             borderRadius: "4px",
//                             cursor: "pointer",
//                           }}
//                         >
//                           Delete
//                         </button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>

//                 <tfoot>
//                   <tr>
//                     <td colSpan="7" style={{ textAlign: "right" }}>
//                       <strong>Subtotal</strong>
//                     </td>
//                     <td>
//                       <strong>{money(quoteSubtotal)}</strong>
//                     </td>
//                     <td></td>
//                   </tr>
//                 </tfoot>
//               </table>
//             </div>

//             <div
//               style={{
//                 marginTop: "18px",
//                 display: "flex",
//                 gap: "10px",
//                 flexWrap: "wrap",
//               }}
//             >
//               <input
//                 placeholder="Company Name"
//                 value={company}
//                 onChange={(e) => setCompany(e.target.value)}
//                 style={{ padding: "10px", minWidth: "220px", flex: "1 1 220px" }}
//               />

//               <input
//                 placeholder="Attn To"
//                 value={attn}
//                 onChange={(e) => setAttn(e.target.value)}
//                 style={{ padding: "10px", minWidth: "180px", flex: "1 1 180px" }}
//               />

//               <input
//                 placeholder="Email"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 style={{ padding: "10px", minWidth: "240px", flex: "1 1 240px" }}
//               />
//             </div>

//             <button
//               onClick={generatePDF}
//               style={{
//                 marginTop: "18px",
//                 padding: "10px 20px",
//                 background: "#1f4ed8",
//                 color: "white",
//                 border: "none",
//                 borderRadius: "4px",
//                 cursor: "pointer",
//               }}
//             >
//               Download Quote PDF
//             </button>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }

// export default App;


import React, { useEffect, useMemo, useState } from "react";
import { partsData } from "./data/partsData";
import partsCatalog from "./data/partsCatalog.json";
import { jsPDF } from "jspdf";
import { useNavigate } from "react-router-dom";
import {
  generateQuoteNumber,
  money,
  drawQuoteHeader,
} from "./utils/pdfHelpers";

function App() {
  const navigate = useNavigate();

  const [model, setModel] = useState("");
  const [annualResults, setAnnualResults] = useState([]);
  const [quoteItems, setQuoteItems] = useState([]);
  const [searched, setSearched] = useState(false);
  const [seriesName, setSeriesName] = useState("");
  const [searchedModel, setSearchedModel] = useState("");

  const [company, setCompany] = useState("");
  const [attn, setAttn] = useState("");
  const [email, setEmail] = useState("");

  const [catalogSearch, setCatalogSearch] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [catalogPage, setCatalogPage] = useState(1);
  const [selectedCatalog, setSelectedCatalog] = useState({});

  const makeQuoteKey = (item, index = 0) =>
    [
      item.pn || "",
      item.description || "",
      item.model || "",
      item.source || "",
      item.callOut || "",
      item.iplDescription || "",
      item.notes || "",
      index,
    ].join("|");

  const makeCatalogKey = (item, index = 0) =>
    [
      item.series || "",
      item.model || "",
      item.section || "",
      item.partNumber || "",
      item.callOut || "",
      item.description || "",
      item.iplDescription || "",
      item.notes || "",
      index,
    ].join("|");

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
    const updated = annualResults.map((item) => ({
      ...item,
      selected: checked,
    }));
    setAnnualResults(updated);
  };

  const updateAnnualQty = (index, value) => {
    const updated = [...annualResults];
    updated[index].qty = Number(value) || 1;
    setAnnualResults(updated);
  };

  const addSelectedAnnualToQuote = () => {
    const selectedAnnual = annualResults.filter((item) => item.selected);

    if (selectedAnnual.length === 0) {
      alert("Please select at least one annual kit item.");
      return;
    }

    const merged = [...quoteItems];

    selectedAnnual.forEach((item) => {
      const quoteItem = {
        pn: item.pn || "",
        description: item.description || "",
        price: Number(item.price || 0),
        qty: Number(item.qty || 1),
        selected: true,
        source: "annual-kit",
        model: item.model || searchedModel,
        series: item.series || seriesName,
        callOut: item.callOut || "",
        iplDescription: item.iplDescription || "",
        notes: item.notes || "",
      };

      const existingIndex = merged.findIndex(
        (q) =>
          q.pn === quoteItem.pn &&
          q.description === quoteItem.description &&
          (q.model || "") === (quoteItem.model || "") &&
          (q.source || "") === (quoteItem.source || "")
      );

      if (existingIndex >= 0) {
        merged[existingIndex].qty += quoteItem.qty;
        merged[existingIndex].selected = true;
      } else {
        merged.push(quoteItem);
      }
    });

    setQuoteItems(merged);
  };

  const toggleCatalogItem = (item, index) => {
    const key = makeCatalogKey(item, index);
    setSelectedCatalog((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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

  const addSelectedCatalogToQuote = () => {
    const selectedItems = filteredCatalog
      .filter((item, index) => selectedCatalog[makeCatalogKey(item, index)])
      .map((item) => ({
        pn: item.partNumber,
        description: item.description || "",
        price: Number(item.sellPrice || 0),
        qty: 1,
        selected: true,
        source: "catalog",
        series: item.series || "",
        model: item.model || "",
        section: item.section || "",
        callOut: item.callOut || "",
        iplDescription: item.iplDescription || "",
        notes: item.notes || "",
      }));

    if (selectedItems.length === 0) {
      alert("Please select at least one catalog item.");
      return;
    }

    const merged = [...quoteItems];

    selectedItems.forEach((item) => {
      const existingIndex = merged.findIndex(
        (q) =>
          q.pn === item.pn &&
          q.description === item.description &&
          (q.model || "") === (item.model || "") &&
          (q.source || "") === (item.source || "") &&
          (q.callOut || "") === (item.callOut || "")
      );

      if (existingIndex >= 0) {
        merged[existingIndex].qty += 1;
        merged[existingIndex].selected = true;
      } else {
        merged.push(item);
      }
    });

    setQuoteItems(merged);
  };

  const updateQuoteQty = (index, value) => {
    const updated = [...quoteItems];
    updated[index].qty = Number(value) || 1;
    setQuoteItems(updated);
  };

  const toggleQuoteItemSelected = (index) => {
    const updated = [...quoteItems];
    updated[index].selected = !updated[index].selected;
    setQuoteItems(updated);
  };

  const removeQuoteItem = (index) => {
    const updated = [...quoteItems];
    updated.splice(index, 1);
    setQuoteItems(updated);
  };

  const toggleSelectAllQuote = (checked) => {
    const updated = quoteItems.map((item) => ({
      ...item,
      selected: checked,
    }));
    setQuoteItems(updated);
  };

  const quoteSubtotal = quoteItems.reduce(
    (sum, part) =>
      sum + (part.selected ? Number(part.qty || 0) * Number(part.price || 0) : 0),
    0
  );

  const drawTableHeader = (doc, y) => {
    doc.setFont(undefined, "bold");
    doc.setFontSize(11);

    doc.text("Line", 14, y);
    doc.text("Part Number", 26, y);
    doc.text("Description", 62, y);
    doc.text("Qty", 148, y, { align: "center" });
    doc.text("Unit Price", 168, y, { align: "center" });
    doc.text("Total", 196, y, { align: "right" });

    y += 4;
    doc.line(14, y, 196, y);

    return y + 8;
  };

  const generatePDF = () => {
    const selectedQuoteItems = quoteItems.filter((item) => item.selected);

    if (selectedQuoteItems.length === 0) {
      alert("Please select at least one quote item.");
      return;
    }

    const quoteNumber = generateQuoteNumber();
    const doc = new jsPDF();

    let y = drawQuoteHeader(doc, {
      quoteNumber,
      company,
      attn,
      email,
      subtitle: "Selected Parts Quote",
      subtitle2: [
        `Series: ${seriesName || "N/A"}`,
        `Model: ${searchedModel || "N/A"}`,
      ],
    });

    y = drawTableHeader(doc, y);

    doc.setFont(undefined, "normal");
    doc.setFontSize(10);

    let itemNo = 1;

    selectedQuoteItems.forEach((p) => {
      const unit = Number(p.price || 0);
      const qty = Number(p.qty || 1);
      const total = unit * qty;

      const pdfDescription = [p.description]
        .concat(p.callOut ? [`Call Out: ${p.callOut}`] : [])
        .concat(p.iplDescription ? [`IPL: ${p.iplDescription}`] : [])
        .concat(p.notes ? [`Notes: ${p.notes}`] : [])
        .filter(Boolean)
        .join("\n");

      const descLines = doc.splitTextToSize(pdfDescription || "", 78);
      const rowHeight = Math.max(descLines.length * 5 + 2, 8);

      if (y + rowHeight > 265) {
        doc.addPage();

        y = drawQuoteHeader(doc, {
          quoteNumber,
          company,
          attn,
          email,
          subtitle: "Selected Parts Quote",
          subtitle2: [
            `Series: ${seriesName || "N/A"}`,
            `Model: ${searchedModel || "N/A"}`,
          ],
        });

        y = drawTableHeader(doc, y);

        doc.setFont(undefined, "normal");
        doc.setFontSize(10);
      }

      doc.text(String(itemNo), 14, y);
      doc.text(p.pn || "", 26, y);
      doc.text(descLines, 62, y);
      doc.text(String(qty), 148, y, { align: "center" });
      doc.text(money(unit), 168, y, { align: "center" });
      doc.text(money(total), 196, y, { align: "right" });

      y += rowHeight;
      itemNo++;
    });

    y += 4;
    doc.line(120, y, 196, y);

    y += 8;
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text(`Subtotal: ${money(quoteSubtotal)}`, 196, y, { align: "right" });

    y += 12;
    doc.setFontSize(10);
    doc.setFont(undefined, "italic");
    doc.text("Freight and applicable sales tax not included.", 14, y);

    y += 10;
    doc.setFont(undefined, "normal");
    doc.text("Prepared by Hazel Caling", 14, y);

    doc.save(`Quote_${quoteNumber}.pdf`);

    const subject = `Quote #${quoteNumber}`;
    const body = `Hello,

Please see the attached quote.

Thank you.`;

    if (email.trim()) {
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;
    }
  };

  const allAnnualSelected =
    annualResults.length > 0 && annualResults.every((item) => item.selected);

  const allQuoteSelected =
    quoteItems.length > 0 && quoteItems.every((item) => item.selected);

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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: "20px",
          alignItems: "start",
          width: "100%",
        }}
      >
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
            onClick={() => navigate("/quote")}
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
            Create Manual Quote
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
                    fontSize: "32px",
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
                    minWidth: "760px",
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
                      <th style={{ width: "60px" }}>Line</th>
                      <th style={{ width: "130px" }}>Part Number</th>
                      <th>Description</th>
                      <th style={{ width: "120px" }}>Unit Price</th>
                      <th style={{ width: "90px", textAlign: "center" }}>Qty</th>
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
                            style={{ width: "60px", textAlign: "center" }}
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
              maxHeight: "720px",
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
                minWidth: "720px",
                fontSize: "13px",
                tableLayout: "fixed",
              }}
            >
              <thead style={{ position: "sticky", top: 0, background: "#f3f3f3", zIndex: 1 }}>
                <tr>
                  <th style={{ width: "58px" }}>Select</th>
                  <th style={{ width: "90px" }}>Part Number</th>
                  <th>Description</th>
                  <th style={{ width: "90px" }}>Model</th>
                  <th style={{ width: "90px" }}>Price</th>
                </tr>
              </thead>

              <tbody>
                {pagedCatalog.map((item, index) => {
                  const globalIndex = (catalogPage - 1) * pageSize + index;
                  const key = makeCatalogKey(item, globalIndex);

                  return (
                    <tr key={key}>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={!!selectedCatalog[key]}
                          onChange={() => toggleCatalogItem(item, globalIndex)}
                        />
                      </td>
                      <td>{item.partNumber}</td>
                      <td style={{ wordBreak: "break-word" }}>
                        <div>{item.description}</div>

                        {item.callOut && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#888",
                              marginTop: "4px",
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
                              marginTop: "4px",
                            }}
                          >
                            IPL: {item.iplDescription}
                          </div>
                        )}

                        {item.notes && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#888",
                              marginTop: "4px",
                            }}
                          >
                            Notes: {item.notes}
                          </div>
                        )}
                      </td>
                      <td>{item.model}</td>
                      <td>{money(item.sellPrice || 0)}</td>
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

          <button
            onClick={addSelectedCatalogToQuote}
            style={{
              marginTop: "16px",
              padding: "10px 18px",
              background: "#059669",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Add Selected Items to Quote
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: "24px",
          border: "1px solid #ddd",
          borderRadius: "10px",
          padding: "18px",
          background: "#fff",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Selected Items for Quote</h3>

        {quoteItems.length === 0 ? (
          <p>No items added yet.</p>
        ) : (
          <>
            <div style={{ overflowX: "auto", width: "100%" }}>
              <table
                border="1"
                cellPadding="8"
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  minWidth: "1100px",
                }}
              >
                <thead>
                  <tr>
                    <th style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={allQuoteSelected}
                        onChange={(e) => toggleSelectAllQuote(e.target.checked)}
                      />
                    </th>
                    <th>Line</th>
                    <th>Part Number</th>
                    <th>Description</th>
                    <th>Source</th>
                    <th>Unit Price</th>
                    <th style={{ textAlign: "center" }}>Qty</th>
                    <th>Total</th>
                    <th>Remove</th>
                  </tr>
                </thead>

                <tbody>
                  {quoteItems.map((item, index) => (
                    <tr
                      key={makeQuoteKey(item, index)}
                      style={{ opacity: item.selected ? 1 : 0.55 }}
                    >
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={!!item.selected}
                          onChange={() => toggleQuoteItemSelected(index)}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>{index + 1}</td>
                      <td>{item.pn}</td>
                      <td style={{ wordBreak: "break-word" }}>
                        <div>{item.description}</div>

                        {item.source === "catalog" && item.callOut && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#888",
                              marginTop: "4px",
                              fontWeight: "bold",
                            }}
                          >
                            Call Out: {item.callOut}
                          </div>
                        )}

                        {item.source === "catalog" && item.iplDescription && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#666",
                              marginTop: "4px",
                            }}
                          >
                            IPL: {item.iplDescription}
                          </div>
                        )}

                        {item.source === "catalog" && item.notes && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#888",
                              marginTop: "4px",
                            }}
                          >
                            Notes: {item.notes}
                          </div>
                        )}
                      </td>
                      <td>{item.source === "annual-kit" ? "Annual Kit" : "Catalog"}</td>
                      <td>{money(item.price)}</td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateQuoteQty(index, e.target.value)}
                          style={{ width: "60px", textAlign: "center" }}
                        />
                      </td>
                      <td>{money(item.selected ? item.qty * item.price : 0)}</td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          onClick={() => removeQuoteItem(index)}
                          style={{
                            padding: "6px 10px",
                            background: "#dc2626",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr>
                    <td colSpan="7" style={{ textAlign: "right" }}>
                      <strong>Subtotal</strong>
                    </td>
                    <td>
                      <strong>{money(quoteSubtotal)}</strong>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div
              style={{
                marginTop: "18px",
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <input
                placeholder="Company Name"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                style={{ padding: "10px", minWidth: "220px", flex: "1 1 220px" }}
              />

              <input
                placeholder="Attn To"
                value={attn}
                onChange={(e) => setAttn(e.target.value)}
                style={{ padding: "10px", minWidth: "180px", flex: "1 1 180px" }}
              />

              <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ padding: "10px", minWidth: "240px", flex: "1 1 240px" }}
              />
            </div>

            <button
              onClick={generatePDF}
              style={{
                marginTop: "18px",
                padding: "10px 20px",
                background: "#1f4ed8",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Download Quote PDF
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;