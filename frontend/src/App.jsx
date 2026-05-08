// import { useEffect, useState } from "react";
// import axios from "axios";
// import { jsPDF } from "jspdf";
// import "./App.css";
// import leftLogo from "./assets/leftLogo.jpeg";
// import rightLogo from "./assets/rightLogo.png";

// const API = axios.create({
//   baseURL: "http://localhost:5001",
// });

// const emptyCompany = {
//   type: "contractor",
//   name: "",
//   address_1: "",
//   address_2: "",
//   city: "",
//   state: "",
//   zipcode: "",
//   notes: "",
// };

// const emptyContact = {
//   company_id: "",
//   first_name: "",
//   last_name: "",
//   email: "",
//   tel: "",
//   mobile: "",
//   role: "",
//   notes: "",
// };

// const emptyQuote = {
//   company_id: "",
//   contact_id: "",
//   company_name: "",
//   attn: "",
//   email: "",
//   model: "",
//   serial_number: "",
//   status: "quoted",
//   customer_po_number: "",
//   ordered_date: "",
//   order_confirmation_number: "",
//   order_confirmation_date: "",
//   vendor_order_confirmation_number: "",
//   vendor_order_confirmation_date: "",
//   notes: "",
// };

// const emptyLine = {
//   part_number: "",
//   description: "",
//   vendor: "",
//   list_price: 0,
//   surcharge: 0,
//   multiplier: 1,
//   markup: 0,
//   sell_price: 0,
//   qty: 1,
//   notes: "",
// };

// function App() {
//   const [companies, setCompanies] = useState([]);
//   const [contacts, setContacts] = useState([]);
//   const [quotes, setQuotes] = useState([]);

//   const [companyForm, setCompanyForm] = useState(emptyCompany);
//   const [contactForm, setContactForm] = useState(emptyContact);
//   const [quoteForm, setQuoteForm] = useState(emptyQuote);
//   const [lineItems, setLineItems] = useState([{ ...emptyLine }]);

//   const [editingCompanyId, setEditingCompanyId] = useState(null);
//   const [editingContactId, setEditingContactId] = useState(null);
//   const [editingQuoteId, setEditingQuoteId] = useState(null);

//   const [quoteSearch, setQuoteSearch] = useState("");
//   const [statusFilter, setStatusFilter] = useState("all");

//   const money = (value) =>
//     Number(value || 0).toLocaleString("en-US", {
//       style: "currency",
//       currency: "USD",
//     });

//   const toNumber = (value, fallback = 0) => {
//     if (value === "" || value === null || value === undefined) return fallback;
//     const num = Number(value);
//     return Number.isFinite(num) ? num : fallback;
//   };

//   const contactsForQuoteCompany = contacts.filter(
//     (contact) => Number(contact.company_id) === Number(quoteForm.company_id)
//   );

//   const loadData = async () => {
//     const companyRes = await API.get("/companies");
//     const contactRes = await API.get("/contacts");
//     const quoteRes = await API.get("/quotes");

//     setCompanies(companyRes.data);
//     setContacts(contactRes.data);
//     setQuotes(quoteRes.data);
//   };

//   useEffect(() => {
//     loadData();
//   }, []);

//   const handleCompanyChange = (e) => {
//     setCompanyForm({ ...companyForm, [e.target.name]: e.target.value });
//   };

//   const saveCompany = async (e) => {
//     e.preventDefault();

//     if (editingCompanyId) {
//       await API.put(`/companies/${editingCompanyId}`, companyForm);
//     } else {
//       await API.post("/companies", companyForm);
//     }

//     setCompanyForm(emptyCompany);
//     setEditingCompanyId(null);
//     loadData();
//   };

//   const editCompany = (company) => {
//     setCompanyForm(company);
//     setEditingCompanyId(company.id);
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   };

//   const deleteCompany = async (id) => {
//     await API.delete(`/companies/${id}`);
//     loadData();
//   };

//   const handleContactChange = (e) => {
//     setContactForm({ ...contactForm, [e.target.name]: e.target.value });
//   };

//   const saveContact = async (e) => {
//     e.preventDefault();

//     const payload = {
//       ...contactForm,
//       company_id: contactForm.company_id || null,
//     };

//     if (editingContactId) {
//       await API.put(`/contacts/${editingContactId}`, payload);
//     } else {
//       await API.post("/contacts", payload);
//     }

//     setContactForm(emptyContact);
//     setEditingContactId(null);
//     loadData();
//   };

//   const editContact = (contact) => {
//     setContactForm({
//       ...contact,
//       company_id: contact.company_id || "",
//     });
//     setEditingContactId(contact.id);
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   };

//   const deleteContact = async (id) => {
//     await API.delete(`/contacts/${id}`);
//     loadData();
//   };

//   const handleQuoteChange = (e) => {
//     const { name, value } = e.target;

//     if (name === "company_id") {
//       const selectedCompany = companies.find((c) => c.id === Number(value));

//       setQuoteForm({
//         ...quoteForm,
//         company_id: value,
//         contact_id: "",
//         company_name: selectedCompany?.name || "",
//         attn: "",
//         email: "",
//       });

//       return;
//     }

//     if (name === "contact_id") {
//       const selectedContact = contacts.find((c) => c.id === Number(value));

//       setQuoteForm({
//         ...quoteForm,
//         contact_id: value,
//         attn: selectedContact
//           ? `${selectedContact.first_name || ""} ${
//               selectedContact.last_name || ""
//             }`.trim()
//           : "",
//         email: selectedContact?.email || "",
//       });

//       return;
//     }

//     setQuoteForm({ ...quoteForm, [name]: value });
//   };

//   const updateLine = (index, field, value) => {
//     const updated = [...lineItems];
//     updated[index][field] = value;

//     const list = toNumber(updated[index].list_price);
//     const surcharge = toNumber(updated[index].surcharge);
//     const multiplier = toNumber(updated[index].multiplier, 1);
//     const markup = toNumber(updated[index].markup);
//     const qty = toNumber(updated[index].qty, 1);

//     if (["list_price", "surcharge", "multiplier", "markup"].includes(field)) {
//       updated[index].sell_price = Math.ceil(
//         list * (1 + surcharge) * multiplier * (1 + markup)
//       );
//     }

//     updated[index].total = toNumber(updated[index].sell_price) * qty;
//     setLineItems(updated);
//   };

//   const addLine = () => setLineItems([...lineItems, { ...emptyLine }]);

//   const removeLine = (index) => {
//     setLineItems(lineItems.filter((_, i) => i !== index));
//   };

//   const quoteTotal = lineItems.reduce(
//     (sum, item) => sum + toNumber(item.sell_price) * toNumber(item.qty, 1),
//     0
//   );

//   const saveQuote = async (e) => {
//     e.preventDefault();

//     const payload = {
//       ...quoteForm,
//       company_id: quoteForm.company_id || null,
//       contact_id: quoteForm.contact_id || null,
//       line_items: lineItems.map((item) => ({
//         part_number: item.part_number,
//         description: item.description,
//         vendor: item.vendor,
//         list_price: toNumber(item.list_price),
//         surcharge: toNumber(item.surcharge),
//         multiplier: toNumber(item.multiplier, 1),
//         markup: toNumber(item.markup),
//         sell_price: toNumber(item.sell_price),
//         qty: toNumber(item.qty, 1),
//         total: toNumber(item.sell_price) * toNumber(item.qty, 1),
//         notes: item.notes,
//       })),
//     };

//     if (editingQuoteId) {
//       await API.put(`/quotes/${editingQuoteId}`, payload);
//     } else {
//       await API.post("/quotes", payload);
//     }

//     setQuoteForm(emptyQuote);
//     setLineItems([{ ...emptyLine }]);
//     setEditingQuoteId(null);
//     loadData();
//   };

//   const editQuote = async (id) => {
//     const res = await API.get(`/quotes/${id}`);
//     const quote = res.data;

//     setQuoteForm({
//       company_id: quote.company_id || "",
//       contact_id: quote.contact_id || "",
//       company_name: quote.company_name || "",
//       attn: quote.attn || "",
//       email: quote.email || "",
//       model: quote.model || "",
//       serial_number: quote.serial_number || "",
//       status: quote.status || "quoted",
//       customer_po_number: quote.customer_po_number || "",
//       ordered_date: quote.ordered_date || "",
//       order_confirmation_number: quote.order_confirmation_number || "",
//       order_confirmation_date: quote.order_confirmation_date || "",
//       vendor_order_confirmation_number:
//         quote.vendor_order_confirmation_number || "",
//       vendor_order_confirmation_date:
//         quote.vendor_order_confirmation_date || "",
//       notes: quote.notes || "",
//     });

//     setLineItems(
//       quote.line_items?.length
//         ? quote.line_items.map((item) => ({
//             part_number: item.part_number || "",
//             description: item.description || "",
//             vendor: item.vendor || "",
//             list_price: item.list_price || 0,
//             surcharge: item.surcharge || 0,
//             multiplier: item.multiplier ?? 1,
//             markup: item.markup ?? 0,
//             sell_price: item.sell_price || 0,
//             qty: item.qty || 1,
//             notes: item.notes || "",
//           }))
//         : [{ ...emptyLine }]
//     );

//     setEditingQuoteId(id);
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   };

//   const deleteQuote = async (id) => {
//     await API.delete(`/quotes/${id}`);
//     loadData();
//   };

//   const filteredQuotes = quotes.filter((quote) => {
//     const search = quoteSearch.toLowerCase();

//     const matchesSearch =
//       quote.date?.toLowerCase().includes(search) ||
//       quote.quote_number?.toLowerCase().includes(search) ||
//       quote.company_name?.toLowerCase().includes(search) ||
//       quote.model?.toLowerCase().includes(search) ||
//       quote.serial_number?.toLowerCase().includes(search) ||
//       String(quote.total || "").toLowerCase().includes(search) ||
//       quote.status?.toLowerCase().includes(search);

//     const matchesStatus =
//       statusFilter === "all" || quote.status === statusFilter;

//     return matchesSearch && matchesStatus;
//   });

//   const quotedQuotes = quotes.filter((quote) => quote.status === "quoted");
//   const orderedQuotes = quotes.filter((quote) => quote.status === "ordered");

//   const quotedTotal = quotedQuotes.reduce(
//     (sum, quote) => sum + toNumber(quote.total),
//     0
//   );

//   const orderedTotal = orderedQuotes.reduce(
//     (sum, quote) => sum + toNumber(quote.total),
//     0
//   );

//   const drawPdfHeader = (doc, title, quote) => {
//   doc.addImage(leftLogo, "JPEG", 14, 10, 62, 32);
// doc.addImage(rightLogo, "PNG", 118, 20, 78, 22);

//   doc.setFontSize(18);
//   doc.setFont(undefined, "bold");
//   doc.text(title, 105, 58, { align: "center" });

//   doc.setFontSize(10);
//   doc.setFont(undefined, "normal");

//   let y = 72;

//   doc.text(`Quote #: ${quote.quote_number || ""}`, 14, y);
//   y += 6;
//   doc.text(`Date: ${quote.date || ""}`, 14, y);

//   y += 14;
//   doc.text(`Company: ${quote.company_name || ""}`, 14, y);
//   y += 6;
//   doc.text(`Attn: ${quote.attn || ""}`, 14, y);
//   y += 6;
//   doc.text(`Email: ${quote.email || ""}`, 14, y);

//   if (quote.model) {
//     y += 6;
//     doc.text(`Model: ${quote.model}`, 14, y);
//   }

//   if (quote.serial_number) {
//     y += 6;
//     doc.text(`Serial #: ${quote.serial_number}`, 14, y);
//   }

//   if (title === "PURCHASE ORDER" || title === "ORDER CONFIRMATION") {
//     if (quote.customer_po_number) {
//       y += 6;
//       doc.text(`Customer PO #: ${quote.customer_po_number}`, 14, y);
//     }

//     if (quote.ordered_date) {
//       y += 6;
//       doc.text(`Ordered Date: ${quote.ordered_date}`, 14, y);
//     }
//   }

// if (title === "ORDER CONFIRMATION") {
//   if (quote.order_confirmation_number) {
//     y += 6;
//     doc.text(`Order Confirmation #: ${quote.order_confirmation_number}`, 14, y);
//   }

//   if (quote.order_confirmation_date) {
//     y += 6;
//     doc.text(`Order Confirmation Date: ${quote.order_confirmation_date}`, 14, y);
//   }

//   y += 12;

