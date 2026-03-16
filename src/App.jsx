import React, { useState } from "react";
import { partsData } from "./data/partsData";
import { jsPDF } from "jspdf";
import { useNavigate } from "react-router-dom";



function App() {

const navigate = useNavigate();

const [model, setModel] = useState("");
const [results, setResults] = useState([]);
const [searched, setSearched] = useState(false);
const [seriesName, setSeriesName] = useState("");
const [searchedModel, setSearchedModel] = useState("");

const [company,setCompany] = useState("");
const [attn,setAttn] = useState("");

const generateQuoteNumber = () => {

const now = new Date();

const mm = String(now.getMonth()+1).padStart(2,"0");
const dd = String(now.getDate()).padStart(2,"0");
const yy = String(now.getFullYear()).slice(-2);

const random = Math.floor(Math.random()*90)+10;

return `Q${mm}${dd}${yy}${random}`;

};

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

const generatePDF = () => {

const quoteNumber = generateQuoteNumber();

const doc = new jsPDF();

let y = 20;

doc.setFontSize(18);
doc.text(`Quote #: ${quoteNumber}`,14,y);
y+=6;

y+=10;

doc.setFontSize(11);

doc.text(`Date: ${new Date().toLocaleDateString()}`,14,y);

y+=10;

doc.text(`Company: ${company}`,14,y);
y+=6;
doc.text(`Attn: ${attn}`,14,y);

y+=12;

doc.setFontSize(13);
doc.text("Recommended Annual Kit",14,y);

y+=8;

doc.setFontSize(11);
doc.text(`Series: ${seriesName}`,14,y);
y+=6;
doc.text(`Model: ${searchedModel}`,14,y);

y+=12;

doc.text("Part Number",14,y);
doc.text("Description",60,y);
doc.text("Qty",150,y);
doc.text("Total",170,y);

y+=4;
doc.line(14,y,195,y);

y+=8;

results.forEach((p)=>{

doc.text(p.pn,14,y);

doc.text(p.description.substring(0,40),60,y);

doc.text(String(p.qty),152,y);

doc.text(`$${(p.qty*p.price).toFixed(2)}`,170,y);

y+=8;

});

y+=5;

doc.line(120,y,195,y);

y += 8;

/* SUBTOTAL */
doc.setFontSize(12);
doc.setFont(undefined, "bold");
doc.text(`Subtotal: $${subtotal.toFixed(2)}`,150,y);

/* NOTES UNDER SUBTOTAL */
y += 10;

doc.setFontSize(10);
doc.setFont(undefined,"italic");

doc.text("Freight and applicable sales tax not included.", 14, y);

y += 5;

doc.text("Pricing valid for 30 days.", 14, y);

/* PREPARED BY */
y += 15;

doc.setFontSize(10);
doc.setFont(undefined,"normal");
doc.text("Prepared by Hazel Caling",14,y);

doc.save(`Quote_${quoteNumber}.pdf`);

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
style={{borderCollapse:"collapse",minWidth:"700px"}}
>

<thead>

<tr>

<th>Part Number</th>
<th>Description</th>
<th>Price</th>
<th style={{textAlign:"center"}}>Qty</th>
<th>Total</th>

</tr>

</thead>

<tbody>

{results.map((part,index)=>(
<tr key={index}>

<td>{part.pn}</td>

<td>{part.description}</td>

<td>${part.price.toFixed(2)}</td>

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

<td>${(part.qty*part.price).toFixed(2)}</td>

</tr>
))}

</tbody>

<tfoot>

<tr>

<td colSpan="4" style={{textAlign:"right"}}>
<strong>Subtotal</strong>
</td>

<td>
<strong>${subtotal.toFixed(2)}</strong>
</td>

</tr>

</tfoot>

</table>

<br/>

<div style={{marginTop:"20px"}}>

<div>
Quote Info
</div>

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