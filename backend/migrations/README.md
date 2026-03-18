# Database migrations (Phase 4)

Run with: `node run-migrations.js` from the backend directory.

Migrations are SQL files named `NNN_description.sql`. They run in order; applied migrations are recorded in `schema_migrations` table.

Add new migrations for schema changes instead of editing `database.ts` init (for production safety).
