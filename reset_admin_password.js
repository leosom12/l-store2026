const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'main.db');
const db = new sqlite3.Database(dbPath);

const newPassword = 'admin123';
const hash = bcrypt.hashSync(newPassword, 10);

db.serialize(() => {
    console.log(`Resetting password for Admin (ID 1) to '${newPassword}'...`);
    db.run("UPDATE users SET password = ? WHERE id = 1", [hash], function (err) {
        if (err) {
            console.error("Error updating password:", err);
        } else {
            console.log(`Password updated successfully. Changes: ${this.changes}`);
        }
        db.close();
    });
});