//   doc.setFont(undefined, "bold");
//   doc.text("Bill To:", 14, y);
//   doc.text("Ship To:", 110, y);

//   y += 6;

//   doc.setFont(undefined, "normal");
//   doc.text(quote.company_name || "", 14, y);
//   doc.text(quote.company_name || "", 110, y);

//   y += 6;

//   if (quote.attn) {
//     doc.text(`Attn: ${quote.attn}`, 14, y);
//     doc.text(`Attn: ${quote.attn}`, 110, y);
//     y += 6;
//   }

//   if (quote.email) {
//     doc.text(`Email: ${quote.email}`, 14, y);
//     doc.text(`Email: ${quote.email}`, 110, y);
//     y += 6;
//   }
// }

//   return y + 18;
// };

// const drawPdfTableHeader = (doc, y) => {
//   doc.setFont(undefined, "bold");
//   doc.setFontSize(10);

//   doc.text("Line", 14, y);
//   doc.text("Part Number", 26, y);
//   doc.text("Description", 65, y);
//   doc.text("Qty", 148, y, { align: "center" });
//   doc.text("Unit Price", 168, y, { align: "center" });
//   doc.text("Total", 196, y, { align: "right" });

//   y += 5;
//   doc.line(14, y, 196, y);

//   return y + 8;
// };

// const drawPdfLineItems = (doc, quote, y) => {
//   y = drawPdfTableHeader(doc, y);

//   doc.setFont(undefined, "normal");
//   doc.setFontSize(10);

//   quote.line_items?.forEach((item, index) => {
//     const unit = toNumber(item.sell_price);
//     const qty = toNumber(item.qty, 1);
//     const total = unit * qty;

//     const descLines = doc.splitTextToSize(item.description || "", 78);
//     const rowHeight = Math.max(descLines.length * 5 + 2, 8);

//     if (y + rowHeight > 265) {
//       doc.addPage();
//       y = drawPdfTableHeader(doc, 25);
//       doc.setFont(undefined, "normal");
//       doc.setFontSize(10);
//     }

//     doc.text(String(index + 1), 14, y);
//     doc.text(item.part_number || "", 26, y);
//     doc.text(descLines, 65, y);
//     doc.text(String(qty), 148, y, { align: "center" });
//     doc.text(money(unit), 168, y, { align: "center" });
//     doc.text(money(total), 196, y, { align: "right" });

//     y += rowHeight;
//   });

//   y += 4;
//   doc.line(120, y, 196, y);

//   y += 8;
//   doc.setFontSize(12);
//   doc.setFont(undefined, "bold");
//   doc.text(`Subtotal: ${money(quote.total)}`, 196, y, { align: "right" });

//   y += 18;
//   doc.setFontSize(10);
//   doc.setFont(undefined, "italic");
//   doc.text("Freight and applicable sales tax not included.", 14, y);

//   y += 12;
//   doc.setFont(undefined, "normal");
//   doc.text("Heat Transfer Equipment Company, Inc. | partsales@htecompany.com", 14, y);

//   y += 6;
//   doc.setFontSize(9);
//   doc.text("If you have any questions, please feel free to reach out.", 14, y);
// };

// const generateDocumentPdf = async (quoteId, type) => {
//   const res = await API.get(`/quotes/${quoteId}`);
//   const quote = res.data;

//   const doc = new jsPDF();

//   const title =
//     type === "quote"
//       ? "QUOTE"
//       : type === "po"
//       ? "PURCHASE ORDER"
//       : "ORDER CONFIRMATION";

//   let y = drawPdfHeader(doc, title, quote);
//   drawPdfLineItems(doc, quote, y);

//   const filePrefix =
//     type === "quote"
//       ? "Quote"
//       : type === "po"
//       ? "PO"
//       : "Order_Confirmation";

//   doc.save(`${filePrefix}_${quote.quote_number}.pdf`);
// };

//   return (
//     <div className="app-container">
//       <div className="page-header">
//         <div>
//           <h1>Parts Quoting</h1>
//           <p>Manage quotes, customers, contacts, and order tracking.</p>
//         </div>
//       </div>

//       <div className="dashboard-grid">
//         <div className="dashboard-card">
//           <span>Total Quotes</span>
//           <strong>{quotes.length}</strong>
//         </div>
//         <div className="dashboard-card">
//           <span>Quoted</span>
//           <strong>{quotedQuotes.length}</strong>
//           <small>{money(quotedTotal)}</small>
//         </div>
//         <div className="dashboard-card">
//           <span>Ordered</span>
//           <strong>{orderedQuotes.length}</strong>
//           <small>{money(orderedTotal)}</small>
//         </div>
//         <div className="dashboard-card">
//           <span>Total Value</span>
//           <strong>{money(quotedTotal + orderedTotal)}</strong>
//         </div>
//       </div>

//       <section className="card">
//         <div className="section-header">
//           <div>
//             <h2>{editingQuoteId ? "Edit Quote" : "Create Quote"}</h2>
//             <p>Save quote details, parts, pricing, and order information.</p>
//           </div>
//         </div>

//         <form onSubmit={saveQuote}>
//           <div className="form-grid">
//             <select
//               name="company_id"
//               value={quoteForm.company_id}
//               onChange={handleQuoteChange}
//             >
//               <option value="">Select Company</option>
//               {companies.map((company) => (
//                 <option key={company.id} value={company.id}>
//                   {company.name}
//                 </option>
//               ))}
//             </select>

//             <select
//               name="contact_id"
//               value={quoteForm.contact_id}
//               onChange={handleQuoteChange}
//               disabled={!quoteForm.company_id}
//             >
//               <option value="">
//                 {quoteForm.company_id ? "Select Contact" : "Select Company First"}
//               </option>
//               {contactsForQuoteCompany.map((contact) => (
//                 <option key={contact.id} value={contact.id}>
//                   {contact.first_name} {contact.last_name}
//                 </option>
//               ))}
//             </select>

//             <input name="company_name" placeholder="Company" value={quoteForm.company_name || ""} onChange={handleQuoteChange} />
//             <input name="attn" placeholder="Attn" value={quoteForm.attn || ""} onChange={handleQuoteChange} />
//             <input name="email" placeholder="Email" value={quoteForm.email || ""} onChange={handleQuoteChange} />
//             <input name="model" placeholder="Model" value={quoteForm.model || ""} onChange={handleQuoteChange} />
//             <input name="serial_number" placeholder="Serial Number" value={quoteForm.serial_number || ""} onChange={handleQuoteChange} />

//             <select name="status" value={quoteForm.status} onChange={handleQuoteChange}>
//               <option value="quoted">Quoted</option>
//               <option value="ordered">Ordered</option>
//             </select>

//             <input name="customer_po_number" placeholder="Customer PO #" value={quoteForm.customer_po_number || ""} onChange={handleQuoteChange} />
//             <input type="date" name="ordered_date" value={quoteForm.ordered_date || ""} onChange={handleQuoteChange} />
//             <input name="order_confirmation_number" placeholder="Order Confirmation #" value={quoteForm.order_confirmation_number || ""} onChange={handleQuoteChange} />
//             <input type="date" name="order_confirmation_date" value={quoteForm.order_confirmation_date || ""} onChange={handleQuoteChange} />
//             <input name="vendor_order_confirmation_number" placeholder="Vendor Order Confirmation #" value={quoteForm.vendor_order_confirmation_number || ""} onChange={handleQuoteChange} />
//             <input type="date" name="vendor_order_confirmation_date" value={quoteForm.vendor_order_confirmation_date || ""} onChange={handleQuoteChange} />

//             <textarea className="wide-field" name="notes" placeholder="Quote Notes" value={quoteForm.notes || ""} onChange={handleQuoteChange} />
//           </div>

//           <h3>Line Items</h3>

//           <div className="table-wrap">
//             <table className="line-table">
//               <thead>
//                 <tr>
//                   <th>Part #</th>
//                   <th>Description</th>
//                   <th>Vendor</th>
//                   <th>List</th>
//                   <th>Surcharge</th>
//                   <th>Multiplier</th>
//                   <th>Markup</th>
//                   <th>Sell</th>
//                   <th>Qty</th>
//                   <th>Total</th>
//                   <th>Notes</th>
//                   <th></th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {lineItems.map((item, index) => (
//                   <tr key={index}>
//                     <td><input value={item.part_number || ""} onChange={(e) => updateLine(index, "part_number", e.target.value)} /></td>
//                     <td><textarea value={item.description || ""} onChange={(e) => updateLine(index, "description", e.target.value)} /></td>
//                     <td><input value={item.vendor || ""} onChange={(e) => updateLine(index, "vendor", e.target.value)} /></td>
//                     <td><input type="number" value={item.list_price ?? ""} onChange={(e) => updateLine(index, "list_price", e.target.value)} /></td>
//                     <td><input type="number" step="0.01" value={item.surcharge ?? ""} onChange={(e) => updateLine(index, "surcharge", e.target.value)} /></td>
//                     <td><input type="number" step="0.01" min="0" value={item.multiplier ?? ""} onChange={(e) => updateLine(index, "multiplier", e.target.value)} /></td>
//                     <td><input type="number" step="0.01" value={item.markup ?? ""} onChange={(e) => updateLine(index, "markup", e.target.value)} /></td>
//                     <td><input type="number" value={item.sell_price ?? ""} onChange={(e) => updateLine(index, "sell_price", e.target.value)} /></td>
//                     <td><input type="number" value={item.qty ?? ""} onChange={(e) => updateLine(index, "qty", e.target.value)} /></td>
//                     <td className="money-cell">{money(toNumber(item.sell_price) * toNumber(item.qty, 1))}</td>
//                     <td><input value={item.notes || ""} onChange={(e) => updateLine(index, "notes", e.target.value)} /></td>
//                     <td><button className="icon-btn danger" type="button" onClick={() => removeLine(index)}>X</button></td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           <div className="form-actions">
//             <button className="secondary-btn" type="button" onClick={addLine}>
//               Add Line Item
//             </button>
//             <div className="quote-total">Total: {money(quoteTotal)}</div>
//             <button className="primary-btn" type="submit">
//               {editingQuoteId ? "Update Quote" : "Save Quote"}
//             </button>
//           </div>
//         </form>
//       </section>

//       <section className="card">
//         <div className="section-header">
//           <div>
//             <h2>Quote Dashboard</h2>
//             <p>Search by date, quote #, company, model, serial #, total, or status.</p>
//           </div>
//           <div className="quote-tools">
//             <input placeholder="Search quotes..." value={quoteSearch} onChange={(e) => setQuoteSearch(e.target.value)} />
//             <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
//               <option value="all">All Status</option>
//               <option value="quoted">Quoted</option>
//               <option value="ordered">Ordered</option>
//             </select>
//           </div>
//         </div>

//         <div className="table-wrap">
//           <table className="dashboard-table">
//             <thead>
//               <tr>
//                 <th>Date</th>
//                 <th>Quote #</th>
//                 <th>Company</th>
//                 <th>Model</th>
//                 <th>Serial #</th>
//                 <th>Total</th>
//                 <th>Status</th>
//                 <th className="actions-col">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filteredQuotes.map((quote) => (
//                 <tr key={quote.id}>
//                   <td>{quote.date}</td>
//                   <td className="quote-number">{quote.quote_number}</td>
//                   <td>{quote.company_name}</td>
//                   <td>{quote.model}</td>
//                   <td>{quote.serial_number}</td>
//                   <td className="money-cell">{money(quote.total)}</td>
//                   <td><span className={`status-pill ${quote.status}`}>{quote.status}</span></td>
//                   <td className="button-group">
//                     <button type="button" onClick={() => editQuote(quote.id)}>Edit</button>
//                     <button type="button" onClick={() => generateDocumentPdf(quote.id, "quote")}>Quote PDF</button>
//                     <button type="button" onClick={() => generateDocumentPdf(quote.id, "po")}>PO PDF</button>
//                     <button type="button" onClick={() => generateDocumentPdf(quote.id, "order_confirmation")}>OC PDF</button>
//                     <button type="button" className="danger-text" onClick={() => deleteQuote(quote.id)}>Delete</button>
//                   </td>
//                 </tr>
//               ))}
//               {filteredQuotes.length === 0 && (
//                 <tr>
//                   <td colSpan="8" className="empty-row">No quotes found.</td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </section>

//       <section className="card">
//         <div className="section-header">
//           <div>
//             <h2>Companies</h2>
//             <p>Add and manage vendors, contractors, wholesalers, and end users.</p>
//           </div>
//         </div>

