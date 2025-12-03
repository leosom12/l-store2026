const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const MAIN_DB_PATH = path.join(__dirname, 'main.db');
const db = new sqlite3.Database(MAIN_DB_PATH);

const targetEmail = 'djleocv.hotmail.com@gmail.com';

db.serialize(() => {
    // Check Users
    db.get(`SELECT * FROM users WHERE email = ?`, [targetEmail], (err, user) => {
        if (err) {
            console.error('Error checking users:', err);
        } else if (user) {
            console.log(`[FOUND IN USERS] ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, IsAdmin: ${user.isAdmin}`);
        } else {
            console.log('[NOT FOUND IN USERS]');
        }
    });

    // Check Debtors Index
    db.get(`SELECT * FROM debtors_index WHERE email = ?`, [targetEmail], (err, debtor) => {
        if (err) {
            console.error('Error checking debtors_index:', err);
        } else if (debtor) {
            console.log(`[FOUND IN DEBTORS] StoreUserId: ${debtor.storeUserId}, Email: ${debtor.email}`);
        } else {
            console.log('[NOT FOUND IN DEBTORS]');
        }
    });
});

db.close();
