const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'main.db');
const db = new sqlite3.Database(dbPath);

const NEW_PIN = '1234';

db.serialize(() => {
    db.run("UPDATE users SET pin = ? WHERE username = 'Admin'", [NEW_PIN], function (err) {
        if (err) {
            console.error("Error updating PIN:", err);
        } else {
            console.log(`PIN updated for Admin. Rows affected: ${this.changes}`);
        }
        db.close();
    });
});
