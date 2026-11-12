import { useEffect, useState } from "react";

// Form state kept in localStorage so a reload doesn't lose a half-filled form.
// fresh() builds a new empty form; skip lists keys that are never restored (e.g. the auto date);
// normalize(state) fixes up a restored draft (e.g. gives line items their ids).
export function useDraft(key, fresh, { skip = [], normalize = (x) => x } = {}) {
  const [state, setState] = useState(() => {
    const base = fresh();
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      if (saved && typeof saved === "object") {
        for (const k of skip) delete saved[k];
        return normalize({ ...base, ...saved });
      }
    } catch { /* ignore a broken draft */ }
    return normalize(base);
  });
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* storage full/blocked */ }
    }, 300);
    return () => clearTimeout(t);
  }, [key, state]);
  return [state, setState];
}
