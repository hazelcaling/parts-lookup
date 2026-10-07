import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// Render internal URLs don't need SSL; external URLs do. PGSSL=disable for local dev.
const ssl =
  process.env.PGSSL === "disable" || /\.internal|localhost|127\.0\.0\.1|@dpg-[^.]+\//.test(url)
    ? false
    : { rejectUnauthorized: false };

export const pool = new pg.Pool({ connectionString: url, ssl });
