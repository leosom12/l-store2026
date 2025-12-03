const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'user_1.db'); // Assuming Admin ID is 1
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("PRAGMA table_info(products)", (err, rows) => {
        if (err) {
            console.error('Error getting table info:', err);
        } else {
            console.log('Columns:', rows.map(r => r.name).join(', '));

            db.all("SELECT id, name, loyalty_points FROM products ORDER BY id DESC LIMIT 5", (err, products) => {
                if (err) console.error('Error listing products:', err);
                else {
                    console.log('Recent Products:');
                    console.table(products);
                }
                db.close();
            });
        }
    });
});
