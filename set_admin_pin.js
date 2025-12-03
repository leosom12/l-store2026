const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'main.db');
const db = new sqlite3.Database(dbPath);

const adminEmail = 'djleocv.hotmail.com@gmail.com';
const newPin = '1234';

db.serialize(() => {
    db.run("UPDATE users SET pin = ? WHERE email = ?", [newPin, adminEmail], function (err) {
        if (err) {
            console.error("Error updating PIN:", err.message);
        } else {
            console.log(`✅ PIN updated for ${adminEmail}. Rows affected: ${this.changes}`);
        }
        db.close();
    });
});
