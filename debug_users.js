const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'main.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("SELECT id, username, email, pin FROM users WHERE pin = '1234'", (err, rows) => {
        if (err) {
            console.error('Error getting users:', err);
        } else {
            rows.forEach(u => console.log(`ID: ${u.id}, User: ${u.username}, PIN: ${u.pin}`));
        }
        db.close();
    });
});
