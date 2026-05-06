import { config } from "dotenv";
config({ path: ".env.local" });
import { defineConfig } from "drizzle-kit";

/**
 * IMPORTANT — Shared DB server safety
 *
 * The Azure Postgres server (`spark-postgres-server-dev`) is shared with
 * other teams. We MUST stay inside our `hackthon-hub` database and never
 * touch other databases on the same server.
 *
 * - The `DATABASE_URL` connection string targets `hackthon-hub` directly,
 *   so Drizzle physically cannot reach other databases on the server.
 * - `schemaFilter: ["public"]` confines schema introspection/diff to the
 *   `public` schema only — pre-existing schemas on the DB are untouched.
 * - `migrations.schema: "public"` puts the `__drizzle_migrations` tracking
 *   table inside `public.__drizzle_migrations` instead of letting Drizzle
 *   auto-create a separate `drizzle` schema (its default behaviour).
 *
 * Net effect: every Drizzle write lands in `hackthon-hub.public.*` — nothing
 * else on the server is touched.
 */

export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schemaFilter: ["public"],
  migrations: {
    table: "__drizzle_migrations",
    schema: "public",
  },
});
