const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'main.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Checking Admin user (ID 1) in main.db...");
    db.get("SELECT id, username, email, isAdmin, subscriptionStatus FROM users WHERE id = 1", (err, row) => {
        if (err) {
            console.error("Error:", err);
        } else {
            console.log("Admin User:", JSON.stringify(row, null, 2));
        }
        db.close();
    });
});
