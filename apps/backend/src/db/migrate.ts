import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { env } from "../config/env";

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "migrations");

const client = new Client({ connectionString: env.DATABASE_URL });

await client.connect();
try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_local_migrations" (
      "name" text PRIMARY KEY,
      "applied_at" timestamptz DEFAULT now() NOT NULL
    )
  `);

  const migrationNames = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql")).sort();
  for (const migrationName of migrationNames) {
    const existing = await client.query(`SELECT 1 FROM "_local_migrations" WHERE "name" = $1`, [migrationName]);
    if ((existing.rowCount ?? 0) > 0) {
      console.log(`${migrationName} already applied`);
      continue;
    }

    const sql = await readFile(join(migrationsDir, migrationName), "utf8");
    await client.query("BEGIN");
    await client.query(sql);
    await client.query(`INSERT INTO "_local_migrations" ("name") VALUES ($1)`, [migrationName]);
    await client.query("COMMIT");
    console.log(`Applied ${migrationName}`);
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
