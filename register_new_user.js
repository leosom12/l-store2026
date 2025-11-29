const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'main.db');
const db = new sqlite3.Database(dbPath);

const username = 'Natan Sousa';
const email = 'natansousapv@gmail.com';
const password = '522138';
const isAdmin = 1; // Assuming admin access is desired, or 0 for regular user. Let's make it admin for now as requested in context of "cadastro".

const hash = bcrypt.hashSync(password, 10);
const createdAt = new Date().toISOString();

db.serialize(() => {
    db.run(`INSERT INTO users (username, email, password, isAdmin, subscriptionStatus, createdAt) 
            VALUES (?, ?, ?, ?, 'active', ?)`,
        [username, email, hash, isAdmin, createdAt],
        function (err) {
            if (err) {
                console.error('Error registering user:', err.message);
            } else {
                console.log(`User ${email} registered successfully with ID: ${this.lastID}`);
            }
            db.close();
        });
});