//         <form onSubmit={saveCompany} className="form-grid">
//           <select name="type" value={companyForm.type} onChange={handleCompanyChange}>
//             <option value="vendor">Vendor</option>
//             <option value="contractor">Contractor</option>
//             <option value="wholesaler">Wholesaler</option>
//             <option value="end_user">End User</option>
//           </select>
//           <input name="name" placeholder="Company Name" value={companyForm.name} onChange={handleCompanyChange} required />
//           <input name="address_1" placeholder="Address 1" value={companyForm.address_1 || ""} onChange={handleCompanyChange} />
//           <input name="address_2" placeholder="Address 2" value={companyForm.address_2 || ""} onChange={handleCompanyChange} />
//           <input name="city" placeholder="City" value={companyForm.city || ""} onChange={handleCompanyChange} />
//           <input name="state" placeholder="State" value={companyForm.state || ""} onChange={handleCompanyChange} />
//           <input name="zipcode" placeholder="Zipcode" value={companyForm.zipcode || ""} onChange={handleCompanyChange} />
//           <textarea className="wide-field" name="notes" placeholder="Notes" value={companyForm.notes || ""} onChange={handleCompanyChange} />
//           <button className="primary-btn" type="submit">{editingCompanyId ? "Update Company" : "Add Company"}</button>
//         </form>
//       </section>

//       <section className="card">
//         <div className="section-header">
//           <div>
//             <h2>Contacts</h2>
//             <p>Add customer, vendor, and internal contacts.</p>
//           </div>
//         </div>

//         <form onSubmit={saveContact} className="form-grid">
//           <select name="company_id" value={contactForm.company_id} onChange={handleContactChange}>
//             <option value="">Select Company</option>
//             {companies.map((company) => (
//               <option key={company.id} value={company.id}>{company.name}</option>
//             ))}
//           </select>
//           <input name="first_name" placeholder="First Name" value={contactForm.first_name || ""} onChange={handleContactChange} />
//           <input name="last_name" placeholder="Last Name" value={contactForm.last_name || ""} onChange={handleContactChange} />
//           <input name="email" placeholder="Email" value={contactForm.email || ""} onChange={handleContactChange} />
//           <input name="tel" placeholder="Tel" value={contactForm.tel || ""} onChange={handleContactChange} />
//           <input name="mobile" placeholder="Mobile" value={contactForm.mobile || ""} onChange={handleContactChange} />
//           <input name="role" placeholder="Role" value={contactForm.role || ""} onChange={handleContactChange} />
//           <textarea className="wide-field" name="notes" placeholder="Notes" value={contactForm.notes || ""} onChange={handleContactChange} />
//           <button className="primary-btn" type="submit">{editingContactId ? "Update Contact" : "Add Contact"}</button>
//         </form>
//       </section>
//     </div>
//   );
// }

// export default App;


// import { useEffect, useState } from "react";
// import axios from "axios";
// import { jsPDF } from "jspdf";
// import leftLogo from "./assets/leftLogo.jpeg";
// import rightLogo from "./assets/rightLogo.png";
// import "./App.css";

// const API = axios.create({
//   baseURL: "http://localhost:5001",
// });

// const emptyCompany = {
//   type: "contractor",
//   name: "",
//   address_1: "",
//   address_2: "",
//   city: "",
//   state: "",
//   zipcode: "",
//   notes: "",
// };

// const emptyContact = {
//   company_id: "",
//   first_name: "",
//   last_name: "",
//   email: "",
//   tel: "",
//   mobile: "",
//   role: "",
//   notes: "",
// };

// const emptyQuote = {
//   company_id: "",
//   contact_id: "",
//   company_name: "",
//   attn: "",
//   email: "",
//   model: "",
//   serial_number: "",
//   status: "quoted",
//   customer_po_number: "",
//   ordered_date: "",
//   order_confirmation_number: "",
//   order_confirmation_date: "",
//   vendor_order_confirmation_number: "",
//   vendor_order_confirmation_date: "",
//   ship_to_company: "",
//   ship_to_address_1: "",
//   ship_to_address_2: "",
//   ship_to_city: "",
//   ship_to_state: "",
//   ship_to_zipcode: "",
//   ship_to_notes: "",
//   notes: "",
// };

// const emptyLine = {
//   part_number: "",
//   description: "",
//   vendor: "",
//   list_price: 0,
//   surcharge: 0,
//   multiplier: 1,
//   markup: 0,
//   sell_price: 0,
//   qty: 1,
//   notes: "",
// };

// function App() {
//   const [companies, setCompanies] = useState([]);
//   const [contacts, setContacts] = useState([]);
//   const [quotes, setQuotes] = useState([]);

//   const [companyForm, setCompanyForm] = useState(emptyCompany);
//   const [contactForm, setContactForm] = useState(emptyContact);
//   const [quoteForm, setQuoteForm] = useState(emptyQuote);
//   const [lineItems, setLineItems] = useState([{ ...emptyLine }]);

//   const [editingCompanyId, setEditingCompanyId] = useState(null);
//   const [editingContactId, setEditingContactId] = useState(null);
//   const [editingQuoteId, setEditingQuoteId] = useState(null);

//   const [quoteSearch, setQuoteSearch] = useState("");
//   const [statusFilter, setStatusFilter] = useState("all");

//   const money = (value) =>
//     Number(value || 0).toLocaleString("en-US", {
//       style: "currency",
//       currency: "USD",
//     });

//   const toNumber = (value, fallback = 0) => {
//     if (value === "" || value === null || value === undefined) return fallback;
//     const num = Number(value);
//     return Number.isFinite(num) ? num : fallback;
//   };

//   const contactsForQuoteCompany = contacts.filter(
//     (contact) => Number(contact.company_id) === Number(quoteForm.company_id)
//   );

//   const loadData = async () => {
//     const companyRes = await API.get("/companies");
//     const contactRes = await API.get("/contacts");
//     const quoteRes = await API.get("/quotes");

//     setCompanies(companyRes.data);
//     setContacts(contactRes.data);
//     setQuotes(quoteRes.data);
//   };

//   useEffect(() => {
//     loadData();
//   }, []);

//   const handleCompanyChange = (e) => {
//     setCompanyForm({ ...companyForm, [e.target.name]: e.target.value });
//   };

//   const saveCompany = async (e) => {
//     e.preventDefault();

//     if (editingCompanyId) {
//       await API.put(`/companies/${editingCompanyId}`, companyForm);
//     } else {
//       await API.post("/companies", companyForm);
//     }

//     setCompanyForm(emptyCompany);
//     setEditingCompanyId(null);
//     loadData();
//   };

//   const editCompany = (company) => {
//     setCompanyForm(company);
//     setEditingCompanyId(company.id);
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   };

//   const deleteCompany = async (id) => {
//     await API.delete(`/companies/${id}`);
//     loadData();
//   };

//   const handleContactChange = (e) => {
//     setContactForm({ ...contactForm, [e.target.name]: e.target.value });
//   };

//   const saveContact = async (e) => {
//     e.preventDefault();

//     const payload = {
//       ...contactForm,
//       company_id: contactForm.company_id || null,
//     };

//     if (editingContactId) {
//       await API.put(`/contacts/${editingContactId}`, payload);
//     } else {
//       await API.post("/contacts", payload);
//     }

//     setContactForm(emptyContact);
//     setEditingContactId(null);
//     loadData();
//   };

//   const editContact = (contact) => {
//     setContactForm({
//       ...contact,
//       company_id: contact.company_id || "",
//     });
//     setEditingContactId(contact.id);
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   };

//   const deleteContact = async (id) => {
//     await API.delete(`/contacts/${id}`);
//     loadData();
//   };

//   const handleQuoteChange = (e) => {
//     const { name, value } = e.target;

//     if (name === "company_id") {
//       const selectedCompany = companies.find((c) => c.id === Number(value));

//       setQuoteForm({
//         ...quoteForm,
//         company_id: value,
//         contact_id: "",
//         company_name: selectedCompany?.name || "",
//         attn: "",
//         email: "",
//       });

//       return;
//     }

//     if (name === "contact_id") {
//       const selectedContact = contacts.find((c) => c.id === Number(value));

//       setQuoteForm({
//         ...quoteForm,
//         contact_id: value,
//         attn: selectedContact
//           ? `${selectedContact.first_name || ""} ${
//               selectedContact.last_name || ""
//             }`.trim()
//           : "",
//         email: selectedContact?.email || "",
//       });

//       return;
//     }

//     setQuoteForm({ ...quoteForm, [name]: value });
//   };

//   const updateLine = (index, field, value) => {
//     const updated = [...lineItems];
//     updated[index][field] = value;

//     const list = toNumber(updated[index].list_price);
//     const surcharge = toNumber(updated[index].surcharge);
//     const multiplier = toNumber(updated[index].multiplier, 1);
//     const markup = toNumber(updated[index].markup);
//     const qty = toNumber(updated[index].qty, 1);

//     if (["list_price", "surcharge", "multiplier", "markup"].includes(field)) {
//       updated[index].sell_price = Math.ceil(
//         list * (1 + surcharge) * multiplier * (1 + markup)
//       );
//     }

//     updated[index].total = toNumber(updated[index].sell_price) * qty;
//     setLineItems(updated);
//   };

//   const addLine = () => setLineItems([...lineItems, { ...emptyLine }]);

//   const removeLine = (index) => {
//     setLineItems(lineItems.filter((_, i) => i !== index));
//   };

//   const quoteTotal = lineItems.reduce(
//     (sum, item) => sum + toNumber(item.sell_price) * toNumber(item.qty, 1),
//     0
//   );

//   const saveQuote = async (e) => {
//     e.preventDefault();

//     const payload = {
//       ...quoteForm,
//       company_id: quoteForm.company_id || null,
//       contact_id: quoteForm.contact_id || null,
//       line_items: lineItems.map((item) => ({
//         part_number: item.part_number,
//         description: item.description,
//         vendor: item.vendor,
//         list_price: toNumber(item.list_price),
//         surcharge: toNumber(item.surcharge),
//         multiplier: toNumber(item.multiplier, 1),
//         markup: toNumber(item.markup),
//         sell_price: toNumber(item.sell_price),
//         qty: toNumber(item.qty, 1),
//         total: toNumber(item.sell_price) * toNumber(item.qty, 1),
//         notes: item.notes,
//       })),
//     };

//     if (editingQuoteId) {
//       await API.put(`/quotes/${editingQuoteId}`, payload);
//     } else {
//       await API.post("/quotes", payload);
//     }

//     setQuoteForm(emptyQuote);
//     setLineItems([{ ...emptyLine }]);
//     setEditingQuoteId(null);
//     loadData();
//   };

//   const editQuote = async (id) => {
//     const res = await API.get(`/quotes/${id}`);
//     const quote = res.data;

//     setQuoteForm({
//       company_id: quote.company_id || "",
//       contact_id: quote.contact_id || "",
//       company_name: quote.company_name || "",
//       attn: quote.attn || "",
//       email: quote.email || "",
//       model: quote.model || "",
//       serial_number: quote.serial_number || "",
//       status: quote.status || "quoted",
//       customer_po_number: quote.customer_po_number || "",
//       ordered_date: quote.ordered_date || "",
//       order_confirmation_number: quote.order_confirmation_number || "",
//       order_confirmation_date: quote.order_confirmation_date || "",
//       vendor_order_confirmation_number:
//         quote.vendor_order_confirmation_number || "",
//       vendor_order_confirmation_date:
//         quote.vendor_order_confirmation_date || "",
//       ship_to_company: quote.ship_to_company || "",
//       ship_to_address_1: quote.ship_to_address_1 || "",
//       ship_to_address_2: quote.ship_to_address_2 || "",
//       ship_to_city: quote.ship_to_city || "",
//       ship_to_state: quote.ship_to_state || "",
//       ship_to_zipcode: quote.ship_to_zipcode || "",
//       ship_to_notes: quote.ship_to_notes || "",
//       notes: quote.notes || "",
//     });

//     setLineItems(
//       quote.line_items?.length
//         ? quote.line_items.map((item) => ({
//             part_number: item.part_number || "",
//             description: item.description || "",
//             vendor: item.vendor || "",
//             list_price: item.list_price || 0,
//             surcharge: item.surcharge || 0,
//             multiplier: item.multiplier ?? 1,
//             markup: item.markup ?? 0,
//             sell_price: item.sell_price || 0,
//             qty: item.qty || 1,
//             notes: item.notes || "",
//           }))
//         : [{ ...emptyLine }]
//     );

