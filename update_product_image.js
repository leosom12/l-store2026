const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./user_1.db');

db.serialize(() => {
    db.run("UPDATE products SET image = '/test.svg' WHERE id = 6", function (err) {
        if (err) {
            console.error(err);
            return;
        }
        console.log(`Row(s) updated: ${this.changes}`);
    });
});
