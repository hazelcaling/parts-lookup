import React from "react";

export default function Modal({ title, children, onClose }) {
  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
      }}
    >
      <div style={{
        background: "#fff", borderRadius: "10px", border: "1px solid #ddd", padding: "24px",
        width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto",
        fontFamily: "Arial, sans-serif", boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
      }}>
        <h2 style={{ marginTop: 0, marginBottom: "16px" }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