//     setEditingQuoteId(id);
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   };

//   const deleteQuote = async (id) => {
//     await API.delete(`/quotes/${id}`);
//     loadData();
//   };

//   const filteredQuotes = quotes.filter((quote) => {
//     const search = quoteSearch.toLowerCase();

//     const matchesSearch =
//       quote.date?.toLowerCase().includes(search) ||
//       quote.quote_number?.toLowerCase().includes(search) ||
//       quote.company_name?.toLowerCase().includes(search) ||
//       quote.model?.toLowerCase().includes(search) ||
//       quote.serial_number?.toLowerCase().includes(search) ||
//       String(quote.total || "").toLowerCase().includes(search) ||
//       quote.status?.toLowerCase().includes(search);

//     const matchesStatus =
//       statusFilter === "all" || quote.status === statusFilter;

//     return matchesSearch && matchesStatus;
//   });

//   const quotedQuotes = quotes.filter((quote) => quote.status === "quoted");
//   const orderedQuotes = quotes.filter((quote) => quote.status === "ordered");

//   const quotedTotal = quotedQuotes.reduce(
//     (sum, quote) => sum + toNumber(quote.total),
//     0
//   );

//   const orderedTotal = orderedQuotes.reduce(
//     (sum, quote) => sum + toNumber(quote.total),
//     0
//   );

//   const drawPdfHeader = (doc, title, quote) => {
//     doc.addImage(leftLogo, "JPEG", 14, 16, 62, 32);
//     doc.addImage(rightLogo, "PNG", 118, 30, 78, 22);

//     doc.setFontSize(18);
//     doc.setFont(undefined, "bold");
//     doc.text(title, 105, 70, { align: "center" });

//     doc.setFontSize(10);
//     doc.setFont(undefined, "normal");

//     let y = 86;

//     doc.text(`Quote #: ${quote.quote_number || ""}`, 14, y);
//     y += 6;
//     doc.text(`Date: ${quote.date || ""}`, 14, y);

//     y += 14;

//     if (title !== "ORDER CONFIRMATION") {
//       doc.text(`Company: ${quote.company_name || ""}`, 14, y);
//       y += 6;
//       doc.text(`Attn: ${quote.attn || ""}`, 14, y);
//       y += 6;
//       doc.text(`Email: ${quote.email || ""}`, 14, y);

//       if (quote.model) {
//         y += 6;
//         doc.text(`Model: ${quote.model}`, 14, y);
//       }

//       if (quote.serial_number) {
//         y += 6;
//         doc.text(`Serial #: ${quote.serial_number}`, 14, y);
//       }
//     }

//     if (title === "PURCHASE ORDER") {
//       if (quote.customer_po_number) {
//         y += 6;
//         doc.text(`Customer PO #: ${quote.customer_po_number}`, 14, y);
//       }

//       if (quote.ordered_date) {
//         y += 6;
//         doc.text(`Ordered Date: ${quote.ordered_date}`, 14, y);
//       }
//     }

//     if (title === "ORDER CONFIRMATION") {
//       if (quote.customer_po_number) {
//         doc.text(`Customer PO #: ${quote.customer_po_number}`, 14, y);
//         y += 6;
//       }

//       if (quote.order_confirmation_number) {
//         doc.text(`Order Confirmation #: ${quote.order_confirmation_number}`, 14, y);
//         y += 6;
//       }

//       if (quote.order_confirmation_date) {
//         doc.text(`Order Confirmation Date: ${quote.order_confirmation_date}`, 14, y);
//         y += 6;
//       }

//       if (quote.model) {
//         doc.text(`Model: ${quote.model}`, 14, y);
//         y += 6;
//       }

//       if (quote.serial_number) {
//         doc.text(`Serial #: ${quote.serial_number}`, 14, y);
//         y += 6;
//       }

//       y += 8;

//       doc.setFont(undefined, "bold");
//       doc.text("Bill To:", 14, y);
//       doc.text("Ship To:", 110, y);

//       y += 6;
//       doc.setFont(undefined, "normal");

//       doc.text(quote.company_name || "", 14, y);
//       doc.text(quote.ship_to_company || quote.company_name || "", 110, y);
//       y += 6;

//       if (quote.attn || quote.ship_to_address_1) {
//         if (quote.attn) doc.text(`Attn: ${quote.attn}`, 14, y);
//         if (quote.ship_to_address_1) doc.text(quote.ship_to_address_1, 110, y);
//         y += 6;
//       }

//       if (quote.email || quote.ship_to_address_2) {
//         if (quote.email) doc.text(`Email: ${quote.email}`, 14, y);
//         if (quote.ship_to_address_2) doc.text(quote.ship_to_address_2, 110, y);
//         y += 6;
//       }

//       const cityStateZip = [
//         quote.ship_to_city,
//         quote.ship_to_state,
//         quote.ship_to_zipcode,
//       ]
//         .filter(Boolean)
//         .join(", ");

//       if (cityStateZip) {
//         doc.text(cityStateZip, 110, y);
//         y += 6;
//       }

//       if (quote.ship_to_notes) {
//         const notes = doc.splitTextToSize(`Notes: ${quote.ship_to_notes}`, 80);
//         doc.text(notes, 110, y);
//         y += notes.length * 5;
//       }
//     }

//     return y + 18;
//   };

//   const drawPdfTableHeader = (doc, y) => {
//     doc.setFont(undefined, "bold");
//     doc.setFontSize(10);

//     doc.text("Line", 14, y);
//     doc.text("Part Number", 26, y);
//     doc.text("Description", 65, y);
//     doc.text("Qty", 148, y, { align: "center" });
//     doc.text("Unit Price", 168, y, { align: "center" });
//     doc.text("Total", 196, y, { align: "right" });

//     y += 5;
//     doc.line(14, y, 196, y);

//     return y + 8;
//   };

//   const drawPdfLineItems = (doc, quote, y) => {
//     y = drawPdfTableHeader(doc, y);

//     doc.setFont(undefined, "normal");
//     doc.setFontSize(10);

//     quote.line_items?.forEach((item, index) => {
//       const unit = toNumber(item.sell_price);
//       const qty = toNumber(item.qty, 1);
//       const total = unit * qty;

//       const descLines = doc.splitTextToSize(item.description || "", 78);
//       const rowHeight = Math.max(descLines.length * 5 + 2, 8);

//       if (y + rowHeight > 265) {
//         doc.addPage();
//         y = drawPdfTableHeader(doc, 25);
//         doc.setFont(undefined, "normal");
//         doc.setFontSize(10);
//       }

//       doc.text(String(index + 1), 14, y);
//       doc.text(item.part_number || "", 26, y);
//       doc.text(descLines, 65, y);
//       doc.text(String(qty), 148, y, { align: "center" });
//       doc.text(money(unit), 168, y, { align: "center" });
//       doc.text(money(total), 196, y, { align: "right" });

//       y += rowHeight;
//     });

//     y += 4;
//     doc.line(120, y, 196, y);

//     y += 8;
//     doc.setFontSize(12);
//     doc.setFont(undefined, "bold");
//     doc.text(`Subtotal: ${money(quote.total)}`, 196, y, { align: "right" });

//     y += 18;
//     doc.setFontSize(10);
//     doc.setFont(undefined, "italic");
//     doc.text("Freight and applicable sales tax not included.", 14, y);

//     y += 12;
//     doc.setFont(undefined, "normal");
//     doc.text("Heat Transfer Equipment Company, Inc. | partsales@htecompany.com", 14, y);

//     y += 6;
//     doc.setFontSize(9);
//     doc.text("If you have any questions, please feel free to reach out.", 14, y);
//   };

//   const generateDocumentPdf = async (quoteId, type) => {
//     const res = await API.get(`/quotes/${quoteId}`);
//     const quote = res.data;

//     const doc = new jsPDF();

//     const title =
//       type === "quote"
//         ? "QUOTE"
//         : type === "po"
//         ? "PURCHASE ORDER"
//         : "ORDER CONFIRMATION";

//     let y = drawPdfHeader(doc, title, quote);
//     drawPdfLineItems(doc, quote, y);

//     const filePrefix =
//       type === "quote"
//         ? "Quote"
//         : type === "po"
//         ? "PO"
//         : "Order_Confirmation";

//     doc.save(`${filePrefix}_${quote.quote_number}.pdf`);
//   };

//   return (
//     <div className="app-container">
//       <div className="page-header">
//         <div>
//           <h1>Parts Quoting</h1>
//           <p>Manage quotes, customers, contacts, and order tracking.</p>
//         </div>
//       </div>

//       <div className="dashboard-grid">
//         <div className="dashboard-card">
//           <span>Total Quotes</span>
//           <strong>{quotes.length}</strong>
//         </div>
//         <div className="dashboard-card">
//           <span>Quoted</span>
//           <strong>{quotedQuotes.length}</strong>
//           <small>{money(quotedTotal)}</small>
//         </div>
//         <div className="dashboard-card">
//           <span>Ordered</span>
//           <strong>{orderedQuotes.length}</strong>
//           <small>{money(orderedTotal)}</small>
//         </div>
//         <div className="dashboard-card">
//           <span>Total Value</span>
//           <strong>{money(quotedTotal + orderedTotal)}</strong>
//         </div>
//       </div>

//       <section className="card">
//         <div className="section-header">
//           <div>
//             <h2>{editingQuoteId ? "Edit Quote" : "Create Quote"}</h2>
//             <p>Save quote details, parts, pricing, and order information.</p>
//           </div>
//         </div>

//         <form onSubmit={saveQuote}>
//           <div className="form-grid">
//             <select
//               name="company_id"
//               value={quoteForm.company_id}
//               onChange={handleQuoteChange}
//             >
//               <option value="">Select Company</option>
//               {companies.map((company) => (
//                 <option key={company.id} value={company.id}>
//                   {company.name}
//                 </option>
//               ))}
//             </select>

//             <select
//               name="contact_id"
//               value={quoteForm.contact_id}
//               onChange={handleQuoteChange}
//               disabled={!quoteForm.company_id}
//             >
//               <option value="">
//                 {quoteForm.company_id ? "Select Contact" : "Select Company First"}
//               </option>
//               {contactsForQuoteCompany.map((contact) => (
//                 <option key={contact.id} value={contact.id}>
//                   {contact.first_name} {contact.last_name}
//                 </option>
//               ))}
//             </select>

//             <input name="company_name" placeholder="Company" value={quoteForm.company_name || ""} onChange={handleQuoteChange} />
//             <input name="attn" placeholder="Attn" value={quoteForm.attn || ""} onChange={handleQuoteChange} />
//             <input name="email" placeholder="Email" value={quoteForm.email || ""} onChange={handleQuoteChange} />
//             <input name="model" placeholder="Model" value={quoteForm.model || ""} onChange={handleQuoteChange} />
//             <input name="serial_number" placeholder="Serial Number" value={quoteForm.serial_number || ""} onChange={handleQuoteChange} />

//             <select name="status" value={quoteForm.status} onChange={handleQuoteChange}>
//               <option value="quoted">Quoted</option>
//               <option value="ordered">Ordered</option>
//             </select>

//             <input name="customer_po_number" placeholder="Customer PO #" value={quoteForm.customer_po_number || ""} onChange={handleQuoteChange} />
//             <input type="date" name="ordered_date" value={quoteForm.ordered_date || ""} onChange={handleQuoteChange} />
//             <input name="order_confirmation_number" placeholder="Order Confirmation #" value={quoteForm.order_confirmation_number || ""} onChange={handleQuoteChange} />
//             <input type="date" name="order_confirmation_date" value={quoteForm.order_confirmation_date || ""} onChange={handleQuoteChange} />
//             <input name="vendor_order_confirmation_number" placeholder="Vendor Order Confirmation #" value={quoteForm.vendor_order_confirmation_number || ""} onChange={handleQuoteChange} />
//             <input type="date" name="vendor_order_confirmation_date" value={quoteForm.vendor_order_confirmation_date || ""} onChange={handleQuoteChange} />

