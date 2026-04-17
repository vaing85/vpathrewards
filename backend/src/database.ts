async function initDatabase() {
    try {
        // Users table
        await connection.execute(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255), ...`);
        // Other table creation or initialization logic here
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}