// Same normalization as server/names.js: ignore case, extra spaces and curly vs straight quotes
export const normName = (s) => String(s ?? "")
  .replace(/[\u2018\u2019\u201A\u201B\u2032\u0060\u00B4]/g, "'").replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
  .replace(/\s+/g, " ").trim().toLowerCase();
