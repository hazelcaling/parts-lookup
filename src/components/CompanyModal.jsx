import React, { useState } from "react";
import Modal from "./Modal";
import { inputStyle, btn } from "./styles";
import { api } from "../api";

const TYPES = ["contractor", "wholesaler", "end user", "vendor"];

export default function CompanyModal({ initialName = "", onSaved, onClose }) {
  const [f, setF] = useState({
    name: initialName, type: "", address1: "", address2: "", city: "",
    state: "", zipcode: "", phone: "", email: "", notes: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError(""); setSaving(true);
    try { onSaved(await api("/companies", { method: "POST", body: f })); }
    catch (err) { setError(err.message === "Already exists" ? "A company with this name already exists." : err.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Add New Company" onClose={onClose}>
      <form onSubmit={save} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <input style={{ ...inputStyle, gridColumn: "1 / -1" }} placeholder="Company name *" value={f.name} onChange={set("name")} autoFocus required />
        <select style={inputStyle} value={f.type ?? ""} onChange={set("type")}>
          <option value="">— No type —</option>
          {TYPES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
        </select>
        <input style={inputStyle} placeholder="Phone" value={f.phone} onChange={set("phone")} />
        <input style={{ ...inputStyle, gridColumn: "1 / -1" }} placeholder="Email" type="email" value={f.email} onChange={set("email")} />
        <input style={{ ...inputStyle, gridColumn: "1 / -1" }} placeholder="Address 1" value={f.address1} onChange={set("address1")} />
        <input style={{ ...inputStyle, gridColumn: "1 / -1" }} placeholder="Address 2" value={f.address2} onChange={set("address2")} />
        <input style={inputStyle} placeholder="City" value={f.city} onChange={set("city")} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <input style={inputStyle} placeholder="State" value={f.state} onChange={set("state")} />
          <input style={inputStyle} placeholder="Zip" value={f.zipcode} onChange={set("zipcode")} />
        </div>
        <textarea style={{ ...inputStyle, gridColumn: "1 / -1", minHeight: "60px" }} placeholder="Notes" value={f.notes} onChange={set("notes")} />
        {error && <div style={{ gridColumn: "1 / -1", color: "#dc2626" }}>{error}</div>}
        <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={btn("#64748b")}>Cancel</button>
          <button type="submit" disabled={saving} style={btn("#1f4ed8")}>{saving ? "Saving..." : "Save Company"}</button>
        </div>
      </form>
    </Modal>
  );
}