//             <input name="ship_to_company" placeholder="Ship To Company" value={quoteForm.ship_to_company || ""} onChange={handleQuoteChange} />
//             <input name="ship_to_address_1" placeholder="Ship To Address 1" value={quoteForm.ship_to_address_1 || ""} onChange={handleQuoteChange} />
//             <input name="ship_to_address_2" placeholder="Ship To Address 2" value={quoteForm.ship_to_address_2 || ""} onChange={handleQuoteChange} />
//             <input name="ship_to_city" placeholder="Ship To City" value={quoteForm.ship_to_city || ""} onChange={handleQuoteChange} />
//             <input name="ship_to_state" placeholder="Ship To State" value={quoteForm.ship_to_state || ""} onChange={handleQuoteChange} />
//             <input name="ship_to_zipcode" placeholder="Ship To Zipcode" value={quoteForm.ship_to_zipcode || ""} onChange={handleQuoteChange} />
//             <textarea className="wide-field" name="ship_to_notes" placeholder="Ship To Notes / Delivery Contact" value={quoteForm.ship_to_notes || ""} onChange={handleQuoteChange} />

//             <textarea className="wide-field" name="notes" placeholder="Quote Notes" value={quoteForm.notes || ""} onChange={handleQuoteChange} />
//           </div>

//           <h3>Line Items</h3>

//           <div className="table-wrap">
//             <table className="line-table">
//               <thead>
//                 <tr>
//                   <th>Part #</th>
//                   <th>Description</th>
//                   <th>Vendor</th>
//                   <th>List</th>
//                   <th>Surcharge</th>
//                   <th>Multiplier</th>
//                   <th>Markup</th>
//                   <th>Sell</th>
//                   <th>Qty</th>
//                   <th>Total</th>
//                   <th>Notes</th>
//                   <th></th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {lineItems.map((item, index) => (
//                   <tr key={index}>
//                     <td><input value={item.part_number || ""} onChange={(e) => updateLine(index, "part_number", e.target.value)} /></td>
//                     <td><textarea value={item.description || ""} onChange={(e) => updateLine(index, "description", e.target.value)} /></td>
//                     <td><input value={item.vendor || ""} onChange={(e) => updateLine(index, "vendor", e.target.value)} /></td>
//                     <td><input type="number" value={item.list_price ?? ""} onChange={(e) => updateLine(index, "list_price", e.target.value)} /></td>
//                     <td><input type="number" step="0.01" value={item.surcharge ?? ""} onChange={(e) => updateLine(index, "surcharge", e.target.value)} /></td>
//                     <td><input type="number" step="0.01" min="0" value={item.multiplier ?? ""} onChange={(e) => updateLine(index, "multiplier", e.target.value)} /></td>
//                     <td><input type="number" step="0.01" value={item.markup ?? ""} onChange={(e) => updateLine(index, "markup", e.target.value)} /></td>
//                     <td><input type="number" value={item.sell_price ?? ""} onChange={(e) => updateLine(index, "sell_price", e.target.value)} /></td>
//                     <td><input type="number" value={item.qty ?? ""} onChange={(e) => updateLine(index, "qty", e.target.value)} /></td>
//                     <td className="money-cell">{money(toNumber(item.sell_price) * toNumber(item.qty, 1))}</td>
//                     <td><input value={item.notes || ""} onChange={(e) => updateLine(index, "notes", e.target.value)} /></td>
//                     <td><button className="icon-btn danger" type="button" onClick={() => removeLine(index)}>X</button></td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           <div className="form-actions">
//             <button className="secondary-btn" type="button" onClick={addLine}>
//               Add Line Item
//             </button>
//             <div className="quote-total">Total: {money(quoteTotal)}</div>
//             <button className="primary-btn" type="submit">
//               {editingQuoteId ? "Update Quote" : "Save Quote"}
//             </button>
//           </div>
//         </form>
//       </section>

//       <section className="card">
//         <div className="section-header">
//           <div>
//             <h2>Quote Dashboard</h2>
//             <p>Search by date, quote #, company, model, serial #, total, or status.</p>
//           </div>
//           <div className="quote-tools">
//             <input placeholder="Search quotes..." value={quoteSearch} onChange={(e) => setQuoteSearch(e.target.value)} />
//             <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
//               <option value="all">All Status</option>
//               <option value="quoted">Quoted</option>
//               <option value="ordered">Ordered</option>
//             </select>
//           </div>
//         </div>

//         <div className="table-wrap">
//           <table className="dashboard-table">
//             <thead>
//               <tr>
//                 <th>Date</th>
//                 <th>Quote #</th>
//                 <th>Company</th>
//                 <th>Model</th>
//                 <th>Serial #</th>
//                 <th>Total</th>
//                 <th>Status</th>
//                 <th className="actions-col">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filteredQuotes.map((quote) => (
//                 <tr key={quote.id}>
//                   <td>{quote.date}</td>
//                   <td className="quote-number">{quote.quote_number}</td>
//                   <td>{quote.company_name}</td>
//                   <td>{quote.model}</td>
//                   <td>{quote.serial_number}</td>
//                   <td className="money-cell">{money(quote.total)}</td>
//                   <td><span className={`status-pill ${quote.status}`}>{quote.status}</span></td>
//                   <td className="button-group">
//                     <button type="button" onClick={() => editQuote(quote.id)}>Edit</button>
//                     <button type="button" onClick={() => generateDocumentPdf(quote.id, "quote")}>Quote PDF</button>
//                     <button type="button" onClick={() => generateDocumentPdf(quote.id, "po")}>PO PDF</button>
//                     <button type="button" onClick={() => generateDocumentPdf(quote.id, "order_confirmation")}>OC PDF</button>
//                     <button type="button" className="danger-text" onClick={() => deleteQuote(quote.id)}>Delete</button>
//                   </td>
//                 </tr>
//               ))}
//               {filteredQuotes.length === 0 && (
//                 <tr>
//                   <td colSpan="8" className="empty-row">No quotes found.</td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </section>

//       <section className="card">
//         <div className="section-header">
//           <div>
//             <h2>Companies</h2>
//             <p>Add and manage vendors, contractors, wholesalers, and end users.</p>
//           </div>
//         </div>

//         <form onSubmit={saveCompany} className="form-grid">
//           <select name="type" value={companyForm.type} onChange={handleCompanyChange}>
//             <option value="vendor">Vendor</option>
//             <option value="contractor">Contractor</option>
//             <option value="wholesaler">Wholesaler</option>
//             <option value="end_user">End User</option>
//           </select>
//           <input name="name" placeholder="Company Name" value={companyForm.name} onChange={handleCompanyChange} required />
//           <input name="address_1" placeholder="Address 1" value={companyForm.address_1 || ""} onChange={handleCompanyChange} />
//           <input name="address_2" placeholder="Address 2" value={companyForm.address_2 || ""} onChange={handleCompanyChange} />
//           <input name="city" placeholder="City" value={companyForm.city || ""} onChange={handleCompanyChange} />
//           <input name="state" placeholder="State" value={companyForm.state || ""} onChange={handleCompanyChange} />
//           <input name="zipcode" placeholder="Zipcode" value={companyForm.zipcode || ""} onChange={handleCompanyChange} />
//           <textarea className="wide-field" name="notes" placeholder="Notes" value={companyForm.notes || ""} onChange={handleCompanyChange} />
//           <button className="primary-btn" type="submit">{editingCompanyId ? "Update Company" : "Add Company"}</button>
//         </form>
//       </section>

//       <section className="card">
//         <div className="section-header">
//           <div>
//             <h2>Contacts</h2>
//             <p>Add customer, vendor, and internal contacts.</p>
//           </div>
//         </div>

//         <form onSubmit={saveContact} className="form-grid">
//           <select name="company_id" value={contactForm.company_id} onChange={handleContactChange}>
//             <option value="">Select Company</option>
//             {companies.map((company) => (
//               <option key={company.id} value={company.id}>{company.name}</option>
//             ))}
//           </select>
//           <input name="first_name" placeholder="First Name" value={contactForm.first_name || ""} onChange={handleContactChange} />
//           <input name="last_name" placeholder="Last Name" value={contactForm.last_name || ""} onChange={handleContactChange} />
//           <input name="email" placeholder="Email" value={contactForm.email || ""} onChange={handleContactChange} />
//           <input name="tel" placeholder="Tel" value={contactForm.tel || ""} onChange={handleContactChange} />
//           <input name="mobile" placeholder="Mobile" value={contactForm.mobile || ""} onChange={handleContactChange} />
//           <input name="role" placeholder="Role" value={contactForm.role || ""} onChange={handleContactChange} />
//           <textarea className="wide-field" name="notes" placeholder="Notes" value={contactForm.notes || ""} onChange={handleContactChange} />
//           <button className="primary-btn" type="submit">{editingContactId ? "Update Contact" : "Add Contact"}</button>
//         </form>
//       </section>
//     </div>
//   );
// }

// export default App;


import { useEffect, useState } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import leftLogo from "./assets/leftLogo.jpeg";
import rightLogo from "./assets/rightLogo.png";
import "./App.css";

const API = axios.create({
  baseURL: "http://localhost:5001",
});

const toUpper = (value) => {
  return value ? value.toUpperCase() : "";
};

const toTitleCase = (value) => {
  if (!value) return "";

  return value
    .toLowerCase()
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
};

const emptyCompany = {
  type: "contractor",
  name: "",
  address_1: "",
  address_2: "",
  city: "",
  state: "",
  zipcode: "",
  notes: "",
};

const emptyContact = {
  company_id: "",
  first_name: "",
  last_name: "",
  email: "",
  tel: "",
  mobile: "",
  role: "",
  notes: "",
};

const emptyQuote = {
  company_id: "",
  contact_id: "",
  company_name: "",
  attn: "",
  email: "",
  model: "",
  serial_number: "",
  status: "quoted",
  customer_po_number: "",
  ordered_date: "",
  order_confirmation_number: "",
  order_confirmation_date: "",
  vendor_order_confirmation_number: "",
  vendor_order_confirmation_date: "",
  ship_to_company: "",
  ship_to_address_1: "",
  ship_to_address_2: "",
  ship_to_city: "",
  ship_to_state: "",
  ship_to_zipcode: "",
  ship_to_notes: "",
  notes: "",
};

const emptyLine = {
  part_number: "",
  description: "",
  vendor: "",
  list_price: 0,
  surcharge: 0,
  multiplier: 1,
  markup: 0,
  sell_price: 0,
  qty: 1,
  notes: "",
};

