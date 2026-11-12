// Data the browser downloads when the app opens: only the Annual Kit parts (partsData).
// The Master Price List searches the catalog on the server (/api/master), so the full catalog
// (~9 MB of JSON, never used by the browser) is no longer sent on every open.
// The JSON is built once and reused for every request until clear() is called (re-seed, notes, uploads).
export function createStartupData(pool) {
  let cache = null;
  let loading = null;
  let gen = 0; // bumped on every clear() so an in-flight load never caches stale data

  async function build() {
    const annual = await pool.query(
      "SELECT id, series, model, pn, description, price, annual, default_qty, notes, obsolete FROM annual_parts ORDER BY id"
    );
    const partsData = {};
    for (const r of annual.rows) {
      ((partsData[r.series] ??= {})[r.model] ??= []).push({
        pn: r.pn,
        description: r.description,
        price: r.price,
        annual: r.annual,
        defaultQty: r.default_qty,
        id: r.id,
        notes: r.notes || "",
        obsolete: r.obsolete,
      });
    }
    return { json: JSON.stringify({ partsData }) };
  }

  function load() {
    if (cache) return Promise.resolve(cache);
    if (loading) return loading;
    const myGen = gen;
    const p = build().then((c) => {
      if (myGen === gen) cache = c;
      return c;
    });
    loading = p;
    p.finally(() => { if (loading === p) loading = null; }).catch(() => {});
    return p;
  }

  function clear() { cache = null; loading = null; gen++; }

  return { load, clear };
}
