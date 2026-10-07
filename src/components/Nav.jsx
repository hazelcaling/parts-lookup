import React from "react";
import { NavLink } from "react-router-dom";

const link = ({ isActive }) => ({
  padding: "8px 14px", borderRadius: "4px", textDecoration: "none", fontSize: "14px",
  color: isActive ? "white" : "#0f172a", background: isActive ? "#0ea5e9" : "transparent",
});

export default function Nav() {
  return (
    <nav style={{ display: "flex", gap: "6px", padding: "10px 20px 0", fontFamily: "Arial, sans-serif", maxWidth: "1900px", margin: "0 auto", boxSizing: "border-box" }}>
      <NavLink to="/" end style={link}>Parts Lookup</NavLink>
      <NavLink to="/search" style={link}>Master Price List</NavLink>
      <NavLink to="/pricelists" style={link}>Price Lists</NavLink>
    </nav>
  );
}
