const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Assuming user ID 1 for the admin user we are testing with
const dbPath = path.join(__dirname, 'user_1.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('Resetting cash register sessions...');
    db.run(`UPDATE cash_register_sessions SET status = 'closed', closedAt = ? WHERE status = 'open'`, [new Date().toISOString()], function (err) {
        if (err) {
            console.error('Error closing sessions:', err);
        } else {
            console.log(`Closed ${this.changes} open sessions.`);
        }
        db.close();
    });
});
