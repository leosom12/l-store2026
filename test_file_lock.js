const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('locked_test.db');

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS test (id INT)");
    db.run("INSERT INTO test VALUES (1)");

    console.log('DB Open.');

    setTimeout(() => {
        // Try to read file
        fs.readFile('locked_test.db', (err, data) => {
            if (err) {
                console.error('READ ERROR:', err.code, err.message);
                if (err.code === 'EBUSY') console.log('CONFIRMED: EBUSY on open DB');
            } else {
                console.log('READ SUCCESS: Bytes:', data.length);
            }
            db.close();
        });
    }, 1000);
});
