import React, { useState } from "react";
import { partsData } from "./data/partsData";
import { jsPDF } from "jspdf";
import { useNavigate } from "react-router-dom";
import { generateQuoteNumber, money, drawQuoteHeader } from "./utils/pdfHelpers";

function App() {

const navigate = useNavigate();

const [model, setModel] = useState("");
const [results, setResults] = useState([]);
const [searched, setSearched] = useState(false);
const [seriesName, setSeriesName] = useState("");
const [searchedModel, setSearchedModel] = useState("");

const [company,setCompany] = useState("");
const [attn,setAttn] = useState("");
const [email,setEmail] = useState("");

const searchParts = () => {

const modelKey = model.trim().toUpperCase();

let modelParts = [];
let foundSeries = "";

for (const series in partsData) {

if (partsData[series][modelKey]) {

modelParts = partsData[series][modelKey];
foundSeries = series;
break;

}

}

const partsWithQty = modelParts.map((p)=>({

...p,
qty: p.defaultQty || 1

}));

setResults(partsWithQty);
setSeriesName(foundSeries);
setSearchedModel(modelKey);
setSearched(true);

};

const clearSearch = () => {

setModel("");
setResults([]);
setSearched(false);
setSeriesName("");
setSearchedModel("");

};

const updateQty = (index,value) => {

const updated = [...results];
updated[index].qty = Number(value);
setResults(updated);

};

const subtotal = results.reduce(
(sum,part)=>sum + part.qty * part.price,
0
);

const drawTableHeader = (doc,y) => {

doc.setFont(undefined,"bold");
doc.setFontSize(11);

doc.text("Line",14,y);
doc.text("Part Number",26,y);
doc.text("Description",62,y);
doc.text("Qty",148,y,{align:"center"});
doc.text("Unit Price",168,y,{align:"center"});
doc.text("Total",196,y,{align:"right"});

y += 4;
doc.line(14,y,196,y);

return y + 8;

};

const generatePDF = () => {

const quoteNumber = generateQuoteNumber();

const doc = new jsPDF();

let y = drawQuoteHeader(doc,{
quoteNumber,
company,
attn,
email,
subtitle:"Recommended Annual Kit",
subtitle2:[`Series: ${seriesName}`,`Model: ${searchedModel}`]
});

y = drawTableHeader(doc,y);

doc.setFont(undefined,"normal");
doc.setFontSize(10);

let item = 1;

results.forEach((p)=>{

const unit = Number(p.price || 0);
const qty = Number(p.qty || 1);
const total = unit * qty;

const descLines = doc.splitTextToSize(p.description || "",78);
const rowHeight = Math.max(descLines.length*5+2,8);

if (y + rowHeight > 265) {

doc.addPage();

y = drawQuoteHeader(doc,{
quoteNumber,
company,
attn,
email,
subtitle:"Recommended Annual Kit",
subtitle2:[`Series: ${seriesName}`,`Model: ${searchedModel}`]
});

y = drawTableHeader(doc,y);

doc.setFont(undefined,"normal");
doc.setFontSize(10);

}

doc.text(String(item),14,y);
doc.text(p.pn || "",26,y);
doc.text(descLines,62,y);

doc.text(String(qty),148,y,{align:"center"});
doc.text(money(unit),168,y,{align:"center"});
doc.text(money(total),196,y,{align:"right"});

y += rowHeight;

item++;

});

y += 4;
doc.line(120,y,196,y);

y += 8;

doc.setFontSize(12);
doc.setFont(undefined,"bold");

doc.text(`Subtotal: ${money(subtotal)}`,196,y,{align:"right"});

y += 12;

doc.setFontSize(10);
doc.setFont(undefined,"italic");

doc.text("Freight and applicable sales tax not included.",14,y);

y += 10;

doc.setFont(undefined,"normal");
doc.text("Prepared by Hazel Caling",14,y);

doc.save(`Quote_${quoteNumber}.pdf`);

const subject = `Quote #${quoteNumber}`;

const body = `Hello,

Please see the attached quote.

Thank you.`;

if(email.trim()){

window.location.href =
`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

}

};

return (

<div style={{padding:"40px",fontFamily:"Arial"}}>

<button
onClick={() => navigate("/quote")}
style={{
padding:"10px 18px",
marginBottom:"20px",
background:"#0ea5e9",
color:"white",
border:"none",
borderRadius:"4px",
cursor:"pointer"
}}
>
Create Manual Quote
</button>

<h2>Parts Lookup</h2>

<form onSubmit={(e)=>{
e.preventDefault();
searchParts();
}}>

<input
type="text"
placeholder="Enter model (ex: 1007 or 399B)"
value={model}
onChange={(e)=>setModel(e.target.value.toUpperCase())}
style={{padding:"8px",marginRight:"10px"}}
/>

<button
type="submit"
style={{padding:"8px 15px",marginRight:"10px"}}
>
Search
</button>

<button
type="button"
onClick={clearSearch}
style={{padding:"8px 15px"}}
>
Clear
</button>

</form>

<br/>

{searched && results.length>0 && (

<>

<div style={{marginTop:"20px"}}>

<div style={{fontSize:"14px",color:"#555"}}>
Recommended Annual Kit
</div>

<div style={{fontSize:"24px",fontWeight:"700"}}>
{seriesName} {searchedModel}
</div>

<hr/>

</div>

<table
border="1"
cellPadding="8"
style={{borderCollapse:"collapse",minWidth:"900px"}}
>

<thead>

<tr>

<th>Line</th>
<th>Part Number</th>
<th>Description</th>
<th>Unit Price</th>
<th style={{textAlign:"center"}}>Qty</th>
<th>Total</th>

</tr>

</thead>

<tbody>

{results.map((part,index)=>(

<tr key={index}>

<td style={{textAlign:"center"}}>{index+1}</td>

<td>{part.pn}</td>

<td>{part.description}</td>

<td>{money(part.price)}</td>

<td style={{textAlign:"center"}}>

<input
type="number"
min="1"
value={part.qty}
onChange={(e)=>updateQty(index,e.target.value)}
style={{
width:"60px",
textAlign:"center"
}}
/>

</td>

<td>{money(part.qty*part.price)}</td>

</tr>

))}

</tbody>

<tfoot>

<tr>

<td colSpan="5" style={{textAlign:"right"}}>
<strong>Subtotal</strong>
</td>

<td>
<strong>{money(subtotal)}</strong>
</td>

</tr>

</tfoot>

</table>

<br/>

<div style={{marginTop:"20px"}}>

<div>Quote Info</div>

<input
placeholder="Company Name"
value={company}
onChange={(e)=>setCompany(e.target.value)}
style={{padding:"8px",marginRight:"10px"}}
/>

<input
placeholder="Attn To"
value={attn}
onChange={(e)=>setAttn(e.target.value)}
style={{padding:"8px",marginRight:"10px"}}
/>

<input
placeholder="Email"
value={email}
onChange={(e)=>setEmail(e.target.value)}
style={{padding:"8px"}}
/>

</div>

<button
onClick={generatePDF}
style={{
marginTop:"25px",
padding:"10px 20px",
background:"#1f4ed8",
color:"white",
border:"none",
borderRadius:"4px",
cursor:"pointer"
}}
>

Download Quote PDF

</button>

</>

)}

{searched && results.length===0 && (
<p>No parts found</p>
)}

</div>

);

}

export default App;