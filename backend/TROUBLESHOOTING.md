# SQLite Troubleshooting Guide

## Common SQLite Errors and Solutions

### Error: "SQLITE_ERROR: no such table"
**Cause:** Database tables haven't been created yet.

**Solution:**
1. Delete the `cashback.db` file in the backend directory
2. Restart the server - it will recreate the database with all tables

### Error: "SQLITE_CANTOPEN: unable to open database file"
**Cause:** Permission issues or incorrect path.

**Solutions:**
1. Check that the backend directory has write permissions
2. The database file is created in: `backend/cashback.db`
3. Make sure you're running the server from the backend directory
4. On Windows, run PowerShell/CMD as Administrator if needed

### Error: "SQLITE_MISUSE"
**Cause:** Database connection issues or trying to use closed database.

**Solution:**
1. Restart the server
2. Make sure only one instance of the server is running
3. Check that the database file isn't locked by another process

### Error: "SQLITE_CONSTRAINT: UNIQUE constraint failed"
**Cause:** Trying to insert duplicate data (e.g., email already exists).

**Solution:**
- This is expected behavior for unique constraints
- Check your data before inserting

### Error: "SQLITE_CONSTRAINT: FOREIGN KEY constraint failed"
**Cause:** Trying to reference a non-existent merchant or user.

**Solution:**
- Make sure the referenced ID exists before creating the relationship
- Check that foreign keys are enabled (they should be automatically)

## Database Location

The database file is located at:
- **Development:** `backend/cashback.db`
- **Production:** Same location relative to the compiled code

## Resetting the Database

If you need to completely reset the database:

1. Stop the server
2. Delete `backend/cashback.db`
3. Restart the server
4. The database will be recreated with:
   - All tables
   - Default admin user (admin@cashback.com / admin123)
   - Sample merchants and offers

## Checking Database Status

You can check if the database is working by:
1. Looking for "Database connected successfully" in server logs
2. Looking for "Database initialized successfully" in server logs
3. Checking that `cashback.db` exists in the backend directory

## Manual Database Inspection

To manually inspect the database, you can use:
- **SQLite Browser:** Download DB Browser for SQLite
- **Command line:** `sqlite3 backend/cashback.db`
- **VS Code Extension:** SQLite Viewer

## Type Changes

**Important:** SQLite doesn't support BOOLEAN type natively. We use:
- `INTEGER` type for boolean fields
- `0` = false
- `1` = true

This has been fixed in the code, but if you have an old database, you may need to recreate it.
