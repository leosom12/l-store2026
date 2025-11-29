const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'user_1.db');
const db = new sqlite3.Database(dbPath);

db.get('SELECT image FROM products WHERE barcode = "0000"', (err, row) => {
    if (err) {
        console.error(err);
    } else if (row) {
        console.log(`PATH: ${row.image}`);
    } else {
        console.log('NO_PRODUCT');
    }
});
