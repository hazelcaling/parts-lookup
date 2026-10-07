# Parts Lookup – Postgres + password (branch `db-migration`)

## Local dev
1. Install Postgres locally, create a DB, `cp .env.example .env` and fill it in.
2. Put the data files in place (not in git): `annualparts.xlsx`, `catalog_parts.xlsx`,
   `src/data/partsData.js`, `src/data/partsCatalog.json`.
3. `npm install`
4. `npm run seed:dev` (loads from the JSON files; `npm run seed:dev -- --from-xlsx` loads from Excel)
5. `npm run dev` -> open http://localhost:5173 (Vite proxies `/api` to Express on :3000).

## Render TEST service (try before production)
Create a NEW Web Service (do not modify the live static site `parts-lookup`):
- Repo: hazelcaling/parts-lookup, **Branch: `db-migration`**, Runtime: Node, name e.g. `parts-lookup-test`, region Oregon
- Build: `npm ci --include=dev && npm run build`
- Start: `npm start`
- Env vars: `DATABASE_URL` (Internal Database URL of parts-lookup-db), `APP_PASSWORD`,
  `SESSION_SECRET` (long random string), `NODE_ENV=production`
- Seed once with the External URL: `DATABASE_URL="<external url>" npm run seed` (SSL auto-enabled).
- Server caches data in memory; restart the service after re-seeding.

## Switching production (only after testing)
Merge `db-migration` into `main`, use a web service on `main` (a static site can't check
passwords or reach the DB), then suspend/delete the old static site.

## Purge data from git history (repo is public)
A removal commit does NOT remove data from history. After merging:
    pip install git-filter-repo
    git clone --mirror https://github.com/hazelcaling/parts-lookup.git && cd parts-lookup.git
    git filter-repo --invert-paths --path annualparts.xlsx --path catalog_parts.xlsx \
      --path src/data/partsCatalog.json --path src/data/partsData.js --path venv
    git push --force --mirror
Rewrites all history (re-clone everywhere). Simpler alternative: make the repo private.
Forks/caches may keep old copies; treat the old data as already exposed.
