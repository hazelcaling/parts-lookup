import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import Spinner from "./components/Spinner";

const DataContext = createContext(null);
export const useData = () => useContext(DataContext);

const LOAD_TIMEOUT_MS = 120000; // a sleeping server can take about a minute to wake up

// Full-page "please wait" screen; after a few seconds it explains why it is taking a while,
// so a slow first open doesn't look frozen.
export function LoadingScreen({ message }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setSecs(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [message]);
  return (
    <div role="status" aria-live="polite" style={box}>
      <h2 style={{ marginTop: 0 }}>Parts Lookup</h2>
      <Spinner large />
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{message}</p>
      {secs >= 5 && (
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
          Still working… ({secs}s). If the app hasn’t been used for a while, the server may be waking up.
          This can take up to a minute. Please keep this page open.
        </p>
      )}
    </div>
  );
}

const box = { maxWidth: 380, margin: "15vh auto", padding: 24, textAlign: "center", fontFamily: "inherit" };

export function DataProvider({ children }) {
  const [state, setState] = useState({ status: "loading", message: "Opening Parts Lookup…" });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const loadId = useRef(0);

  const load = async (message = "Loading parts…") => {
    const my = ++loadId.current;
    setState({ status: "loading", message });
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), LOAD_TIMEOUT_MS);
    try {
      const res = await fetch("/api/data", { credentials: "same-origin", signal: ctl.signal });
      if (my !== loadId.current) return;
      if (res.status === 401) return setState({ status: "login" });
      if (!res.ok) throw new Error(`The server answered ${res.status}.`);
      const data = await res.json();
      // Original data had NaN prices (e.g. obsolete parts); JSON sends them as null
      for (const series of Object.values(data.partsData))
        for (const parts of Object.values(series))
          for (const p of parts) if (p.price === null) p.price = NaN;
      if (my === loadId.current) setState({ status: "ready", data });
    } catch (e) {
      if (my !== loadId.current) return;
      setState({
        status: "error",
        message: e.name === "AbortError"
          ? "The server is taking too long to respond."
          : e.message?.startsWith("The server") ? e.message : "Could not reach the server. Check your connection.",
      });
    } finally {
      clearTimeout(timer);
    }
  };

  useEffect(() => { load("Opening Parts Lookup…"); }, []);
  // Auto-logout: sessions expire after 10 hours; check every minute and return to the login screen
  useEffect(() => {
    if (state.status !== "ready") return;
    const t = setInterval(async () => {
      try {
        const r = await fetch("/api/session", { credentials: "same-origin" });
        if (r.ok && !(await r.json()).loggedIn) setState({ status: "login" });
      } catch { /* offline: try again later */ }
    }, 60000);
    return () => clearInterval(t);
  }, [state.status]);

  const login = async (e) => {
    e.preventDefault();
    if (signingIn) return;
    if (!password) return setError("Please enter the password.");
    setError("");
    setSigningIn(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setPassword("");
        setSigningIn(false);
        load("Signed in. Loading parts…");
        return;
      }
      setError((await res.json().catch(() => ({}))).error || "Login failed");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
    setSigningIn(false);
  };

  if (state.status === "loading") return <LoadingScreen message={state.message} />;
  if (state.status === "error")
    return (
      <div role="alert" style={box}>
        <h2 style={{ marginTop: 0 }}>Parts Lookup</h2>
        <p>{state.message} Could not load the parts data.</p>
        <button onClick={() => load("Trying again…")} style={{ padding: "8px 16px" }}>Try again</button>
      </div>
    );
  if (state.status === "login")
    return (
      <form style={box} onSubmit={login} aria-busy={signingIn}>
        <h2>Parts Lookup</h2>
        <input type="password" placeholder="Password" value={password} autoFocus disabled={signingIn}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 12, boxSizing: "border-box" }} />
        <button type="submit" disabled={signingIn}
          style={{ width: "100%", padding: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: signingIn ? "wait" : "pointer" }}>
          {signingIn ? <><Spinner /> Signing in…</> : "Log in"}
        </button>
        {signingIn && <p role="status" style={{ color: "#64748b", fontSize: 14 }}>Checking your password…</p>}
        {error && <p role="alert" style={{ color: "#c00" }}>{error}</p>}
      </form>
    );
  return <DataContext.Provider value={state.data}>{children}</DataContext.Provider>;
}
