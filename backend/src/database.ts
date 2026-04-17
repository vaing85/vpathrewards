// Database initialization

async function initializeDatabase() {
    const db = openDatabase();
    try {
        db.exec("PRAGMA foreign_keys = ON;");
    } catch (error) {
        console.error('Error setting PRAGMA:', error);
    }
    // Closing brace added here to properly enclose the try block
    }
    
    // Create tables
    db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);");
    db.exec("CREATE TABLE items (id INTEGER PRIMARY KEY, user_id INTEGER, FOREIGN KEY (user_id) REFERENCES users(id));");
}

initializeDatabase();