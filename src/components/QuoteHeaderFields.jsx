import React, { useState } from "react";
import Autosuggest from "./Autosuggest";
import CompanyModal from "./CompanyModal";
import ContactModal from "./ContactModal";
import { api } from "../api";

const sub = { color: "#475569", marginTop: 2 };
const typeLabel = (t) => (t ? t[0].toUpperCase() + t.slice(1) : "");
const q = (s) => encodeURIComponent(s);

// Company / Model / Attn / Serial / Job fields of the Create Quote form,
// same layout as before, with autosuggest from the database.
export default function QuoteHeaderFields({
  company, setCompany, attn, setAttn, modelField, setModelField, serial, setSerial, job, setJob,
}) {
  const [selCompany, setSelCompany] = useState(null); // {id, name, ...}
  const [modal, setModal] = useState(null); // {kind:'company'|'contact', name}
  const [msg, setMsg] = useState("");

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };

  return (
    <>
      <Autosuggest
        placeholder="Company"
        value={company}
        onChange={(v) => {
          setCompany(v);
          if (selCompany && v !== selCompany.name) setSelCompany(null);
        }}
        fetchItems={(s) => api(`/companies?q=${q(s)}`)}
        renderItem={(c) => (
          <>
            <strong style={{ color: "#0f172a" }}>{c.name}</strong>
            <div style={sub}>{[typeLabel(c.type), [c.city, c.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</div>
          </>
        )}
        onSelect={(c) => { setSelCompany(c); setCompany(c.name); }}
        addLabel={(s) => `+ Add new company "${s}"`}
        onAdd={(s) => setModal({ kind: "company", name: s })}
      />
      <Autosuggest
        placeholder="Model"
        value={modelField}
        onChange={setModelField}
        fetchItems={(s) => api(`/models?q=${q(s)}`)}
        renderItem={(m) => <strong style={{ color: "#0f172a" }}>{m}</strong>}
        onSelect={(m) => setModelField(m)}
      />
      <Autosuggest
        placeholder={selCompany ? "Attn" : "Attn (select a saved company to see contacts)"}
        value={attn}
        onChange={setAttn}
        minChars={0}
        fetchItems={(s) => (selCompany ? api(`/companies/${selCompany.id}/contacts?q=${q(s)}`) : Promise.resolve([]))}
        renderItem={(c) => (
          <>
            <strong style={{ color: "#0f172a" }}>{c.name}</strong>
            <div style={sub}>{[c.title, c.email, c.phone].filter(Boolean).join(" · ")}</div>
          </>
        )}
        onSelect={(c) => setAttn(c.name)}
        addLabel={selCompany ? (s) => `+ Add contact "${s}" to ${selCompany.name}` : null}
        onAdd={selCompany ? (s) => setModal({ kind: "contact", name: s }) : null}
      />
      <input
        placeholder="Serial"
        value={serial}
        onChange={(e) => setSerial(e.target.value)}
        style={{ padding: "10px", width: "100%", boxSizing: "border-box" }}
      />
      <div style={{ color: "#059669", fontSize: "13px", alignSelf: "center" }}>{msg}</div>
      <Autosuggest
        placeholder="Job"
        value={job}
        onChange={setJob}
        fetchItems={(s) => api(`/jobs?q=${q(s)}`)}
        renderItem={(j) => <strong style={{ color: "#0f172a" }}>{j.name}</strong>}
        onSelect={(j) => setJob(j.name)}
        addLabel={(s) => `+ Save job "${s}"`}
        onAdd={async (s) => {
          try {
            const j = await api("/jobs", { method: "POST", body: { name: s, company_id: selCompany?.id } });
            setJob(j.name); flash("Job saved");
          } catch (e) { flash(e.message === "Already exists" ? "Job already saved" : e.message); }
        }}
      />

      {modal?.kind === "company" && (
        <CompanyModal
          initialName={modal.name}
          onClose={() => setModal(null)}
          onSaved={(c) => { setSelCompany(c); setCompany(c.name); setModal(null); flash("Company saved"); }}
        />
      )}
      {modal?.kind === "contact" && selCompany && (
        <ContactModal
          company={selCompany}
          initialName={modal.name}
          onClose={() => setModal(null)}
          onSaved={(c) => { setAttn(c.name); setModal(null); flash("Contact saved"); }}
        />
      )}
    </>
  );
}
