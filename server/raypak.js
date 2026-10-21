// Raypak price list -> Raypak catalog (catalog_parts) prices.
// The newest saved Raypak price list is the only source of Raypak list prices:
//  - every catalog row whose part number is in the list gets the list's price and description
//  - every other catalog row gets price 0 and "Obsolete" appended to its notes (once)
//  - annual kit rows (annual_parts) follow the same rule (price + description from the list, else 0 + "Obsolete")
//  - part numbers in the list that are not in the catalog are added (no IPL info), series "Raypak Price List"
// IPL data (links, call outs, include notes, options, series/model/section) and user notes are not touched.

export const RAYPAK_ADDED_SERIES = "Raypak Price List";

// SQL expressions on c.notes: append / remove the "Obsolete" note
const ADD_OBSOLETE = `CASE WHEN COALESCE(c.notes, '') ~* '\\mobsolete\\M' THEN c.notes
                          WHEN COALESCE(c.notes, '') = '' THEN 'Obsolete' ELSE c.notes || '; Obsolete' END`;
const DROP_OBSOLETE = `regexp_replace(COALESCE(c.notes, ''), '(^|; )Obsolete$', '')`;

const count = async (client, sql, params) => Number((await client.query(sql, params)).rows[0].n);

export async function latestRaypakListId(client) {
  const { rows } = await client.query("SELECT id FROM price_lists WHERE is_raypak ORDER BY uploaded_at DESC, id DESC LIMIT 1");
  return rows[0]?.id ?? null;
}

// Apply one Raypak price list (must run inside the caller's transaction).
export async function applyRaypakList(client, listId) {
  const id = Number(listId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("invalid price list id");
  await client.query("DROP TABLE IF EXISTS _raypak_new");
  // one row per part number (highest price wins, like the import dedupe)
  await client.query(
    `CREATE TEMP TABLE _raypak_new ON COMMIT DROP AS
       SELECT DISTINCT ON (upper(trim(part_number))) upper(trim(part_number)) AS pn, description, list_price::float8 AS list_price
         FROM price_list_items WHERE price_list_id = ${id} AND trim(part_number) <> ''
        ORDER BY upper(trim(part_number)), list_price DESC NULLS LAST, id`);
  await client.query("CREATE INDEX ON _raypak_new (pn)");
  const inList = "EXISTS (SELECT 1 FROM _raypak_new r WHERE r.pn = upper(trim(c.part_number)))";

  const lostPrice = await count(client,
    `SELECT count(*) n FROM catalog_parts c WHERE NOT c.from_price_list AND NOT ${inList} AND COALESCE(c.list_price, 0) <> 0`);
  const updated = (await client.query(
    `UPDATE catalog_parts c SET list_price = r.list_price,
            description = COALESCE(NULLIF(r.description, ''), c.description),
            price_source = 'raypak price list', price_list_id = $1
       FROM _raypak_new r WHERE upper(trim(c.part_number)) = r.pn`, [id])).rowCount;
  // Not in the list: price 0, "Obsolete" appended to the notes (never duplicated)
  const cleared = (await client.query(
    `UPDATE catalog_parts c SET list_price = 0, obsolete = true, price_source = 'not in raypak price list', price_list_id = $1,
            notes = ${ADD_OBSOLETE}
      WHERE NOT c.from_price_list AND NOT ${inList}`, [id])).rowCount;
  // Back in the list: drop the "Obsolete" marker this rule added earlier
  await client.query(
    `UPDATE catalog_parts c SET obsolete = false, notes = ${DROP_OBSOLETE}
      WHERE ${inList} AND c.notes ~ '(^|; )Obsolete$'`);
  // Annual kit
  const annualUpdated = (await client.query(
    `UPDATE annual_parts a SET price = r.list_price, description = COALESCE(NULLIF(r.description, ''), a.description),
            obsolete = (a.obsolete AND a.notes !~ '(^|; )Obsolete$'), notes = ${DROP_OBSOLETE.replace(/c\.notes/g, "a.notes")}
       FROM _raypak_new r WHERE upper(trim(a.pn)) = r.pn`)).rowCount;
  const annualObsolete = (await client.query(
    `UPDATE annual_parts a SET price = 0, obsolete = true, notes = ${ADD_OBSOLETE.replace(/c\.notes/g, "a.notes")}
      WHERE trim(a.pn) <> '' AND NOT EXISTS (SELECT 1 FROM _raypak_new r WHERE r.pn = upper(trim(a.pn)))`)).rowCount;
  // parts a previous Raypak list added that are no longer listed
  const removed = (await client.query(`DELETE FROM catalog_parts c WHERE c.from_price_list AND NOT ${inList}`)).rowCount;
  const added = (await client.query(
    `INSERT INTO catalog_parts (series, part_number, description, list_price, vendor, manufacturer,
                                price_source, price_list_id, from_price_list)
     SELECT $2, r.pn, r.description, r.list_price, 'Raypak', 'Raypak', 'raypak price list', $1, true
       FROM _raypak_new r
      WHERE NOT EXISTS (SELECT 1 FROM catalog_parts c WHERE upper(trim(c.part_number)) = r.pn)`, [id, RAYPAK_ADDED_SERIES])).rowCount;
  const listParts = await count(client, "SELECT count(*) n FROM _raypak_new");
  await client.query("DROP TABLE IF EXISTS _raypak_new");
  return { price_list_id: id, list_parts: listParts, rows_updated: updated, rows_cleared: cleared, priced_rows_cleared: lostPrice, parts_added: added, parts_removed: removed,
           annual_updated: annualUpdated, annual_obsolete: annualObsolete };
}

// Re-apply the newest Raypak list (after a re-seed / IPL import / list delete).
// With no Raypak list left and clearIfNone, the prices a Raypak list had set are removed too.
export async function applyLatestRaypakList(client, { clearIfNone = false, deletedId = null } = {}) {
  const latest = await latestRaypakListId(client);
  if (latest) return applyRaypakList(client, latest);
  if (!clearIfNone) return null;
  const removed = (await client.query("DELETE FROM catalog_parts WHERE from_price_list")).rowCount;
  const cleared = (await client.query(
    `UPDATE catalog_parts SET list_price = NULL, price_source = 'raypak price list deleted', price_list_id = NULL
      WHERE price_list_id IS NOT NULL OR price_source IN ('raypak price list', 'not in raypak price list')`)).rowCount;
  return { price_list_id: null, deleted_list_id: deletedId, rows_cleared: cleared, parts_removed: removed };
}
