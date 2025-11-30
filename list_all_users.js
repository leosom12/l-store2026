const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./main.db');

db.serialize(() => {
    db.all("SELECT * FROM users", (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log('Users:', rows);
    });
});
