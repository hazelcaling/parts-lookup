import express from "express";

// Small validation helpers -------------------------------------------------
class BadRequest extends Error {}
const str = (v, max = 500, { required = false, field = "value" } = {}) => {
  if (v === undefined || v === null) v = "";
  if (typeof v === "number") v = String(v);
  if (typeof v !== "string") throw new BadRequest(`${field} must be text`);
  v = v.trim();
  if (required && !v) throw new BadRequest(`${field} is required`);
  if (v.length > max) throw new BadRequest(`${field} is too long (max ${max})`);
  return v;
};
const optNum = (v, field) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n)) throw new BadRequest(`${field} must be a number`);
  return n;
};
const bool = (v) => {
  if (typeof v === "boolean") return v;
  return /^(y|yes|true|1|x|obsolete)$/i.test(String(v ?? "").trim());
};
const id = (v, field = "id") => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new BadRequest(`invalid ${field}`);
  return n;
};
const optDate = (v, field) => {
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v)) || isNaN(Date.parse(v))) throw new BadRequest(`${field} must be YYYY-MM-DD`);
  return v;
};
const like = (q) => `%${q.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
const limitOf = (v, def = 10, max = 200) => Math.min(Math.max(parseInt(v, 10) || def, 1), max);

const COMPANY_TYPES = ["contractor", "wholesaler", "end user", "vendor"];
function companyInput(b) {
  const type = str(b.type, 20, { field: "type" }) || "contractor";
  if (!COMPANY_TYPES.includes(type)) throw new BadRequest(`type must be one of: ${COMPANY_TYPES.join(", ")}`);
  const email = str(b.email, 200, { field: "email" });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequest("email is invalid");
  return {
    name: str(b.name, 200, { required: true, field: "name" }), type,
    address1: str(b.address1, 200, { field: "address1" }), address2: str(b.address2, 200, { field: "address2" }),
    city: str(b.city, 100, { field: "city" }), state: str(b.state, 50, { field: "state" }),
    zipcode: str(b.zipcode, 20, { field: "zipcode" }), phone: str(b.phone, 50, { field: "phone" }),
    email, notes: str(b.notes, 4000, { field: "notes" }),
  };
}
function contactInput(b) {
  const email = str(b.email, 200, { field: "email" });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequest("email is invalid");
  return {
    name: str(b.name, 200, { required: true, field: "name" }), title: str(b.title, 200, { field: "title" }),
    email, phone: str(b.phone, 50, { field: "phone" }),
  };
}

// Price list item fields that can be mapped from a spreadsheet column
export const ITEM_FIELDS = ["part_number", "description", "list_price", "vendor", "manufacturer", "category",
  "weight_lbs", "freight_usd", "notes", "obsolete", "replacement_pn", "series", "model"];

export function apiRouter(pool, { onCatalogChanged } = {}) {
  const r = express.Router();
  const wrap = (fn) => (req, res) =>
    fn(req, res).catch((e) => {
      if (e instanceof BadRequest) return res.status(400).json({ error: e.message });
      if (e.code === "23505") return res.status(409).json({ error: "Already exists", detail: e.detail });
      if (e.code === "23503") return res.status(400).json({ error: "Referenced record not found" });
      console.error(e);
      res.status(500).json({ error: "server error" });
    });

  // ---------- Companies ----------
  r.get("/companies", wrap(async (req, res) => {
    const q = str(req.query.q, 200);
    const { rows } = await pool.query(
      `SELECT * FROM companies WHERE $1 = '' OR name ILIKE $2
       ORDER BY (lower(name) LIKE lower($1) || '%') DESC, name LIMIT $3`,
      [q, like(q), limitOf(req.query.limit, 10)]);
    res.json(rows);
  }));
  r.get("/companies/:id", wrap(async (req, res) => {
    const { rows } = await pool.query("SELECT * FROM companies WHERE id=$1", [id(req.params.id)]);
    rows[0] ? res.json(rows[0]) : res.status(404).json({ error: "not found" });
  }));
  r.post("/companies", wrap(async (req, res) => {
    const c = companyInput(req.body || {});
    const { rows } = await pool.query(
      `INSERT INTO companies (name,type,address1,address2,city,state,zipcode,phone,email,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [c.name, c.type, c.address1, c.address2, c.city, c.state, c.zipcode, c.phone, c.email, c.notes]);
    res.status(201).json(rows[0]);
  }));
  r.put("/companies/:id", wrap(async (req, res) => {
    const c = companyInput(req.body || {});
    const { rows } = await pool.query(
      `UPDATE companies SET name=$1,type=$2,address1=$3,address2=$4,city=$5,state=$6,zipcode=$7,phone=$8,email=$9,notes=$10
       WHERE id=$11 RETURNING *`,
      [c.name, c.type, c.address1, c.address2, c.city, c.state, c.zipcode, c.phone, c.email, c.notes, id(req.params.id)]);
    rows[0] ? res.json(rows[0]) : res.status(404).json({ error: "not found" });
  }));
  r.delete("/companies/:id", wrap(async (req, res) => {
    const { rowCount } = await pool.query("DELETE FROM companies WHERE id=$1", [id(req.params.id)]);
    rowCount ? res.json({ ok: true }) : res.status(404).json({ error: "not found" });
  }));

  // ---------- Contacts ----------
  r.get("/companies/:id/contacts", wrap(async (req, res) => {
    const q = str(req.query.q, 200);
    const { rows } = await pool.query(
      `SELECT * FROM contacts WHERE company_id=$1 AND ($2 = '' OR name ILIKE $3) ORDER BY name LIMIT $4`,
      [id(req.params.id), q, like(q), limitOf(req.query.limit, 20)]);
    res.json(rows);
  }));
  r.post("/companies/:id/contacts", wrap(async (req, res) => {
    const c = contactInput(req.body || {});
    const { rows } = await pool.query(
      `INSERT INTO contacts (company_id,name,title,email,phone) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id(req.params.id), c.name, c.title, c.email, c.phone]);
    res.status(201).json(rows[0]);
  }));
  r.put("/contacts/:id", wrap(async (req, res) => {
    const c = contactInput(req.body || {});
    const { rows } = await pool.query(
      `UPDATE contacts SET name=$1,title=$2,email=$3,phone=$4 WHERE id=$5 RETURNING *`,
      [c.name, c.title, c.email, c.phone, id(req.params.id)]);
    rows[0] ? res.json(rows[0]) : res.status(404).json({ error: "not found" });
  }));
  r.delete("/contacts/:id", wrap(async (req, res) => {
    const { rowCount } = await pool.query("DELETE FROM contacts WHERE id=$1", [id(req.params.id)]);
    rowCount ? res.json({ ok: true }) : res.status(404).json({ error: "not found" });
  }));

  // ---------- Jobs (simple saved names) ----------
  r.get("/jobs", wrap(async (req, res) => {
    const q = str(req.query.q, 200);
    const { rows } = await pool.query(
      `SELECT id, name, company_id FROM jobs WHERE $1 = '' OR name ILIKE $2 ORDER BY name LIMIT $3`,
      [q, like(q), limitOf(req.query.limit, 10)]);
    res.json(rows);
  }));
  r.post("/jobs", wrap(async (req, res) => {
    const name = str(req.body?.name, 200, { required: true, field: "name" });
    const companyId = req.body?.company_id ? id(req.body.company_id, "company_id") : null;
    const { rows } = await pool.query(
      `INSERT INTO jobs (name, company_id) VALUES ($1,$2) RETURNING id, name, company_id`, [name, companyId]);
    res.status(201).json(rows[0]);
  }));
  r.delete("/jobs/:id", wrap(async (req, res) => {
    const { rowCount } = await pool.query("DELETE FROM jobs WHERE id=$1", [id(req.params.id)]);
    rowCount ? res.json({ ok: true }) : res.status(404).json({ error: "not found" });
  }));

  // ---------- Model autosuggest ----------
  r.get("/models", wrap(async (req, res) => {
    const q = str(req.query.q, 100).toUpperCase();
    if (!q) return res.json([]);
    const { rows } = await pool.query(
      `SELECT model FROM (
         SELECT DISTINCT model FROM annual_parts WHERE upper(model) LIKE $1
         UNION SELECT DISTINCT model FROM catalog_parts WHERE upper(model) LIKE $1 AND model <> ''
       ) m ORDER BY (upper(model) LIKE $2) DESC, length(model), model LIMIT $3`,
      [like(q), q.replace(/[\\%_]/g, (c) => "\\" + c) + "%", limitOf(req.query.limit, 10, 50)]);
    res.json(rows.map((x) => x.model));
  }));

  // ---------- Price lists ----------
  r.get("/pricelists", wrap(async (req, res) => {
    const { rows } = await pool.query("SELECT * FROM price_lists ORDER BY uploaded_at DESC, id DESC");
    res.json(rows);
  }));
  r.get("/pricelists/:id/items", wrap(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, ${ITEM_FIELDS.join(", ")} FROM price_list_items WHERE price_list_id=$1 ORDER BY id LIMIT $2`,
      [id(req.params.id), limitOf(req.query.limit, 100, 1000)]);
    res.json(rows);
  }));
  r.post("/pricelists", wrap(async (req, res) => {
    const b = req.body || {};
    const name = str(b.name, 200, { required: true, field: "name" });
    const vendor = str(b.vendor, 200, { field: "vendor" });
    const manufacturer = str(b.manufacturer, 200, { field: "manufacturer" });
    if (!vendor && !manufacturer) throw new BadRequest("vendor or manufacturer is required");
    const effective = optDate(b.effective_date, "effective_date");
    const fileName = str(b.file_name, 300, { field: "file_name" });
    const updateCatalog = b.update_catalog === true;
    if (!Array.isArray(b.items) || b.items.length === 0) throw new BadRequest("items must be a non-empty array");
    if (b.items.length > 200000) throw new BadRequest("too many rows (max 200000)");

    const items = [];
    b.items.forEach((it, i) => {
      const pn = str(it.part_number, 100, { field: `row ${i + 1} part_number` }).toUpperCase();
      if (!pn) return; // skip blank rows
      items.push([
        pn, str(it.description, 1000, { field: `row ${i + 1} description` }),
        optNum(it.list_price, `row ${i + 1} list_price`),
        str(it.vendor, 200) || vendor, str(it.manufacturer, 200) || manufacturer,
        str(it.category, 200), optNum(it.weight_lbs, `row ${i + 1} weight_lbs`),
        optNum(it.freight_usd, `row ${i + 1} freight_usd`), str(it.notes, 4000), bool(it.obsolete),
        str(it.replacement_pn, 100).toUpperCase(), str(it.series, 300), str(it.model, 300).toUpperCase(),
        JSON.stringify(it.raw && typeof it.raw === "object" ? it.raw : {}),
      ]);
    });
    if (!items.length) throw new BadRequest("no rows with a part number");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const pl = (await client.query(
        `INSERT INTO price_lists (name,vendor,manufacturer,effective_date,file_name,row_count)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [name, vendor, manufacturer, effective, fileName, items.length])).rows[0];
      const cols = ["price_list_id", ...ITEM_FIELDS, "raw"];
      for (let i = 0; i < items.length; i += 500) {
        const chunk = items.slice(i, i + 500);
        const vals = [];
        const ph = chunk.map((row, j) => {
          const full = [pl.id, ...row];
          full.forEach((v) => vals.push(v));
          return "(" + full.map((_, k) => `$${j * full.length + k + 1}`).join(",") + ")";
        });
        await client.query(`INSERT INTO price_list_items (${cols.join(",")}) VALUES ${ph.join(",")}`, vals);
      }
      let catalogUpdated = 0;
      if (updateCatalog) {
        // Update existing catalog rows with matching part number (does not add new catalog rows)
        const u = await client.query(
          `UPDATE catalog_parts c SET
             list_price = COALESCE(i.list_price::float8, c.list_price),
             vendor = NULLIF(i.vendor,''), manufacturer = NULLIF(i.manufacturer,''),
             category = COALESCE(NULLIF(i.category,''), c.category),
             weight_lbs = COALESCE(i.weight_lbs, c.weight_lbs), freight_usd = COALESCE(i.freight_usd, c.freight_usd),
             obsolete = i.obsolete, replacement_pn = COALESCE(NULLIF(i.replacement_pn,''), c.replacement_pn)
           FROM (SELECT DISTINCT ON (part_number) * FROM price_list_items WHERE price_list_id=$1 ORDER BY part_number, id DESC) i
           WHERE upper(c.part_number) = i.part_number`, [pl.id]);
        catalogUpdated = u.rowCount;
      }
      await client.query("COMMIT");
      if (catalogUpdated) onCatalogChanged?.();
      res.status(201).json({ ...pl, catalog_updated: catalogUpdated });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }));
  r.delete("/pricelists/:id", wrap(async (req, res) => {
    const { rowCount } = await pool.query("DELETE FROM price_lists WHERE id=$1", [id(req.params.id)]);
    rowCount ? res.json({ ok: true }) : res.status(404).json({ error: "not found" });
  }));

  // ---------- Master price list search ----------
  r.get("/search", wrap(async (req, res) => {
    const q = str(req.query.q, 200);
    const vendor = str(req.query.vendor, 200);
    const source = str(req.query.source, 20); // '', 'catalog', 'pricelist'
    if (!q && !vendor) return res.json([]);
    const limit = limitOf(req.query.limit, 100, 500);
    const { rows } = await pool.query(
      `SELECT * FROM (
         SELECT 'Catalog' AS source, NULL::int AS price_list_id, NULL::text AS price_list_name, NULL::date AS effective_date,
                part_number, description, list_price::numeric AS list_price, COALESCE(vendor,'') AS vendor,
                COALESCE(manufacturer,'') AS manufacturer, series, model, obsolete, COALESCE(replacement_pn,'') AS replacement_pn
           FROM catalog_parts
          WHERE $5 IN ('', 'catalog')
            AND ($1 = '' OR part_number ILIKE $2 OR description ILIKE $2)
            AND ($3 = '' OR vendor ILIKE $4 OR manufacturer ILIKE $4)
         UNION ALL
         SELECT 'Price list', p.id, p.name, p.effective_date,
                i.part_number, i.description, i.list_price, i.vendor, i.manufacturer, i.series, i.model, i.obsolete, i.replacement_pn
           FROM price_list_items i JOIN price_lists p ON p.id = i.price_list_id
          WHERE $5 IN ('', 'pricelist')
            AND ($1 = '' OR i.part_number ILIKE $2 OR i.description ILIKE $2)
            AND ($3 = '' OR i.vendor ILIKE $4 OR i.manufacturer ILIKE $4 OR p.vendor ILIKE $4 OR p.manufacturer ILIKE $4)
       ) x ORDER BY (upper(part_number) = upper($1)) DESC, part_number, effective_date DESC NULLS LAST LIMIT $6`,
      [q, like(q), vendor, like(vendor), source, limit]);
    res.json(rows);
  }));
  r.get("/vendors", wrap(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT v FROM (SELECT vendor v FROM price_lists UNION SELECT manufacturer FROM price_lists
                      UNION SELECT vendor FROM catalog_parts UNION SELECT manufacturer FROM catalog_parts) t
        WHERE v IS NOT NULL AND v <> '' ORDER BY v`);
    res.json(rows.map((x) => x.v));
  }));

  return r;
}
