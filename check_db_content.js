const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'user_1.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("SELECT * FROM products", (err, rows) => {
        if (err) {
            console.error("Error:", err);
        } else {
            const productsWithImages = rows.filter(p => p.image).map(p => ({ barcode: p.barcode, image: p.image }));
            console.log("Products with images:", JSON.stringify(productsWithImages, null, 2));
        }
        db.close();
    });
});
