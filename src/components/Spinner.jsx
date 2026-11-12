import React from "react";

// Small spinning circle used next to "Loading…", "Signing in…" and "Searching…" messages
export default function Spinner({ large = false, style }) {
  return <span className={large ? "pl-spinner pl-spinner-lg" : "pl-spinner"} role="presentation" style={style} />;
}