function App() {
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [quotes, setQuotes] = useState([]);

  const [companyForm, setCompanyForm] = useState(emptyCompany);
  const [contactForm, setContactForm] = useState(emptyContact);
  const [quoteForm, setQuoteForm] = useState(emptyQuote);
  const [lineItems, setLineItems] = useState([{ ...emptyLine }]);

  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [editingContactId, setEditingContactId] = useState(null);
  const [editingQuoteId, setEditingQuoteId] = useState(null);

  const [quoteSearch, setQuoteSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companySearch, setCompanySearch] = useState("");
  const [contactSearch, setContactSearch] = useState("");

  const money = (value) =>
    Number(value || 0).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });

  const toNumber = (value, fallback = 0) => {
    if (value === "" || value === null || value === undefined) return fallback;
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const getCompanyName = (companyId) => {
    const company = companies.find((c) => Number(c.id) === Number(companyId));
    return company?.name || "";
  };

  const contactsForQuoteCompany = contacts.filter(
    (contact) => Number(contact.company_id) === Number(quoteForm.company_id)
  );

  const loadData = async () => {
    const companyRes = await API.get("/companies");
    const contactRes = await API.get("/contacts");
    const quoteRes = await API.get("/quotes");

    setCompanies(companyRes.data);
    setContacts(contactRes.data);
    setQuotes(quoteRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCompanyChange = (e) => {
    setCompanyForm({ ...companyForm, [e.target.name]: e.target.value });
  };

  const saveCompany = async (e) => {
    e.preventDefault();

const payload = {
  ...companyForm,
  name: toUpper(companyForm.name),
  state: toUpper(companyForm.state),
  address_1: toTitleCase(companyForm.address_1),
  address_2: toTitleCase(companyForm.address_2),
  city: toTitleCase(companyForm.city),
};

if (editingCompanyId) {
  await API.put(
    `/companies/${editingCompanyId}`,
    payload
  );
} else {
  await API.post("/companies", payload);
}

    setCompanyForm(emptyCompany);
    setEditingCompanyId(null);
    loadData();
  };

  const editCompany = (company) => {
    setCompanyForm(company);
    setEditingCompanyId(company.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelCompanyEdit = () => {
    setCompanyForm(emptyCompany);
    setEditingCompanyId(null);
  };

  const deleteCompany = async (id) => {
    await API.delete(`/companies/${id}`);
    loadData();
  };

  const handleContactChange = (e) => {
    setContactForm({ ...contactForm, [e.target.name]: e.target.value });
  };

  const saveContact = async (e) => {
    e.preventDefault();

const payload = {
  ...contactForm,

  first_name: toTitleCase(
    contactForm.first_name
  ),

  last_name: toTitleCase(
    contactForm.last_name
  ),

  company_id: contactForm.company_id || null,
};

    if (editingContactId) {
      await API.put(`/contacts/${editingContactId}`, payload);
    } else {
      await API.post("/contacts", payload);
    }

    setContactForm(emptyContact);
    setEditingContactId(null);
    loadData();
  };

  const editContact = (contact) => {
    setContactForm({
      ...contact,
      company_id: contact.company_id || "",
    });
    setEditingContactId(contact.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelContactEdit = () => {
    setContactForm(emptyContact);
    setEditingContactId(null);
  };

  const deleteContact = async (id) => {
    await API.delete(`/contacts/${id}`);
    loadData();
  };

  const handleQuoteChange = (e) => {
    const { name, value } = e.target;

    if (name === "company_id") {
      const selectedCompany = companies.find((c) => c.id === Number(value));

      setQuoteForm({
        ...quoteForm,
        company_id: value,
        contact_id: "",
        company_name: selectedCompany?.name || "",
        attn: "",
        email: "",
      });

      return;
    }

    if (name === "contact_id") {
      const selectedContact = contacts.find((c) => c.id === Number(value));

      setQuoteForm({
        ...quoteForm,
        contact_id: value,
        attn: selectedContact
          ? `${selectedContact.first_name || ""} ${
              selectedContact.last_name || ""
            }`.trim()
          : "",
        email: selectedContact?.email || "",
      });

      return;
    }

    setQuoteForm({ ...quoteForm, [name]: value });
  };

  const updateLine = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;

    const list = toNumber(updated[index].list_price);
    const surcharge = toNumber(updated[index].surcharge);
    const multiplier = toNumber(updated[index].multiplier, 1);
    const markup = toNumber(updated[index].markup);
    const qty = toNumber(updated[index].qty, 1);

    if (["list_price", "surcharge", "multiplier", "markup"].includes(field)) {
      updated[index].sell_price = Math.ceil(
        list * (1 + surcharge) * multiplier * (1 + markup)
      );
    }

    updated[index].total = toNumber(updated[index].sell_price) * qty;
    setLineItems(updated);
  };

  const addLine = () => setLineItems([...lineItems, { ...emptyLine }]);

  const removeLine = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const quoteTotal = lineItems.reduce(
    (sum, item) => sum + toNumber(item.sell_price) * toNumber(item.qty, 1),
    0
  );

  const saveQuote = async (e) => {
    e.preventDefault();

    const payload = {
      ...quoteForm,
      company_name: toUpper(
    quoteForm.company_name
  ),

  ship_to_company: toUpper(
    quoteForm.ship_to_company
  ),

  attn: toTitleCase(
    quoteForm.attn
  ),
      company_id: quoteForm.company_id || null,
      contact_id: quoteForm.contact_id || null,
      line_items: lineItems.map((item) => ({
        part_number: item.part_number,
        description: item.description,
        vendor: toUpper(item.vendor),
        list_price: toNumber(item.list_price),
        surcharge: toNumber(item.surcharge),
        multiplier: toNumber(item.multiplier, 1),
        markup: toNumber(item.markup),
        sell_price: toNumber(item.sell_price),
        qty: toNumber(item.qty, 1),
        total: toNumber(item.sell_price) * toNumber(item.qty, 1),
        notes: item.notes,
      })),
    };

    if (editingQuoteId) {
      await API.put(`/quotes/${editingQuoteId}`, payload);
    } else {
      await API.post("/quotes", payload);
    }

    setQuoteForm(emptyQuote);
    setLineItems([{ ...emptyLine }]);
    setEditingQuoteId(null);
    loadData();
  };

  const editQuote = async (id) => {
    const res = await API.get(`/quotes/${id}`);
    const quote = res.data;

    setQuoteForm({
      company_id: quote.company_id || "",
      contact_id: quote.contact_id || "",
      company_name: quote.company_name || "",
      attn: quote.attn || "",
      email: quote.email || "",
      model: quote.model || "",
      serial_number: quote.serial_number || "",
      status: quote.status || "quoted",
      customer_po_number: quote.customer_po_number || "",
      ordered_date: quote.ordered_date || "",
      order_confirmation_number: quote.order_confirmation_number || "",
      order_confirmation_date: quote.order_confirmation_date || "",
      vendor_order_confirmation_number:
        quote.vendor_order_confirmation_number || "",
      vendor_order_confirmation_date:
        quote.vendor_order_confirmation_date || "",
      ship_to_company: quote.ship_to_company || "",
      ship_to_address_1: quote.ship_to_address_1 || "",
      ship_to_address_2: quote.ship_to_address_2 || "",
      ship_to_city: quote.ship_to_city || "",
      ship_to_state: quote.ship_to_state || "",
      ship_to_zipcode: quote.ship_to_zipcode || "",
      ship_to_notes: quote.ship_to_notes || "",
      notes: quote.notes || "",
    });

    setLineItems(
      quote.line_items?.length
        ? quote.line_items.map((item) => ({
            part_number: item.part_number || "",
            description: item.description || "",
            vendor: item.vendor || "",
            list_price: item.list_price || 0,
            surcharge: item.surcharge || 0,
            multiplier: item.multiplier ?? 1,
            markup: item.markup ?? 0,
            sell_price: item.sell_price || 0,
            qty: item.qty || 1,
            notes: item.notes || "",
          }))
        : [{ ...emptyLine }]
    );

    setEditingQuoteId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteQuote = async (id) => {
    await API.delete(`/quotes/${id}`);
    loadData();
  };

  const filteredQuotes = quotes.filter((quote) => {
    const search = quoteSearch.toLowerCase();

    const matchesSearch =
      quote.date?.toLowerCase().includes(search) ||
      quote.quote_number?.toLowerCase().includes(search) ||
      quote.company_name?.toLowerCase().includes(search) ||
      quote.model?.toLowerCase().includes(search) ||
      quote.serial_number?.toLowerCase().includes(search) ||
      String(quote.total || "").toLowerCase().includes(search) ||
      quote.status?.toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === "all" || quote.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredCompanies = companies.filter((company) => {
    const search = companySearch.toLowerCase();

    return (
      company.name?.toLowerCase().includes(search) ||
      company.type?.toLowerCase().includes(search) ||
      company.city?.toLowerCase().includes(search) ||
      company.state?.toLowerCase().includes(search) ||
      company.zipcode?.toLowerCase().includes(search) ||
      company.notes?.toLowerCase().includes(search)
    );
  });

  const filteredContacts = contacts.filter((contact) => {
    const search = contactSearch.toLowerCase();
    const companyName = getCompanyName(contact.company_id).toLowerCase();

    return (
      contact.first_name?.toLowerCase().includes(search) ||
      contact.last_name?.toLowerCase().includes(search) ||
      contact.email?.toLowerCase().includes(search) ||
      contact.tel?.toLowerCase().includes(search) ||
      contact.mobile?.toLowerCase().includes(search) ||
      contact.role?.toLowerCase().includes(search) ||
      contact.notes?.toLowerCase().includes(search) ||
      companyName.includes(search)
    );
  });

  const quotedQuotes = quotes.filter((quote) => quote.status === "quoted");
  const orderedQuotes = quotes.filter((quote) => quote.status === "ordered");

  const quotedTotal = quotedQuotes.reduce(
    (sum, quote) => sum + toNumber(quote.total),
    0
  );

  const orderedTotal = orderedQuotes.reduce(
    (sum, quote) => sum + toNumber(quote.total),
    0
  );

  const drawPdfHeader = (doc, title, quote) => {
    doc.addImage(leftLogo, "JPEG", 14, 16, 62, 32);
    doc.addImage(rightLogo, "PNG", 118, 30, 78, 22);

    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text(title, 105, 70, { align: "center" });

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");

    let y = 86;

if (title === "QUOTE") {
  doc.text(`Quote #: ${quote.quote_number || ""}`, 14, y);
  y += 6;
}

if (title === "ORDER CONFIRMATION") {
  // if (quote.order_confirmation_number) {
  //   doc.text(`Order Confirmation #: ${quote.order_confirmation_number}`, 14, y);
  //   y += 6;
  // }

  // doc.text(`Quote #: ${quote.quote_number || ""}`, 14, y);
  // y += 6;
}

doc.text(`Date: ${quote.date || ""}`, 14, y);

y += 14;

    if (title !== "ORDER CONFIRMATION" &&
  title !== "PURCHASE ORDER") {
      doc.text(`Company: ${quote.company_name || ""}`, 14, y);
      y += 6;
      doc.text(`Attn: ${quote.attn || ""}`, 14, y);
      y += 6;
      doc.text(`Email: ${quote.email || ""}`, 14, y);

      if (quote.model) {
        y += 6;
        doc.text(`Model: ${quote.model}`, 14, y);
      }

      if (quote.serial_number) {
        y += 6;
        doc.text(`Serial #: ${quote.serial_number}`, 14, y);
      }
    }

if (title === "PURCHASE ORDER") {

  if (quote.order_confirmation_number) {
    y += -8;
    doc.setFont(undefined, "bold");
    doc.text(
      `PO # : ${quote.order_confirmation_number}`,
      14,
      y
    );
  }

  y += 12;

  doc.setFont(undefined, "bold");

  doc.text("Vendor:", 14, y);

  doc.text("Ship To:", 110, y);

  y += 6;

  doc.setFont(undefined, "normal");

  const vendorNames = [
    ...new Set(
      quote.line_items
        ?.map((item) => item.vendor)
        .filter(Boolean)
    ),
  ];

  doc.text(
    vendorNames.join(", ") || "",
    14,
    y
  );

  doc.text(
    quote.ship_to_company ||
      quote.company_name ||
      "",
    110,
    y
  );

  y += 6;

  if (quote.ship_to_address_1) {
    doc.text(
      quote.ship_to_address_1,
      110,
      y
    );

    y += 6;
  }

  if (quote.ship_to_address_2) {
    doc.text(
      quote.ship_to_address_2,
      110,
      y
    );

    y += 6;
  }

  const cityStateZip = [
    quote.ship_to_city,
    quote.ship_to_state,
    quote.ship_to_zipcode,
  ]
    .filter(Boolean)
    .join(", ");

  if (cityStateZip) {
    doc.text(cityStateZip, 110, y);

    y += 6;
  }

  if (quote.ship_to_notes) {
    const notes = doc.splitTextToSize(
      `Notes: ${quote.ship_to_notes}`,
      80
    );

    doc.text(notes, 110, y);

    y += notes.length * 5;
  }

  if (quote.customer_po_number) {
  doc.text(`Delivery reference #: ${quote.customer_po_number}`, 110, y);
  y += 6;
}
}

    if (title === "ORDER CONFIRMATION") {
      if (quote.customer_po_number) {
        doc.text(`Customer PO #: ${quote.customer_po_number}`, 14, y);
        y += 6;
      }

      if (quote.order_confirmation_number) {
        doc.text(`Order Confirmation #: ${quote.order_confirmation_number}`, 14, y);
        y += 6;
      }

      if (quote.quote_number) {
        doc.text(`Quote #: ${quote.quote_number}`, 14, y);
        y += 6;
      }

      if (quote.model) {
        doc.text(`Model: ${quote.model}`, 14, y);
        y += 6;
      }

      if (quote.serial_number) {
        doc.text(`Serial #: ${quote.serial_number}`, 14, y);
        y += 6;
      }

      y += 8;

      doc.setFont(undefined, "bold");
      doc.text("Bill To:", 14, y);
      doc.text("Ship To:", 110, y);

      y += 6;
      doc.setFont(undefined, "normal");

      doc.text(quote.company_name || "", 14, y);
      doc.text(quote.ship_to_company || quote.company_name || "", 110, y);
      y += 6;

      if (quote.attn || quote.ship_to_address_1) {
        if (quote.attn) doc.text(`Attn: ${quote.attn}`, 14, y);
        if (quote.ship_to_address_1) doc.text(quote.ship_to_address_1, 110, y);
        y += 6;
      }

      if (quote.email || quote.ship_to_address_2) {
        if (quote.email) doc.text(`Email: ${quote.email}`, 14, y);
        if (quote.ship_to_address_2) doc.text(quote.ship_to_address_2, 110, y);
        y += 6;
      }

      const cityStateZip = [
        quote.ship_to_city,
        quote.ship_to_state,
        quote.ship_to_zipcode,
      ]
        .filter(Boolean)
        .join(", ");

      if (cityStateZip) {
        doc.text(cityStateZip, 110, y);
        y += 6;
      }

      if (quote.ship_to_notes) {
        const notes = doc.splitTextToSize(`Notes: ${quote.ship_to_notes}`, 80);
        doc.text(notes, 110, y);
        y += notes.length * 5;
      }
    }

    return y + 18;
  };

  const drawPdfTableHeader = (doc, y) => {
    doc.setFont(undefined, "bold");
    doc.setFontSize(10);

    doc.text("Line", 14, y);
    doc.text("Part Number", 26, y);
    doc.text("Description", 65, y);
    doc.text("Qty", 148, y, { align: "center" });
    doc.text("Unit Price", 168, y, { align: "center" });
    doc.text("Total", 196, y, { align: "right" });

    y += 5;
    doc.line(14, y, 196, y);

    return y + 8;
  };

//   const drawPdfLineItems = (doc, quote, y, type) => {
//   y = drawPdfTableHeader(doc, y);

//   doc.setFont(undefined, "normal");
//   doc.setFontSize(10);

//   let pdfTotal = 0;

//   quote.line_items?.forEach((item, index) => {
//     const qty = toNumber(item.qty, 1);

//     const unit =
//       type === "po"
//         ? Math.ceil(
//             toNumber(item.list_price) *
//               toNumber(item.multiplier, 1)
//           )
//         : toNumber(item.sell_price);

//     const total = unit * qty;
//     pdfTotal += total;

// const vendorLine =
//   type !== "po" && item.vendor
//     ? `Vendor: ${item.vendor}`
//     : "";

// const descText = vendorLine
//   ? `${item.description || ""}\n${vendorLine}`
//   : item.description || "";

//     const descLines = doc.splitTextToSize(descText, 78);

//     const rowHeight = Math.max(
//       descLines.length * 5 + 2,
//       8
//     );

//     if (y + rowHeight > 265) {
//       doc.addPage();

//       y = drawPdfTableHeader(doc, 25);

//       doc.setFont(undefined, "normal");
//       doc.setFontSize(10);
//     }

//     doc.text(String(index + 1), 14, y);

//     doc.text(item.part_number || "", 26, y);

//     doc.text(descLines, 65, y);

//     doc.text(String(qty), 148, y, {
//       align: "center",
//     });

//     doc.text(money(unit), 168, y, {
//       align: "center",
//     });

//     doc.text(money(total), 196, y, {
//       align: "right",
//     });

//     y += rowHeight;
//   });

//   y += 4;

//   doc.line(120, y, 196, y);

//   y += 8;

//   doc.setFontSize(12);

//   doc.setFont(undefined, "bold");

//   doc.text(
//     `Subtotal: ${money(pdfTotal)}`,
//     196,
//     y,
//     {
//       align: "right",
//     }
//   );

//   if (type !== "po") {
//     y += 18;

//     doc.setFontSize(10);

//     doc.setFont(undefined, "italic");

//     doc.text(
//       "Freight and applicable sales tax not included.",
//       14,
//       y
//     );
//   }

//   y += 12;

//   doc.setFont(undefined, "normal");

//   doc.text(
//     "Heat Transfer Equipment Company, Inc. | partsales@htecompany.com",
//     14,
//     y
//   );

//   y += 6;

//   doc.setFontSize(9);

//   doc.text(
//     "If you have any questions, please feel free to reach out.",
//     14,
//     y
//   );
// };
const drawPdfLineItems = (doc, quote, y, type) => {
  const bottomLimit = 265;

  const checkPageSpace = (neededHeight) => {
    if (y + neededHeight > bottomLimit) {
      doc.addPage();

      y = drawPdfTableHeader(doc, 25);

      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
    }
  };

  y = drawPdfTableHeader(doc, y);

  doc.setFont(undefined, "normal");
  doc.setFontSize(10);

  quote.line_items?.forEach((item, index) => {
    const qty = toNumber(item.qty, 1);

    // =========================
    // PO USES NET COST
    // QUOTE/OC USE SELL PRICE
    // =========================
    const unit =
type === "po"
  ? toNumber(item.list_price) *
      (1 + toNumber(item.surcharge)) *
      toNumber(item.multiplier, 1)
  : toNumber(item.sell_price);

    const total = unit * qty;

    const descLines = doc.splitTextToSize(
      item.description || "",
      78
    );

    const rowHeight = Math.max(
      descLines.length * 5 + 4,
      10
    );

    checkPageSpace(rowHeight);

    doc.text(String(index + 1), 14, y);

    doc.text(item.part_number || "", 26, y);

    doc.text(descLines, 65, y);

    doc.text(String(qty), 148, y, {
      align: "center",
    });

    doc.text(money(unit), 168, y, {
      align: "center",
    });

    doc.text(money(total), 196, y, {
      align: "right",
    });

    y += rowHeight;
  });

  // =========================
  // PDF TOTAL
  // =========================
  const pdfTotal =
    quote.line_items?.reduce((sum, item) => {
      const qty = toNumber(item.qty, 1);

      const unit =
type === "po"
  ? toNumber(item.list_price) *
      (1 + toNumber(item.surcharge)) *
      toNumber(item.multiplier, 1)
  : toNumber(item.sell_price);

      return sum + unit * qty;
    }, 0) || 0;

  checkPageSpace(type !== "po" ? 55 : 42);

  y += 4;

  doc.line(120, y, 196, y);

  y += 8;

  doc.setFontSize(12);
  doc.setFont(undefined, "bold");

  doc.text(
    `Subtotal: ${money(pdfTotal)}`,
    196,
    y,
    {
      align: "right",
    }
  );

if (type === "order_confirmation") {
  checkPageSpace(45);

  y += 18;

  doc.setFontSize(11);
  doc.setFont(undefined, "bold");

  doc.text(
    "THANK YOU FOR YOUR BUSINESS!",
    14,
    y
  );

  y += 7;

  doc.setFontSize(9);
  doc.setFont(undefined, "normal");

  doc.text(
    "If you discover an error or have any questions regarding your order, please contact your sales associate immediately",
    14,
    y
  );

  y += 5;

  doc.text(
    "to rectify any issue or concern. Otherwise, the above order is considered accurate and will be shipped accordingly.",
    14,
    y
  );

  y += 12;

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");

  doc.text(
    "Heat Transfer Equipment Company, Inc. | partsales@htecompany.com",
    14,
    y
  );
} else {

    if (type === "po") {
    y += 18;

    doc.setFontSize(9);
    doc.setFont(undefined, "normal");

    doc.text(
      "Please reference PO # and Delivery Ref # on all invoices, packing slips, and order confirmations.",
      14,
      y
    );

    y += 10;

    doc.text(
      "Invoices: accounting@htecompany.com",
      14,
      y
    );

    y += 6;

    doc.text(
      "Order Confirmations, Ship Dates & Tracking: partsales@htecompany.com",
      14,
      y
    );
  }

if (type !== "po") {
  y += 18;

  doc.setFontSize(10);
  doc.setFont(undefined, "italic");

  doc.text(
    "Freight and applicable sales tax not included.",
    14,
    y
  );

  y += 12;

  doc.setFont(undefined, "normal");
  doc.setFontSize(10);

  doc.text(
    "Heat Transfer Equipment Company, Inc. | partsales@htecompany.com",
    14,
    y
  );

  y += 6;

  doc.setFontSize(9);

  doc.text(
    "If you have any questions, please feel free to reach out.",
    14,
    y
  );
}
}
};

  const generateDocumentPdf = async (quoteId, type) => {
    const res = await API.get(`/quotes/${quoteId}`);
    const quote = res.data;

    const doc = new jsPDF();

    const title =
      type === "quote"
        ? "QUOTE"
        : type === "po"
        ? "PURCHASE ORDER"
        : "ORDER CONFIRMATION";

    let y = drawPdfHeader(doc, title, quote);
    drawPdfLineItems(doc, quote, y, type);

    const filePrefix =
      type === "quote"
        ? "Quote"
        : type === "po"
        ? "PO"
        : "Order_Confirmation";

    doc.save(`${filePrefix}_${quote.quote_number}.pdf`);
  };

  return (
    <div className="app-container">
      <div className="page-header">
        <div>
          <h1>Parts Quoting</h1>
          <p>Manage quotes, customers, contacts, and order tracking.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <span>Total Quotes</span>
          <strong>{quotes.length}</strong>
        </div>
        <div className="dashboard-card">
          <span>Quoted</span>
          <strong>{quotedQuotes.length}</strong>
          <small>{money(quotedTotal)}</small>
        </div>
        <div className="dashboard-card">
          <span>Ordered</span>
          <strong>{orderedQuotes.length}</strong>
          <small>{money(orderedTotal)}</small>
        </div>
        <div className="dashboard-card">
          <span>Total Value</span>
          <strong>{money(quotedTotal + orderedTotal)}</strong>
        </div>
      </div>

      <section className="card">
        <div className="section-header">
          <div>
            <h2>{editingQuoteId ? "Edit Quote" : "Create Quote"}</h2>
            <p>Save quote details, parts, pricing, and order information.</p>
          </div>
        </div>

        <form onSubmit={saveQuote}>
          {/* <div className="form-grid">
            <select
              name="company_id"
              value={quoteForm.company_id}
              onChange={handleQuoteChange}
            >
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>

            <select
              name="contact_id"
              value={quoteForm.contact_id}
              onChange={handleQuoteChange}
              disabled={!quoteForm.company_id}
            >
              <option value="">
                {quoteForm.company_id ? "Select Contact" : "Select Company First"}
              </option>
              {contactsForQuoteCompany.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.first_name} {contact.last_name}
                </option>
              ))}
            </select>

            <input name="company_name" placeholder="Company" value={quoteForm.company_name || ""} onChange={handleQuoteChange} />
            <input name="attn" placeholder="Attn" value={quoteForm.attn || ""} onChange={handleQuoteChange} />
            <input name="email" placeholder="Email" value={quoteForm.email || ""} onChange={handleQuoteChange} />
            <input name="model" placeholder="Model" value={quoteForm.model || ""} onChange={handleQuoteChange} />
            <input name="serial_number" placeholder="Serial Number" value={quoteForm.serial_number || ""} onChange={handleQuoteChange} />

            <select name="status" value={quoteForm.status} onChange={handleQuoteChange}>
              <option value="quoted">Quoted</option>
              <option value="ordered">Ordered</option>
            </select>

            <input name="customer_po_number" placeholder="Customer PO #" value={quoteForm.customer_po_number || ""} onChange={handleQuoteChange} />
            <input type="date" name="ordered_date" value={quoteForm.ordered_date || ""} onChange={handleQuoteChange} />
            <input name="order_confirmation_number" placeholder="Order Confirmation #" value={quoteForm.order_confirmation_number || ""} onChange={handleQuoteChange} />
            <input type="date" name="order_confirmation_date" value={quoteForm.order_confirmation_date || ""} onChange={handleQuoteChange} />
            <input name="vendor_order_confirmation_number" placeholder="Vendor Order Confirmation #" value={quoteForm.vendor_order_confirmation_number || ""} onChange={handleQuoteChange} />
            <input type="date" name="vendor_order_confirmation_date" value={quoteForm.vendor_order_confirmation_date || ""} onChange={handleQuoteChange} />

            <input name="ship_to_company" placeholder="Ship To Company" value={quoteForm.ship_to_company || ""} onChange={handleQuoteChange} />
            <input name="ship_to_address_1" placeholder="Ship To Address 1" value={quoteForm.ship_to_address_1 || ""} onChange={handleQuoteChange} />
            <input name="ship_to_address_2" placeholder="Ship To Address 2" value={quoteForm.ship_to_address_2 || ""} onChange={handleQuoteChange} />
            <input name="ship_to_city" placeholder="Ship To City" value={quoteForm.ship_to_city || ""} onChange={handleQuoteChange} />
            <input name="ship_to_state" placeholder="Ship To State" value={quoteForm.ship_to_state || ""} onChange={handleQuoteChange} />
            <input name="ship_to_zipcode" placeholder="Ship To Zipcode" value={quoteForm.ship_to_zipcode || ""} onChange={handleQuoteChange} />
            <textarea className="wide-field" name="ship_to_notes" placeholder="Ship To Notes / Delivery Contact" value={quoteForm.ship_to_notes || ""} onChange={handleQuoteChange} />

            <textarea className="wide-field" name="notes" placeholder="Quote Notes" value={quoteForm.notes || ""} onChange={handleQuoteChange} />
          </div> */}
          <div className="quote-form-sections">
  <div className="form-section">
    <h3>Quote Info</h3>

    <div className="form-grid">
      <select name="company_id" value={quoteForm.company_id} onChange={handleQuoteChange}>
        <option value="">Select Company</option>
        {companies.map((company) => (
          <option key={company.id} value={company.id}>{company.name}</option>
        ))}
      </select>

      <select name="contact_id" value={quoteForm.contact_id} onChange={handleQuoteChange} disabled={!quoteForm.company_id}>
        <option value="">{quoteForm.company_id ? "Select Contact" : "Select Company First"}</option>
        {contactsForQuoteCompany.map((contact) => (
          <option key={contact.id} value={contact.id}>{contact.first_name} {contact.last_name}</option>
        ))}
      </select>

      <input name="company_name" placeholder="Company" value={quoteForm.company_name || ""} onChange={handleQuoteChange} />
      <input name="attn" placeholder="Attn" value={quoteForm.attn || ""} onChange={handleQuoteChange} />
      <input name="email" placeholder="Email" value={quoteForm.email || ""} onChange={handleQuoteChange} />
      <input name="model" placeholder="Model" value={quoteForm.model || ""} onChange={handleQuoteChange} />
      <input name="serial_number" placeholder="Serial Number" value={quoteForm.serial_number || ""} onChange={handleQuoteChange} />

      <select name="status" value={quoteForm.status} onChange={handleQuoteChange}>
        <option value="quoted">Quoted</option>
        <option value="ordered">Ordered</option>
      </select>

      <textarea className="wide-field" name="notes" placeholder="Quote Notes" value={quoteForm.notes || ""} onChange={handleQuoteChange} />
    </div>
  </div>

  <div className="form-section">
    <h3>Order / PO Info</h3>

    <div className="form-grid">
      <input name="customer_po_number" placeholder="Customer PO #" value={quoteForm.customer_po_number || ""} onChange={handleQuoteChange} />
      <input type="date" name="ordered_date" value={quoteForm.ordered_date || ""} onChange={handleQuoteChange} />
      <input name="order_confirmation_number" placeholder="Order Confirmation #" value={quoteForm.order_confirmation_number || ""} onChange={handleQuoteChange} />
      <input type="date" name="order_confirmation_date" value={quoteForm.order_confirmation_date || ""} onChange={handleQuoteChange} />
      <input name="vendor_order_confirmation_number" placeholder="Vendor Order Confirmation #" value={quoteForm.vendor_order_confirmation_number || ""} onChange={handleQuoteChange} />
      <input type="date" name="vendor_order_confirmation_date" value={quoteForm.vendor_order_confirmation_date || ""} onChange={handleQuoteChange} />
    </div>
  </div>

  <div className="form-section">
    <h3>Ship To Info</h3>

    <div className="form-grid">
      <input name="ship_to_company" placeholder="Ship To Company" value={quoteForm.ship_to_company || ""} onChange={handleQuoteChange} />
      <input name="ship_to_address_1" placeholder="Ship To Address 1" value={quoteForm.ship_to_address_1 || ""} onChange={handleQuoteChange} />
      <input name="ship_to_address_2" placeholder="Ship To Address 2" value={quoteForm.ship_to_address_2 || ""} onChange={handleQuoteChange} />
      <input name="ship_to_city" placeholder="Ship To City" value={quoteForm.ship_to_city || ""} onChange={handleQuoteChange} />
      <input name="ship_to_state" placeholder="Ship To State" value={quoteForm.ship_to_state || ""} onChange={handleQuoteChange} />
      <input name="ship_to_zipcode" placeholder="Ship To Zipcode" value={quoteForm.ship_to_zipcode || ""} onChange={handleQuoteChange} />
      <textarea className="wide-field" name="ship_to_notes" placeholder="Ship To Notes / Delivery Contact" value={quoteForm.ship_to_notes || ""} onChange={handleQuoteChange} />
    </div>
  </div>
</div>

          <h3>Line Items</h3>

          <div className="table-wrap">
            <table className="line-table">
              <thead>
                <tr>
                  <th>Part #</th>
                  <th>Description</th>
                  <th>Vendor</th>
                  <th>List</th>
                  <th>Surcharge</th>
                  <th>Multiplier</th>
                  <th>Markup</th>
                  <th>Sell</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={index}>
                    <td><input value={item.part_number || ""} onChange={(e) => updateLine(index, "part_number", e.target.value)} /></td>
                    <td><textarea value={item.description || ""} onChange={(e) => updateLine(index, "description", e.target.value)} /></td>
                    <td><input value={item.vendor || ""} onChange={(e) => updateLine(index, "vendor", e.target.value)} /></td>
                    <td><input type="number" value={item.list_price ?? ""} onChange={(e) => updateLine(index, "list_price", e.target.value)} /></td>
                    <td><input type="number" step="0.01" value={item.surcharge ?? ""} onChange={(e) => updateLine(index, "surcharge", e.target.value)} /></td>
                    <td><input type="number" step="0.01" min="0" value={item.multiplier ?? ""} onChange={(e) => updateLine(index, "multiplier", e.target.value)} /></td>
                    <td><input type="number" step="0.01" value={item.markup ?? ""} onChange={(e) => updateLine(index, "markup", e.target.value)} /></td>
                    <td><input type="number" value={item.sell_price ?? ""} onChange={(e) => updateLine(index, "sell_price", e.target.value)} /></td>
                    <td><input type="number" value={item.qty ?? ""} onChange={(e) => updateLine(index, "qty", e.target.value)} /></td>
                    <td className="money-cell">{money(toNumber(item.sell_price) * toNumber(item.qty, 1))}</td>
                    <td><input value={item.notes || ""} onChange={(e) => updateLine(index, "notes", e.target.value)} /></td>
                    <td><button className="icon-btn danger" type="button" onClick={() => removeLine(index)}>X</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="form-actions">
            <button className="secondary-btn" type="button" onClick={addLine}>
              Add Line Item
            </button>
            <div className="quote-total">Total: {money(quoteTotal)}</div>
            <button className="primary-btn" type="submit">
              {editingQuoteId ? "Update Quote" : "Save Quote"}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="section-header">
          <div>
            <h2>Quote Dashboard</h2>
            <p>Search by date, quote #, company, model, serial #, total, or status.</p>
          </div>
          <div className="quote-tools">
            <input placeholder="Search quotes..." value={quoteSearch} onChange={(e) => setQuoteSearch(e.target.value)} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="quoted">Quoted</option>
              <option value="ordered">Ordered</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Quote #</th>
                <th>Company</th>
                <th>Model</th>
                <th>Serial #</th>
                <th>Total</th>
                <th>Status</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map((quote) => (
                <tr key={quote.id}>
                  <td>{quote.date}</td>
                  <td className="quote-number">{quote.quote_number}</td>
                  <td>{quote.company_name}</td>
                  <td>{quote.model}</td>
                  <td>{quote.serial_number}</td>
                  <td className="money-cell">{money(quote.total)}</td>
                  <td><span className={`status-pill ${quote.status}`}>{quote.status}</span></td>
                  <td className="button-group">
                    <button type="button" onClick={() => editQuote(quote.id)}>Edit</button>
                    <button type="button" onClick={() => generateDocumentPdf(quote.id, "quote")}>Quote PDF</button>
                    <button type="button" onClick={() => generateDocumentPdf(quote.id, "po")}>PO PDF</button>
                    <button type="button" onClick={() => generateDocumentPdf(quote.id, "order_confirmation")}>OC PDF</button>
                    <button type="button" className="danger-text" onClick={() => deleteQuote(quote.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan="8" className="empty-row">No quotes found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <div>
            <h2>Companies</h2>
            <p>Add and manage vendors, contractors, wholesalers, and end users.</p>
          </div>
          <div className="quote-tools">
            <input
              placeholder="Search companies..."
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
            />
          </div>
        </div>

        <form onSubmit={saveCompany} className="form-grid">
          <select name="type" value={companyForm.type} onChange={handleCompanyChange}>
            <option value="vendor">Vendor</option>
            <option value="contractor">Contractor</option>
            <option value="wholesaler">Wholesaler</option>
            <option value="end_user">End User</option>
          </select>
          <input name="name" placeholder="Company Name" value={companyForm.name} onChange={handleCompanyChange} required />
          <input name="address_1" placeholder="Address 1" value={companyForm.address_1 || ""} onChange={handleCompanyChange} />
          <input name="address_2" placeholder="Address 2" value={companyForm.address_2 || ""} onChange={handleCompanyChange} />
          <input name="city" placeholder="City" value={companyForm.city || ""} onChange={handleCompanyChange} />
          <input name="state" placeholder="State" value={companyForm.state || ""} onChange={handleCompanyChange} />
          <input name="zipcode" placeholder="Zipcode" value={companyForm.zipcode || ""} onChange={handleCompanyChange} />
          <textarea className="wide-field" name="notes" placeholder="Notes" value={companyForm.notes || ""} onChange={handleCompanyChange} />

          <div className="form-actions">
            {editingCompanyId && (
              <button className="secondary-btn" type="button" onClick={cancelCompanyEdit}>
                Cancel Edit
              </button>
            )}
            <button className="primary-btn" type="submit">
              {editingCompanyId ? "Update Company" : "Add Company"}
            </button>
          </div>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Name</th>
                <th>City</th>
                <th>State</th>
                <th>Zip</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((company) => (
                <tr key={company.id}>
                  <td>{company.id}</td>
                  <td>{company.type}</td>
                  <td>{company.name}</td>
                  <td>{company.city}</td>
                  <td>{company.state}</td>
                  <td>{company.zipcode}</td>
                  <td>{company.notes}</td>
                  <td className="button-group">
                    <button type="button" onClick={() => editCompany(company)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger-text"
                      onClick={() => deleteCompany(company.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filteredCompanies.length === 0 && (
                <tr>
                  <td colSpan="8" className="empty-row">No companies found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <div>
            <h2>Contacts</h2>
            <p>Add customer, vendor, and internal contacts.</p>
          </div>
          <div className="quote-tools">
            <input
              placeholder="Search contacts..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
            />
          </div>
        </div>

        <form onSubmit={saveContact} className="form-grid">
          <select name="company_id" value={contactForm.company_id} onChange={handleContactChange}>
            <option value="">Select Company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
          <input name="first_name" placeholder="First Name" value={contactForm.first_name || ""} onChange={handleContactChange} />
          <input name="last_name" placeholder="Last Name" value={contactForm.last_name || ""} onChange={handleContactChange} />
          <input name="email" placeholder="Email" value={contactForm.email || ""} onChange={handleContactChange} />
          <input name="tel" placeholder="Tel" value={contactForm.tel || ""} onChange={handleContactChange} />
          <input name="mobile" placeholder="Mobile" value={contactForm.mobile || ""} onChange={handleContactChange} />
          <input name="role" placeholder="Role" value={contactForm.role || ""} onChange={handleContactChange} />
          <textarea className="wide-field" name="notes" placeholder="Notes" value={contactForm.notes || ""} onChange={handleContactChange} />

          <div className="form-actions">
            {editingContactId && (
              <button className="secondary-btn" type="button" onClick={cancelContactEdit}>
                Cancel Edit
              </button>
            )}
            <button className="primary-btn" type="submit">
              {editingContactId ? "Update Contact" : "Add Contact"}
            </button>
          </div>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Company</th>
                <th>Name</th>
                <th>Email</th>
                <th>Tel</th>
                <th>Mobile</th>
                <th>Role</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact) => (
                <tr key={contact.id}>
                  <td>{contact.id}</td>
                  <td>{getCompanyName(contact.company_id)}</td>
                  <td>{contact.first_name} {contact.last_name}</td>
                  <td>{contact.email}</td>
                  <td>{contact.tel}</td>
                  <td>{contact.mobile}</td>
                  <td>{contact.role}</td>
                  <td>{contact.notes}</td>
                  <td className="button-group">
                    <button type="button" onClick={() => editContact(contact)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger-text"
                      onClick={() => deleteContact(contact.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filteredContacts.length === 0 && (
                <tr>
                  <td colSpan="9" className="empty-row">No contacts found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default App;