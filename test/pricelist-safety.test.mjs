// Price list upload / delete must never delete Annual Kit or IPL/catalog rows: only prices change.
// Run: npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { applyRaypakList, applyLatestRaypakList } from "../server/raypak.js";

async function setup() {
  const db = new PGlite();
  await db.exec(`
    CREATE TABLE price_lists (id serial PRIMARY KEY, is_raypak bool NOT NULL DEFAULT false, uploaded_at timestamptz DEFAULT now());
    CREATE TABLE price_list_items (id serial, price_list_id int REFERENCES price_lists(id) ON DELETE CASCADE,
      part_number text, description text, list_price numeric);
    CREATE TABLE catalog_parts (id serial, series text DEFAULT '', model text DEFAULT '', part_number text, description text,
      list_price numeric, vendor text, manufacturer text, price_source text, price_list_id int REFERENCES price_lists(id) ON DELETE SET NULL,
      from_price_list bool NOT NULL DEFAULT false, obsolete bool NOT NULL DEFAULT false, notes text DEFAULT '',
      source_url text, call_out text);
    CREATE TABLE annual_parts (id serial, series text, model text, pn text, description text, price float8,
      notes text NOT NULL DEFAULT '', obsolete bool NOT NULL DEFAULT false);
    INSERT INTO catalog_parts (series, model, part_number, description, list_price, notes, source_url, call_out) VALUES
      ('XTHERM','1005','A1','old a1',5,'','http://ipl/1','1A'),
      ('XTHERM','2005','A1','old a1',6,'','http://ipl/1','1A'),
      ('XTHERM','1005','C3','c3',7,'see manual','http://ipl/2','2B');
    INSERT INTO annual_parts (series, model, pn, description, price) VALUES ('XVERS','1007','A1','a1',1), ('XVERS','1007','Z9','z9',3);`);
  const client = { query: (q, p) => db.query(q, p).then((r) => ({ rows: r.rows, rowCount: r.affectedRows ?? r.rows.length })) };
  const tx = async (fn) => { await db.query("BEGIN"); try { const r = await fn(); await db.query("COMMIT"); return r; } catch (e) { await db.query("ROLLBACK"); throw e; } };
  const upload = async (items) => tx(async () => {
    const id = (await db.query("INSERT INTO price_lists (is_raypak) VALUES (true) RETURNING id")).rows[0].id;
    for (const [pn, d, p] of items)
      await db.query("INSERT INTO price_list_items (price_list_id, part_number, description, list_price) VALUES ($1,$2,$3,$4)", [id, pn, d, p]);
    await applyRaypakList(client, id);
    return id;
  });
  // same as DELETE /api/pricelists/:id
  const del = async (id) => tx(async () => {
    await db.query("DELETE FROM price_lists WHERE id=$1", [id]);
    await applyLatestRaypakList(client, { clearIfNone: true, deletedId: id });
  });
  const counts = async () => (await db.query(
    `SELECT (SELECT count(*) FROM annual_parts)::int a, (SELECT count(*) FROM catalog_parts WHERE NOT from_price_list)::int ipl,
            (SELECT count(*) FROM catalog_parts WHERE source_url IS NOT NULL)::int links`)).rows[0];
  const cat = async () => (await db.query("SELECT id, part_number, model, list_price::float8 p, notes, obsolete, call_out, source_url FROM catalog_parts ORDER BY id")).rows;
  const ann = async () => (await db.query("SELECT pn, price, notes, obsolete FROM annual_parts ORDER BY id")).rows;
  return { db, upload, del, counts, cat, ann };
}

test("upload, re-upload and delete of Raypak price lists keep all annual kit and IPL rows", async () => {
  const t = await setup();
  const before = await t.counts();

  const l1 = await t.upload([["A1", "New A1", 10], ["B2", "B2 only in list", 20]]);
  assert.deepEqual(await t.counts(), before);
  let c = await t.cat();
  assert.deepEqual(c.filter((r) => r.part_number === "A1").map((r) => r.p), [10, 10]); // same price for every model
  const c3 = c.find((r) => r.part_number === "C3");
  assert.equal(c3.p, 0); assert.equal(c3.obsolete, true); assert.equal(c3.notes, "see manual"); // notes untouched
  assert.equal(c3.call_out, "2B"); assert.equal(c3.source_url, "http://ipl/2");
  let a = await t.ann();
  assert.equal(a[0].price, 10); assert.equal(a[1].price, 0); assert.equal(a[1].obsolete, true); assert.equal(a[1].notes, "");

  // second list without B2: B2 (added by list 1) is kept with price 0, notes not duplicated
  const l2 = await t.upload([["A1", "New A1", 12]]);
  assert.deepEqual(await t.counts(), before);
  c = await t.cat();
  assert.equal(c.length, 4);
  assert.equal(c.find((r) => r.part_number === "B2").p, 0);
  assert.equal(c.find((r) => r.part_number === "C3").notes, "see manual");

  await t.del(l2); // falls back to list 1
  assert.deepEqual(await t.counts(), before);
  assert.equal((await t.cat()).length, 4);
  assert.equal((await t.cat()).find((r) => r.part_number === "A1").p, 10);

  await t.del(l1); // no Raypak list left: everything 0, nothing deleted
  assert.deepEqual(await t.counts(), before);
  c = await t.cat();
  assert.equal(c.length, 4);
  assert.ok(c.every((r) => r.p === 0));
  assert.ok((await t.ann()).every((r) => r.price === 0));
});

test("user-edited notes survive price list uploads; obsolete flag still set and cleared", async () => {
  const t = await setup();
  await t.upload([["A1", "New A1", 10]]);
  const c3 = (await t.cat()).find((r) => r.part_number === "C3");
  // same UPDATE as PATCH /api/master/catalog/:id/notes
  await t.db.query("UPDATE catalog_parts SET notes=$1 WHERE id=$2", ["Use C4 instead - not obsolete!", c3.id]);
  await t.upload([["A1", "New A1", 11]]);
  let r = (await t.cat()).find((x) => x.id === c3.id);
  assert.equal(r.notes, "Use C4 instead - not obsolete!"); assert.equal(r.obsolete, true); assert.equal(r.p, 0);
  await t.upload([["A1", "New A1", 11], ["C3", "C3 back", 9]]); // back in the list
  r = (await t.cat()).find((x) => x.id === c3.id);
  assert.equal(r.notes, "Use C4 instead - not obsolete!"); assert.equal(r.obsolete, false); assert.equal(r.p, 9);
  assert.equal(r.call_out, "2B"); assert.equal(r.source_url, "http://ipl/2");
});

test("price list code never deletes annual_parts or catalog_parts rows", () => {
  for (const f of ["server/raypak.js", "server/routes/api.js"]) {
    const src = fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    assert.doesNotMatch(src, /DELETE\s+FROM\s+(catalog_parts|annual_parts)|TRUNCATE[^;]*(catalog_parts|annual_parts)/i, f);
  }
});
