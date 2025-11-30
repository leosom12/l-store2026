const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'main.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
            console.error("Error listing tables:", err);
        } else {
            console.log("Tables:", tables);
        }
    });

    db.all("SELECT * FROM users LIMIT 1", (err, rows) => {
        if (err) {
            console.error("Error querying users:", err);
        } else {
            console.log("Users sample:", rows);
        }
        db.close();
    });
});
