const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('user_1.db');

db.run(`INSERT INTO products (barcode, name, price, stock, category) VALUES ('54321', 'Manual Test Item', 20.00, 100, 'Test')`, function (err) {
    if (err) {
        console.error('Error inserting:', err.message);
    } else {
        console.log('Product inserted with ID:', this.lastID);
    }
    db.close();
});
