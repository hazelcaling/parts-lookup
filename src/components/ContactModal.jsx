import React, { useState } from "react";
import Modal from "./Modal";
import { inputStyle, btn } from "./styles";
import { api } from "../api";

export default function ContactModal({ company, initialName = "", onSaved, onClose }) {
  const [f, setF] = useState({ name: initialName, title: "", email: "", phone: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError(""); setSaving(true);
    try { onSaved(await api(`/companies/${company.id}/contacts`, { method: "POST", body: f })); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={`Add Contact - ${company.name}`} onClose={onClose}>
      <form onSubmit={save} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <input style={inputStyle} placeholder="Name *" value={f.name} onChange={set("name")} autoFocus required />
        <input style={inputStyle} placeholder="Title" value={f.title} onChange={set("title")} />
        <input style={inputStyle} placeholder="Email" type="email" value={f.email} onChange={set("email")} />
        <input style={inputStyle} placeholder="Phone" value={f.phone} onChange={set("phone")} />
        {error && <div style={{ gridColumn: "1 / -1", color: "#dc2626" }}>{error}</div>}
        <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={btn("#64748b")}>Cancel</button>
          <button type="submit" disabled={saving} style={btn("#1f4ed8")}>{saving ? "Saving..." : "Save Contact"}</button>
        </div>
      </form>
    </Modal>
  );
}
