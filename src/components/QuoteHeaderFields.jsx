import React, { useState } from "react";
import Autosuggest from "./Autosuggest";
import { normName } from "../utils/names";
import { api } from "../api";

const sub = { color: "#475569", marginTop: 2 };
const typeLabel = (t) => (t ? t[0].toUpperCase() + t.slice(1) : "");
const q = (s) => encodeURIComponent(s);

// Company / Model / Attn / Serial / Job fields of the Create Quote form,
// same layout as before, with autosuggest from the database.
export default function QuoteHeaderFields({
  company, setCompany, attn, setAttn, modelField, setModelField, serial, setSerial, job, setJob,
}) {
  const [selCompanyState, setSelCompanyState] = useState(null); // {id, name, ...}
  const [msg, setMsg] = useState("");

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 2500); };
  // header Clear button empties the company -> the selected company no longer applies
  const [selRaw, setSelCompany] = [selCompanyState, setSelCompanyState];
  const selCompany = company ? selRaw : null;

  // Save just the name (no details pop-up). The server returns the existing company if the name is already saved.
  const addCompany = async (name) => {
    try {
      const c = await api("/companies", { method: "POST", body: { name } });
      setSelCompany(c); setCompany(c.name);
      flash(c.existing ? "Company already saved" : "Company saved");
    } catch (e) { flash(e.message); }
  };

  // Save just the contact name (no details pop-up), linked to the selected company if there is one.
  // The server returns the existing contact if that name is already saved for the company.
  const addContact = async (name) => {
    try {
      const c = selCompany
        ? await api(`/companies/${selCompany.id}/contacts`, { method: "POST", body: { name } })
        : await api("/contacts", { method: "POST", body: { name } });
      setAttn(c.name);
      flash(c.existing ? "Contact already saved" : "Contact saved");
    } catch (e) { flash(e.message); }
  };

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
        onAdd={addCompany}
        hideAdd={(items, s) => items.some((c) => normName(c.name) === normName(s))}
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
        placeholder="Attn"
        value={attn}
        onChange={setAttn}
        minChars={0}
        fetchItems={(s) => api(selCompany ? `/companies/${selCompany.id}/contacts?q=${q(s)}` : `/contacts?q=${q(s)}`)}
        renderItem={(c) => (
          <>
            <strong style={{ color: "#0f172a" }}>{c.name}</strong>
            <div style={sub}>{[c.title, c.email, c.phone].filter(Boolean).join(" · ")}</div>
          </>
        )}
        onSelect={(c) => setAttn(c.name)}
        addLabel={(s) => (selCompany ? `+ Add contact "${s}" to ${selCompany.name}` : `+ Add new contact "${s}"`)}
        onAdd={addContact}
        hideAdd={(items, s) => items.some((c) => normName(c.name) === normName(s))}
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

    </>
  );
}
