import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma v7 config.
 *
 * Invariant: connection URL lives here (not in schema.prisma).
 * We default to the local sqlite file used in this repo if DATABASE_URL is not set.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"] ?? "file:./prisma/dev.db",
  },
});


