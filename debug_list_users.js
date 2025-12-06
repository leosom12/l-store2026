const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'main.db'));

db.serialize(() => {
    db.all("SELECT id, username, email, isAdmin FROM users", (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log(JSON.stringify(rows, null, 2));
        }
        db.close();
    });
});
