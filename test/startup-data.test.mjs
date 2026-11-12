// The data sent when the app opens must stay small (Annual Kit only, no catalog) and be cached safely.
// Run: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { createStartupData } from "../server/startupData.js";
import { statusText } from "../src/utils/statusText.js";

async function setup() {
  const db = new PGlite();
  await db.exec(`
    CREATE TABLE annual_parts (id serial, series text, model text, pn text, description text, price float8,
      annual bool DEFAULT false, default_qty int DEFAULT 1, notes text NOT NULL DEFAULT '', obsolete bool NOT NULL DEFAULT false);
    CREATE TABLE catalog_parts (id serial, part_number text);
    INSERT INTO annual_parts (series, model, pn, description, price, obsolete) VALUES
      ('XVERS','1007','A1','a1',1,false), ('XVERS','1007','Z9','z9',NULL,true), ('XTHERM','1005','B2','b2',2,false);
    INSERT INTO catalog_parts (part_number) SELECT 'P' || g FROM generate_series(1, 50) g;`);
  let queries = 0;
  const pool = { query: async (q, p) => { queries++; return db.query(q, p); } };
  return { db, pool, count: () => queries };
}

test("startup data has the Annual Kit parts only (no catalog)", async () => {
  const { pool } = await setup();
  const data = JSON.parse((await createStartupData(pool).load()).json);
  assert.deepEqual(Object.keys(data), ["partsData"]);
  assert.deepEqual(Object.keys(data.partsData).sort(), ["XTHERM", "XVERS"]);
  const z9 = data.partsData.XVERS["1007"].find((p) => p.pn === "Z9");
  assert.equal(z9.price, null); // the browser turns null back into NaN (obsolete, no price)
  assert.equal(z9.obsolete, true);
});

test("startup data is cached, shared by concurrent requests, and rebuilt after clear()", async () => {
  const { db, pool, count } = await setup();
  const sd = createStartupData(pool);
  const [a, b] = await Promise.all([sd.load(), sd.load()]);
  assert.equal(a, b);
  await sd.load();
  assert.equal(count(), 1);
  await db.query("UPDATE annual_parts SET notes='edited' WHERE pn='A1'");
  sd.clear();
  const c = JSON.parse((await sd.load()).json);
  assert.equal(c.partsData.XVERS["1007"].find((p) => p.pn === "A1").notes, "edited");
  assert.equal(count(), 2);
});

test("a load that was in flight when data changed is not kept in the cache", async () => {
  const { db, pool } = await setup();
  const sd = createStartupData(pool);
  const stale = sd.load(); // started before the change
  await db.query("UPDATE annual_parts SET notes='new' WHERE pn='A1'");
  sd.clear();
  await stale;
  const fresh = JSON.parse((await sd.load()).json);
  assert.equal(fresh.partsData.XVERS["1007"].find((p) => p.pn === "A1").notes, "new");
});

test("Master Price List status messages", () => {
  assert.equal(statusText("initial"), "Loading Master Price List…");
  assert.equal(statusText("searching", { search: " gasket " }), "Searching for “gasket”…");
  assert.equal(statusText("searching", { search: "" }), "Loading all parts…");
  assert.equal(statusText("clearing"), "Clearing search and filters…");
  assert.equal(statusText("filtering"), "Applying filter…");
  assert.equal(statusText("page", { page: 3 }), "Loading page 3…");
});
