// What the status line says while results are loading in the Master Price List
export function statusText(kind, { search = "", page = 1 } = {}) {
  const q = search.trim();
  switch (kind) {
    case "initial": return "Loading Master Price List…";
    case "searching": return q ? `Searching for “${q}”…` : "Loading all parts…";
    case "filtering": return "Applying filter…";
    case "clearing": return "Clearing search and filters…";
    case "page": return `Loading page ${page}…`;
    case "retry": return "Trying again…";
    default: return "Loading…";
  }
}
