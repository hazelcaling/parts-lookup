// Company name normalization: curly quotes/apostrophes -> straight, collapse whitespace, trim, lower case.
// normName (JS) and normNameSql (Postgres) must give the same result.
const SINGLE = "\u2018\u2019\u201A\u201B\u2032\u0060\u00B4";
const DOUBLE = "\u201C\u201D\u201E\u201F\u2033";
export const normName = (s) => String(s ?? "")
  .replace(new RegExp(`[${SINGLE}]`, "g"), "'").replace(new RegExp(`[${DOUBLE}]`, "g"), '"')
  .replace(/\s+/g, " ").trim().toLowerCase();
export const normNameSql = (col) =>
  `lower(btrim(regexp_replace(translate(${col}, '${SINGLE}${DOUBLE}', '${"''".repeat(SINGLE.length)}${'"'.repeat(DOUBLE.length)}'), '\\s+', ' ', 'g')))`;
