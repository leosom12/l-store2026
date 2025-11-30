const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./user_1.db');

db.serialize(() => {
    db.all("SELECT * FROM products", (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log('Products:', rows);
    });
});
