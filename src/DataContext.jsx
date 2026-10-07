import React, { createContext, useContext, useEffect, useState } from "react";

const DataContext = createContext(null);
export const useData = () => useContext(DataContext);

export function DataProvider({ children }) {
  const [state, setState] = useState({ status: "loading" });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await fetch("/api/data", { credentials: "same-origin" });
      if (res.status === 401) return setState({ status: "login" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      // Original data had NaN prices (e.g. obsolete parts); JSON sends them as null
      for (const series of Object.values(data.partsData))
        for (const parts of Object.values(series))
          for (const p of parts) if (p.price === null) p.price = NaN;
      setState({ status: "ready", data });
    } catch {
      setState({ status: "error" });
    }
  };

  useEffect(() => { load(); }, []);

  const login = async (e) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) { setPassword(""); setState({ status: "loading" }); load(); }
    else setError((await res.json().catch(() => ({}))).error || "Login failed");
  };

  const box = { maxWidth: 360, margin: "15vh auto", padding: 24, textAlign: "center", fontFamily: "inherit" };

  if (state.status === "loading") return <div style={box}>Loading…</div>;
  if (state.status === "error")
    return <div style={box}>Could not load data. <button onClick={load}>Retry</button></div>;
  if (state.status === "login")
    return (
      <form style={box} onSubmit={login}>
        <h2>Parts Lookup</h2>
        <input type="password" placeholder="Password" value={password} autoFocus
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 12, boxSizing: "border-box" }} />
        <button type="submit" style={{ width: "100%", padding: 10 }}>Log in</button>
        {error && <p style={{ color: "#c00" }}>{error}</p>}
      </form>
    );
  return <DataContext.Provider value={state.data}>{children}</DataContext.Provider>;
}
