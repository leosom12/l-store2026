const express = require('express');
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_123';
const ADMIN_EMAIL = 'djleocv.hotmail.com@gmail.com';

app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
app.use(express.static('public', {
    etag: false,
    maxAge: 0,
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
}));

// ==================== DATABASE SETUP ====================
const MAIN_DB_PATH = path.join(__dirname, 'main.db');
const mainDb = new sqlite3.Database(MAIN_DB_PATH);

// Initialize Main DB
mainDb.serialize(() => {
    // Main Database (Users)
    mainDb.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        email TEXT UNIQUE,
        password TEXT,
        cnpj TEXT,
        cpf TEXT,
        isAdmin INTEGER DEFAULT 0,
        subscriptionStatus TEXT DEFAULT 'pending',
        subscriptionExpiresAt TEXT,
        createdAt TEXT,
        pin TEXT
    )`, (err) => {
        if (!err) {
            // Migration: Add pin column if not exists
            mainDb.run("ALTER TABLE users ADD COLUMN pin TEXT", (err) => {
                // Ignore error if column already exists
            });
        }
    });

    // Create Admin if not exists
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(adminPassword, 10);
    mainDb.run(`INSERT OR IGNORE INTO users (username, email, password, isAdmin, subscriptionStatus, createdAt) 
        VALUES ('Admin', ?, ?, 1, 'active', ?)`, [ADMIN_EMAIL, hash, new Date().toISOString()]);

    // Debtors Index (Global mapping email -> storeUserId)
    mainDb.run(`CREATE TABLE IF NOT EXISTS debtors_index (
        email TEXT PRIMARY KEY,
        storeUserId INTEGER,
        FOREIGN KEY(storeUserId) REFERENCES users(id)
    )`);
});

const multer = require('multer');

// Configure Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });

// Helper to get User DB
function getUserDb(userId) {
    const dbPath = path.join(__dirname, `user_${userId}.db`);
    console.log(`[DEBUG] Opening DB: ${dbPath} for UserID: ${userId}`);
    const db = new sqlite3.Database(dbPath);

    db.serialize(() => {
        // Products Table
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            barcode TEXT,
            name TEXT,
            category TEXT,
            price REAL,
            costPrice REAL,
            profitMargin REAL,
            stock INTEGER,
            icon TEXT,
            image TEXT,
            loyalty_points INTEGER DEFAULT 0,
            isPromotion INTEGER DEFAULT 0,
            promotionPrice REAL
        )`, (err) => {
            // Attempt to add column if table exists but column doesn't
            if (!err) {
                db.run("ALTER TABLE products ADD COLUMN image TEXT", (err) => { });
                db.run("ALTER TABLE products ADD COLUMN costPrice REAL", (err) => { });
                db.run("ALTER TABLE products ADD COLUMN profitMargin REAL", (err) => { });
                db.run("ALTER TABLE products ADD COLUMN loyalty_points INTEGER DEFAULT 0", (err) => { });
                db.run("ALTER TABLE products ADD COLUMN isPromotion INTEGER DEFAULT 0", (err) => { });
                db.run("ALTER TABLE products ADD COLUMN promotionPrice REAL", (err) => { });
            }
        });

        // Sales Table
        db.run(`CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            total REAL,
            paymentMethod TEXT,
            createdAt TEXT,
            cash_register_session_id INTEGER,
            proofImage TEXT,
            deliveryMethod TEXT,
            clientName TEXT,
            status TEXT DEFAULT 'completed'
        )`, (err) => {
            if (!err) {
                db.run("ALTER TABLE sales ADD COLUMN cash_register_session_id INTEGER", (err) => { });
                db.run("ALTER TABLE sales ADD COLUMN proofImage TEXT", (err) => { });
                db.run("ALTER TABLE sales ADD COLUMN deliveryMethod TEXT", (err) => { });
                db.run("ALTER TABLE sales ADD COLUMN clientName TEXT", (err) => { });
                db.run("ALTER TABLE sales ADD COLUMN status TEXT DEFAULT 'completed'", (err) => { });
            }
        });

        // Sale Items Table
        db.run(`CREATE TABLE IF NOT EXISTS sale_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            saleId INTEGER,
            productId INTEGER,
            quantity INTEGER,
            price REAL,
            FOREIGN KEY(saleId) REFERENCES sales(id)
        )`);

        // Sale Payments Table (Split Payments)
        db.run(`CREATE TABLE IF NOT EXISTS sale_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            saleId INTEGER,
            method TEXT,
            amount REAL,
            FOREIGN KEY(saleId) REFERENCES sales(id)
        )`);

        // Debtors Table
        db.run(`CREATE TABLE IF NOT EXISTS debtors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT,
            cpf TEXT,
            phone TEXT,
            debtAmount REAL DEFAULT 0,
            cardInfo TEXT,
            createdAt TEXT
        )`);

        // Store Config
        db.run(`CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);

        // Boletos Table
        db.run(`CREATE TABLE IF NOT EXISTS boletos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT,
            value REAL,
            dueDate TEXT,
            status TEXT DEFAULT 'pendente',
            createdAt TEXT
        )`);

        // Stock Movements Table
        db.run(`CREATE TABLE IF NOT EXISTS stock_movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            productId INTEGER,
            productName TEXT,
            type TEXT,
            quantity INTEGER,
            previousStock INTEGER,
            newStock INTEGER,
            reason TEXT,
            createdAt TEXT,
            FOREIGN KEY(productId) REFERENCES products(id)
        )`);

        // Clients Table (PIN-based registration)
        db.run(`CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            pin TEXT NOT NULL,
            lpBalance INTEGER DEFAULT 0,
            createdAt TEXT,
            UNIQUE(name, pin)
        )`, (err) => {
            if (!err) {
                db.run("ALTER TABLE clients ADD COLUMN lpBalance INTEGER DEFAULT 0", (err) => { });
            }
        });

        // Cash Register Sessions Table
        db.run(`CREATE TABLE IF NOT EXISTS cash_register_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            openingBalance REAL,
            closingBalance REAL,
            status TEXT DEFAULT 'open',
            openedAt TEXT,
            closedAt TEXT
        )`);
    });

    return db;
}

// ==================== MIDDLEWARE ====================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

app.get('/api/clients', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const db = getUserDb(userId);

    db.all('SELECT id, name, createdAt FROM clients ORDER BY createdAt DESC', (err, clients) => {
        if (err) {
            console.error('Erro ao listar clientes:', err);
            db.close();
            return res.status(500).json({ error: 'Erro ao listar clientes' });
        }

        res.json(clients);
        db.close();
    });
});

// ==================== AUTH ROUTES ====================
// Support both /api/auth/* and /api/* for compatibility

const handleRegister = (req, res) => {
    const { username, email, password, cnpj } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    mainDb.run(`INSERT INTO users (username, email, password, createdAt) VALUES (?, ?, ?, ?)`,
        [username, email, hashedPassword, new Date().toISOString()],
        function (err) {
            if (err) return res.status(400).json({ error: 'Email já cadastrado' });

            // Initialize user DB
            const userDb = getUserDb(this.lastID);
            userDb.close();

            res.json({ message: 'Usuário cadastrado com sucesso!' });
        }
    );
};

const handleLogin = (req, res) => {
    const { email, password } = req.body;

    mainDb.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'Usuário não encontrado' });

        if (!bcrypt.compareSync(password, user.password)) {
            return res.status(400).json({ error: 'Senha incorreta' });
        }

        // Check Subscription (skip for admin)
        if (!user.isAdmin && user.subscriptionStatus !== 'active') {
            // Allow login but frontend handles restriction? 
            // Or block? User said "Sim" enables access.
            // We'll send the status and let frontend handle the "Subscription Screen"
        }

        const token = jwt.sign({ id: user.id, email: user.email, isAdmin: user.isAdmin }, SECRET_KEY);
        res.json({ token, user: { id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin, subscriptionStatus: user.subscriptionStatus } });
    });
};

app.post('/api/register', handleRegister);
app.post('/api/auth/register', handleRegister);

app.post('/api/login', handleLogin);
app.post('/api/auth/login', handleLogin);

// ==================== APP ROUTES ====================

// Version
app.get('/api/version', (req, res) => {
    const packageJson = require('./package.json');
    res.json({ version: packageJson.version });
});

// Dashboard
app.get('/api/dashboard', authenticateToken, (req, res) => {
    const db = getUserDb(req.user.id);

    db.serialize(() => {
        db.get(`SELECT COUNT(*) as count FROM products`, (err, products) => {
            db.get(`SELECT COUNT(*) as count FROM products WHERE stock <= 5`, (err, lowStock) => {
                db.get(`SELECT COUNT(*) as count FROM products WHERE stock = 0`, (err, outStock) => {
                    db.get(`SELECT COUNT(*) as count, SUM(total) as total FROM sales`, (err, sales) => {
                        res.json({
                            totalProducts: products.count,
                            lowStockProducts: lowStock.count,
                            outOfStockProducts: outStock.count,
                            totalSales: sales.count,
                            totalSalesAmount: sales.total || 0
                        });
                        db.close();
                    });
                });
            });
        });
    });
});

// Config
app.get('/api/config', authenticateToken, (req, res) => {
    const db = getUserDb(req.user.id);
    db.all('SELECT * FROM config', (err, rows) => {
        if (err) {
            console.error('Erro ao ler configurações:', err);
            db.close();
            return res.status(500).json({ error: 'Erro ao ler configurações' });
        }
        const config = {};
        rows.forEach(row => {
            config[row.key] = row.value;
        });
        res.json(config);
        db.close();
    });
});

app.post('/api/config', authenticateToken, (req, res) => {
    const db = getUserDb(req.user.id);
    const { storePixKey } = req.body;

    if (!storePixKey) {
        db.close();
        return res.status(400).json({ error: 'Chave PIX é obrigatória' });
    }

    db.run('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', ['storePixKey', storePixKey], (err) => {
        if (err) {
            console.error('Erro ao salvar configuração:', err);
            db.close();
            return res.status(500).json({ error: 'Erro ao salvar configuração' });
        }
        res.json({ message: 'Configuração salva com sucesso' });
        db.close();
    });
});

// Products
app.get('/api/products', authenticateToken, (req, res) => {
    // Determine user ID (Store Owner ID)
    // If it's a client, they have storeId. If it's a store owner, they have id.
    const userId = req.user.storeId || req.user.id;

    console.log(`[DEBUG] GET /api/products for Store ID: ${userId} (Request by: ${req.user.clientName || 'Admin'})`);

    const db = getUserDb(userId);

    // Fetch owner name from main DB
    mainDb.get(`SELECT username FROM users WHERE id = ?`, [userId], (err, user) => {
        const ownerName = user ? user.username : 'Loja';

        db.all(`SELECT * FROM products`, (err, rows) => {
            if (err) {
                console.error('Error fetching products:', err);
                db.close();
                return res.status(500).json({ error: 'Erro ao buscar produtos' });
            }
            console.log(`[DEBUG] Found ${rows ? rows.length : 0} products`);

            // Add ownerName to each product
            const products = rows ? rows.map(p => ({ ...p, ownerName })) : [];

            res.json(products);
            db.close();
        });
    });
});

app.post('/api/products', authenticateToken, upload.single('image'), (req, res) => {
    const { barcode, name, category, price, stock, icon, loyalty_points, isPromotion, promotionPrice } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const db = getUserDb(req.user.id);
    db.run(`INSERT INTO products(barcode, name, category, price, stock, icon, image, loyalty_points, isPromotion, promotionPrice) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [barcode, name, category, price, stock, icon, image, loyalty_points || 0, isPromotion || 0, promotionPrice || null],
        function (err) {
            if (err) {
                console.error('Error creating product:', err);
                db.close();
                return res.status(500).json({ error: 'Erro ao criar produto' });
            }
            res.json({ id: this.lastID });
            db.close();
        }
    );
});

app.put('/api/products/:id', authenticateToken, upload.single('image'), (req, res) => {
    const { barcode, name, category, price, stock, icon, loyalty_points, isPromotion, promotionPrice } = req.body;
    const db = getUserDb(req.user.id);

    let query = `UPDATE products SET barcode=?, name=?, category=?, price=?, stock=?, icon=?, loyalty_points=?, isPromotion=?, promotionPrice=?`;
    let params = [barcode, name, category, price, stock, icon, loyalty_points || 0, isPromotion || 0, promotionPrice || null];

    if (req.file) {
        query += `, image=?`;
        params.push(`/uploads/${req.file.filename}`);
    }

    query += ` WHERE id=?`;
    params.push(req.params.id);

    db.run(query, params, function (err) {
        if (err) {
            console.error('Error updating product:', err);
            db.close();
            return res.status(500).json({ error: 'Erro ao atualizar produto' });
        }
        res.json({ message: 'Updated' });
        db.close();
    }
    );
});

app.delete('/api/products/:id', authenticateToken, (req, res) => {
    const db = getUserDb(req.user.id);
    db.run(`DELETE FROM products WHERE id=?`, [req.params.id], function (err) {
        res.json({ message: 'Deleted' });
        db.close();
    });
});

app.get('/api/products/:id', authenticateToken, (req, res) => {
    const db = getUserDb(req.user.id);
    db.get(`SELECT * FROM products WHERE id = ?`, [req.params.id], (err, row) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            db.close();
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        res.json(row);
        db.close();
    });
});

app.get('/api/products/barcode/:code', authenticateToken, (req, res) => {
    const db = getUserDb(req.user.id);
    db.get(`SELECT * FROM products WHERE barcode = ?`, [req.params.code], (err, row) => {
        res.json(row || {});
        db.close();
    });
});

// Sales
app.get('/api/sales', authenticateToken, (req, res) => {
    const db = getUserDb(req.user.id);
    db.all(`SELECT * FROM sales ORDER BY createdAt DESC`, async (err, sales) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: err.message });
        }

        // Fetch payments for each sale
        const salesWithPayments = await Promise.all(sales.map(async (sale) => {
            return new Promise((resolve, reject) => {
                db.all(`SELECT method, amount FROM sale_payments WHERE saleId = ?`, [sale.id], (err, payments) => {
                    if (err) {
                        resolve({ ...sale, payments: [] }); // Ignore error, just return empty payments
                    } else {
                        resolve({ ...sale, payments: payments });
                    }
                });
            });
        }));

        res.json(salesWithPayments);
        db.close();
    });
});

app.post('/api/sales', authenticateToken, (req, res) => {
    const { items, paymentMethod, total, payments } = req.body; // payments is optional array of { method, amount }
    const db = getUserDb(req.user.id);

    // Check for open cash register session
    db.get(`SELECT id FROM cash_register_sessions WHERE status = 'open' ORDER BY id DESC LIMIT 1`, (err, session) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: err.message });
        }

        if (!session) {
            db.close();
            return res.status(400).json({ error: 'O caixa estÃ¡ fechado. Abra o caixa para realizar vendas.' });
        }

        const sessionId = session.id;

        db.serialize(() => {
            // If split payment, paymentMethod might be 'misto' or we just use the first one/main one for legacy display
            const mainMethod = payments && payments.length > 0 ? 'misto' : paymentMethod;

            db.run(`INSERT INTO sales(total, paymentMethod, createdAt, cash_register_session_id) VALUES(?, ?, ?, ?)`,
                [total, mainMethod, new Date().toISOString(), sessionId],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    const saleId = this.lastID;

                    const stmt = db.prepare(`INSERT INTO sale_items(saleId, productId, quantity, price) VALUES(?, ?, ?, ?)`);
                    const updateStock = db.prepare(`UPDATE products SET stock = stock - ? WHERE id = ?`);

                    items.forEach(item => {
                        stmt.run(saleId, item.productId, item.quantity, item.price);
                        updateStock.run(item.quantity, item.productId);
                    });

                    stmt.finalize();
                    updateStock.finalize();

                    // Handle Split Payments
                    if (payments && Array.isArray(payments) && payments.length > 0) {
                        const paymentStmt = db.prepare(`INSERT INTO sale_payments(saleId, method, amount) VALUES(?, ?, ?)`);
                        payments.forEach(p => {
                            paymentStmt.run(saleId, p.method, p.amount);
                        });
                        paymentStmt.finalize();
                    } else {
                        // Legacy support: insert single payment as sale_payment too
                        db.run(`INSERT INTO sale_payments(saleId, method, amount) VALUES(?, ?, ?)`, [saleId, paymentMethod, total]);
                    }

                    res.json({ id: saleId, total });
                    db.close();
                }
            );
        });
    });
});

// Debtors
app.get('/api/debtors', authenticateToken, (req, res) => {
    const db = getUserDb(req.user.id);
    db.all(`SELECT * FROM debtors`, (err, rows) => {
        res.json(rows);
        db.close();
    });
});

app.post('/api/debtors', authenticateToken, (req, res) => {
    const { name, email, cpf, phone, cardInfo } = req.body;
    const db = getUserDb(req.user.id);

    db.serialize(() => {
        db.run(`INSERT INTO debtors(name, email, cpf, phone, cardInfo, createdAt) VALUES(?, ?, ?, ?, ?, ?)`,
            [name, email, cpf, phone, cardInfo, new Date().toISOString()],
            function (err) {
                if (err) {
                    db.close();
                    return res.status(500).json({ error: err.message });
                }

                const debtorId = this.lastID;

                // Update global index
                mainDb.run(`INSERT OR REPLACE INTO debtors_index(email, storeUserId) VALUES(?, ?)`,
                    [email, req.user.id],
                    (err) => {
                        if (err) console.error('Error updating debtors index:', err);
                        res.json({ id: debtorId, message: 'Devedor criado' });
                        db.close();
                    }
                );
            }
        );
    });
});

app.put('/api/debtors/:id', authenticateToken, (req, res) => {
    const { name, email, cpf, phone, cardInfo } = req.body;
    const db = getUserDb(req.user.id);

    db.run(`UPDATE debtors SET name=?, email=?, cpf=?, phone=?, cardInfo=? WHERE id=?`,
        [name, email, cpf, phone, cardInfo, req.params.id],
        function (err) {
            if (err) {
                db.close();
                return res.status(500).json({ error: err.message });
            }

            // Update global index
            mainDb.run(`INSERT OR REPLACE INTO debtors_index(email, storeUserId) VALUES(?, ?)`,
                [email, req.user.id],
                (err) => {
                    if (err) console.error('Error updating debtors index:', err);
                    res.json({ message: 'Devedor atualizado' });
                    db.close();
                }
            );
        }
    );
});


app.post('/api/debtors/:id/pay', authenticateToken, (req, res) => {
    const { amount } = req.body;
    const db = getUserDb(req.user.id);

    db.run(`UPDATE debtors SET debtAmount = debtAmount - ? WHERE id = ?`,
        [amount, req.params.id],
        function (err) {
            if (err) {
                db.close();
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Payment recorded' });
            db.close();
        }
    );
});

// ==================== BOLETOS ROUTES ====================
app.get('/api/boletos', authenticateToken, (req, res) => {
    const db = getUserDb(req.user.id);
    db.all(`SELECT * FROM boletos ORDER BY dueDate ASC`, (err, rows) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
        db.close();
    });
});

app.post('/api/boletos', authenticateToken, (req, res) => {
    const { description, value, dueDate, status } = req.body;
    const db = getUserDb(req.user.id);

    db.run(`INSERT INTO boletos(description, value, dueDate, status, createdAt) VALUES(?, ?, ?, ?, ?)`,
        [description, value, dueDate, status || 'pendente', new Date().toISOString()],
        function (err) {
            if (err) {
                db.close();
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, message: 'Boleto criado com sucesso' });
            db.close();
        }
    );
});

app.get('/api/boletos/:id', authenticateToken, (req, res) => {
    const db = getUserDb(req.user.id);
    db.get(`SELECT * FROM boletos WHERE id = ?`, [req.params.id], (err, row) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: err.message });
        }
        res.json(row || {});
        db.close();
    });
});

app.put('/api/boletos/:id', authenticateToken, (req, res) => {
    const { description, value, dueDate, status } = req.body;
    const db = getUserDb(req.user.id);

    if (status && !description && !value && !dueDate) {
        db.run(`UPDATE boletos SET status = ? WHERE id = ?`,
            [status, req.params.id],
            function (err) {
                if (err) {
                    db.close();
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: 'Status atualizado com sucesso' });
                db.close();
            }
        );
    } else {
        db.run(`UPDATE boletos SET description = ?, value = ?, dueDate = ?, status = ? WHERE id = ?`,
            [description, value, dueDate, status, req.params.id],
            function (err) {
                if (err) {
                    db.close();
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: 'Boleto atualizado com sucesso' });
                db.close();
            }
        );
    }
});

app.delete('/api/boletos/:id', authenticateToken, (req, res) => {
    const db = getUserDb(req.user.id);
    db.run(`DELETE FROM boletos WHERE id = ?`, [req.params.id], function (err) {
        if (err) {
            db.close();
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Boleto excluÃ­do com sucesso' });
        db.close();
    });
});

// ==================== STOCK MOVEMENTS ROUTES ====================
// Listar movimentaÃ§Ãµes de estoque
app.get('/api/stock-movements', authenticateToken, (req, res) => {
    const db = getUserDb(req.user.id);
    db.all(`SELECT * FROM stock_movements ORDER BY createdAt DESC LIMIT 100`, (err, rows) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
        db.close();
    });
});

// Criar nova movimentaÃ§Ã£o de estoque
app.post('/api/stock-movements', authenticateToken, (req, res) => {
    const { productId, type, quantity, reason } = req.body;
    const db = getUserDb(req.user.id);

    // Buscar produto atual
    db.get(`SELECT * FROM products WHERE id = ?`, [productId], (err, product) => {
        if (err || !product) {
            db.close();
            return res.status(404).json({ error: 'Produto nÃ£o encontrado' });
        }

        const previousStock = product.stock;
        let newStock = previousStock;

        // Calcular novo estoque baseado no tipo
        if (type === 'entrada') {
            newStock = previousStock + quantity;
        } else if (type === 'saida') {
            newStock = previousStock - quantity;
            if (newStock < 0) {
                db.close();
                return res.status(400).json({ error: 'Estoque insuficiente' });
            }
        } else if (type === 'ajuste') {
            newStock = quantity; // Ajuste define o valor exato
        }

        // Atualizar estoque do produto
        db.run(`UPDATE products SET stock = ? WHERE id = ?`, [newStock, productId], (err) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: err.message });
            }

            // Registrar movimentaÃ§Ã£o
            db.run(`INSERT INTO stock_movements(productId, productName, type, quantity, previousStock, newStock, reason, createdAt) 
                    VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
                [productId, product.name, type, quantity, previousStock, newStock, reason, new Date().toISOString()],
                function (err) {
                    if (err) {
                        db.close();
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({
                        id: this.lastID,
                        message: 'MovimentaÃ§Ã£o registrada com sucesso',
                        newStock: newStock
                    });
                    db.close();
                }
            );
        });
    });
});

// Update User PIN
app.put('/api/settings/pin', authenticateToken, (req, res) => {
    const { pin } = req.body;
    const userId = req.user.id;

    if (!pin) {
        return res.status(400).json({ error: 'PIN é obrigatório' });
    }

    mainDb.run('UPDATE users SET pin = ? WHERE id = ?', [pin, userId], function (err) {
        if (err) {
            console.error('Error updating PIN:', err);
            return res.status(500).json({ error: 'Erro ao atualizar PIN' });
        }
        res.json({ message: 'PIN atualizado com sucesso' });
    });
});

// Delete stock movement
app.delete('/api/stock-movements/:id', authenticateToken, (req, res) => {
    const movementId = req.params.id;
    const userId = req.user.userId;
    const db = getUserDb(userId);

    // First get the movement to know what to revert
    db.get('SELECT * FROM stock_movements WHERE id = ?', [movementId], (err, movement) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: err.message });
        }
        if (!movement) {
            db.close();
            return res.status(404).json({ error: 'MovimentaÃ§Ã£o nÃ£o encontrada' });
        }

        // Calculate revert quantity
        let revertQuantity = 0;
        if (movement.type === 'entrada') {
            revertQuantity = -movement.quantity; // Remove added stock
        } else if (movement.type === 'saida') {
            revertQuantity = movement.quantity; // Add back removed stock
        }

        const updateStockPromise = new Promise((resolve, reject) => {
            if (movement.type === 'ajuste') {
                // Revert to previous stock
                db.run('UPDATE products SET stock = ? WHERE id = ?', [movement.previous_stock, movement.product_id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else {
                // Adjust stock
                db.run('UPDATE products SET stock = stock + ? WHERE id = ?', [revertQuantity, movement.product_id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            }
        });

        updateStockPromise
            .then(() => {
                // Delete the movement record
                db.run('DELETE FROM stock_movements WHERE id = ?', [movementId], (err) => {
                    if (err) {
                        db.close();
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({ message: 'MovimentaÃ§Ã£o excluÃ­da e estoque revertido com sucesso' });
                    db.close();
                });
            })
            .catch(err => {
                db.close();
                res.status(500).json({ error: 'Erro ao reverter estoque: ' + err.message });
            });
    });
});

// ==================== SUBSCRIPTION ROUTES ====================
app.post('/api/subscription/notify', authenticateToken, (req, res) => {
    const userId = req.user.id;
    mainDb.run(`UPDATE users SET subscriptionStatus = 'verification' WHERE id = ?`, [userId], function (err) {
        if (err) return res.status(500).json({ error: 'Erro ao notificar pagamento' });
        res.json({ message: 'NotificaÃ§Ã£o enviada' });
    });
});

// Admin Routes
app.get('/api/admin/users', authenticateToken, (req, res) => {
    if (!req.user.isAdmin) return res.sendStatus(403);
    mainDb.all(`SELECT id, username, email, isAdmin, subscriptionStatus, createdAt FROM users`, (err, rows) => {
        res.json(rows);
    });
});

app.put('/api/admin/users/:id/subscription', authenticateToken, (req, res) => {
    if (!req.user.isAdmin) return res.sendStatus(403);
    const { subscriptionStatus } = req.body;

    mainDb.run(`UPDATE users SET subscriptionStatus = ? WHERE id = ?`, [subscriptionStatus, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Updated' });
    });
});

// ==================== DEBTORS ROUTES (PAYMENT) ====================
app.post('/api/debtors/:id/pay', authenticateToken, (req, res) => {
    const { amount } = req.body;
    const db = getUserDb(req.user.id);

    db.get(`SELECT * FROM debtors WHERE id = ?`, [req.params.id], (err, debtor) => {
        if (err || !debtor) {
            db.close();
            return res.status(404).json({ error: 'Devedor nÃ£o encontrado' });
        }

        const newDebt = debtor.debtAmount - amount;
        if (newDebt < 0) {
            db.close();
            return res.status(400).json({ error: 'Valor maior que a dÃ­vida' });
        }

        db.run(`UPDATE debtors SET debtAmount = ? WHERE id = ?`, [newDebt, req.params.id], function (err) {
            if (err) {
                db.close();
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Pagamento registrado', newDebt });
            db.close();
        });
    });
});

// ==================== CASH REGISTER ROUTES ====================
app.post('/api/cash-register/open', authenticateToken, (req, res) => {
    const { openingBalance } = req.body;
    const db = getUserDb(req.user.id);

    // Check if there is already an open session
    db.get(`SELECT * FROM cash_register_sessions WHERE status = 'open'`, (err, session) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: err.message });
        }

        if (session) {
            db.close();
            return res.status(400).json({ error: 'JÃ¡ existe um caixa aberto' });
        }

        db.run(`INSERT INTO cash_register_sessions(openingBalance, status, openedAt) VALUES(?, 'open', ?)`,
            [openingBalance, new Date().toISOString()],
            function (err) {
                if (err) {
                    db.close();
                    return res.status(500).json({ error: err.message });
                }
                res.json({ id: this.lastID, message: 'Caixa aberto com sucesso' });
                db.close();
            }
        );
    });
});

app.get('/api/cash-register/status', authenticateToken, (req, res) => {
    const db = getUserDb(req.user.id);
    db.get(`SELECT * FROM cash_register_sessions WHERE status = 'open' ORDER BY id DESC LIMIT 1`, (err, session) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: err.message });
        }
        res.json(session || { status: 'closed' });
        db.close();
    });
});

app.post('/api/cash-register/close', authenticateToken, (req, res) => {
    const db = getUserDb(req.user.id);

    // Get open session
    db.get(`SELECT * FROM cash_register_sessions WHERE status = 'open' ORDER BY id DESC LIMIT 1`, (err, session) => {
        if (err || !session) {
            db.close();
            return res.status(400).json({ error: 'Nenhum caixa aberto para fechar' });
        }

        // Calculate total sales for this session
        db.get(`SELECT SUM(total) as totalSales FROM sales WHERE cash_register_session_id = ?`, [session.id], (err, result) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: err.message });
            }

            const totalSales = result.totalSales || 0;
            const closingBalance = session.openingBalance + totalSales;
            const closedAt = new Date().toISOString();

            db.run(`UPDATE cash_register_sessions SET closingBalance = ?, status = 'closed', closedAt = ? WHERE id = ?`,
                [closingBalance, closedAt, session.id],
                function (err) {
                    if (err) {
                        db.close();
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({
                        message: 'Caixa fechado com sucesso',
                        openingBalance: session.openingBalance,
                        totalSales: totalSales,
                        closingBalance: closingBalance,
                        closedAt: closedAt
                    });
                    db.close();
                }
            );
        });
    });
});

// ==================== CLIENT STORE ENDPOINTS ====================

// Client Login (Name + Seller PIN)
app.post('/api/client/login', (req, res) => {
    const { name, pin } = req.body; // pin here is the SELLER PIN

    if (!name || !pin) {
        return res.status(400).json({ error: 'Nome e PIN do vendedor são obrigatórios' });
    }

    // 1. Find the Store/Seller by PIN
    mainDb.get('SELECT id, username FROM users WHERE pin = ?', [pin], (err, seller) => {
        if (err) {
            console.error('Error finding seller:', err);
            return res.status(500).json({ error: 'Erro no servidor' });
        }

        if (!seller) {
            return res.status(404).json({ error: 'Loja não encontrada com este PIN' });
        }

        const storeId = seller.id;
        const db = getUserDb(storeId);

        // 2. Find or Create Client in that Store's DB
        db.get('SELECT * FROM clients WHERE lower(name) = lower(?)', [name], (err, client) => {
            if (err) {
                console.error('Error finding client:', err);
                db.close();
                return res.status(500).json({ error: 'Erro no servidor' });
            }

            if (client) {
                const token = jwt.sign({ clientId: client.id, clientName: client.name, storeId: storeId }, SECRET_KEY);
                res.json({ token, client: { id: client.id, name: client.name, lpBalance: client.lpBalance || 0 }, storeName: seller.username });
                db.close();
            } else {
                // Create new client with dummy PIN '0000'
                db.run('INSERT INTO clients (name, pin, createdAt) VALUES (?, ?, ?)',
                    [name, '0000', new Date().toISOString()],
                    function (err) {
                        if (err) {
                            console.error('Error creating client:', err);
                            db.close();
                            return res.status(500).json({ error: 'Erro ao criar cliente' });
                        }

                        const newClientId = this.lastID;
                        const token = jwt.sign({ clientId: newClientId, clientName: name, storeId: storeId }, SECRET_KEY);
                        res.json({ token, client: { id: newClientId, name: name, lpBalance: 0 }, storeName: seller.username });
                        db.close();
                    }
                );
            }

        });
    });
});

app.post('/api/client/checkout', upload.single('proofImage'), (req, res) => {
    // Note: When using multer, req.body fields are available after the file is processed
    const { items, total, deliveryMethod, clientName } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Não autorizado' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });

        const db = getUserDb(user.storeId);
        const proofImage = req.file ? `/uploads/${req.file.filename}` : null;

        // Parse items if it comes as a string (FormData)
        let parsedItems;
        try {
            parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
        } catch (e) {
            parsedItems = [];
        }

        // Calculate Loyalty Points
        let earnedLP = 0;
        parsedItems.forEach(item => {
            if (item.loyalty_points) {
                earnedLP += item.loyalty_points * item.quantity;
            }
        });

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            // 1. Create Sale Record
            db.run(`INSERT INTO sales (total, paymentMethod, createdAt, proofImage, deliveryMethod, clientName, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [total, 'pix', new Date().toISOString(), proofImage, deliveryMethod, clientName || user.clientName, 'pending'],
                function (err) {
                    if (err) {
                        db.run('ROLLBACK');
                        db.close();
                        console.error('Error creating sale:', err);
                        return res.status(500).json({ error: 'Erro ao criar venda' });
                    }

                    const saleId = this.lastID;

                    // 2. Insert Sale Items
                    const stmt = db.prepare('INSERT INTO sale_items (saleId, productId, quantity, price) VALUES (?, ?, ?, ?)');
                    parsedItems.forEach(item => {
                        stmt.run(saleId, item.id, item.quantity, item.price);
                    });
                    stmt.finalize();

                    // 3. Update Stock
                    const updateStockStmt = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
                    parsedItems.forEach(item => {
                        updateStockStmt.run(item.quantity, item.id);
                    });
                    updateStockStmt.finalize();

                    // 4. Update Client Loyalty Points
                    if (earnedLP > 0) {
                        db.run(`UPDATE clients SET lpBalance = lpBalance + ? WHERE id = ?`, [earnedLP, user.clientId], (err) => {
                            if (err) console.error('Error updating LP:', err);
                        });
                    }

                    db.run('COMMIT', () => {
                        db.close();
                        res.json({ message: 'Pedido realizado com sucesso!', saleId, earnedLP });
                    });
                }
            );
        });
    });
});

// Get client orders
app.get('/api/client/orders', (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'NÃ£o autorizado' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SECRET_KEY);

        if (!decoded.clientId || !decoded.storeId) {
            return res.status(401).json({ error: 'Token invÃ¡lido' });
        }

        const db = getUserDb(decoded.storeId);

        // Get all sales made by client (orders with paymentMethod = 'client_order')
        db.all(`
            SELECT s.id, s.total, s.createdAt, COUNT(si.id) as itemCount
            FROM sales s
            LEFT JOIN sale_items si ON s.id = si.saleId
            WHERE s.paymentMethod = 'client_order'
            GROUP BY s.id
            ORDER BY s.createdAt DESC
        `, (err, orders) => {
            if (err) {
                console.error('Erro ao buscar pedidos:', err);
                db.close();
                return res.status(500).json({ error: 'Erro ao buscar pedidos' });
            }

            res.json(orders);
            db.close();
        });
    } catch (err) {
        console.error('Erro ao verificar token:', err);
        return res.status(401).json({ error: 'Token inválido' });
    }
});

// ==================== POS ONLINE ORDERS ROUTES ====================
app.get('/api/pos/online-orders', authenticateToken, (req, res) => {
    const db = getUserDb(req.user.id);

    // Fetch pending orders (status = 'pending')
    // We also want to fetch the items for these orders
    db.all(`
        SELECT s.id, s.total, s.createdAt, s.clientName, s.proofImage, s.deliveryMethod, s.status,
               json_group_array(json_object('name', p.name, 'quantity', si.quantity, 'price', si.price)) as items
        FROM sales s
        JOIN sale_items si ON s.id = si.saleId
        JOIN products p ON si.productId = p.id
        WHERE s.paymentMethod = 'pix' AND s.status = 'pending'
        GROUP BY s.id
        ORDER BY s.createdAt ASC
    `, (err, rows) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: err.message });
        }

        // Parse items JSON
        const orders = rows.map(row => ({
            ...row,
            items: JSON.parse(row.items)
        }));

        res.json(orders);
        db.close();
    });
});

app.post('/api/pos/online-orders/:id/confirm', authenticateToken, (req, res) => {
    const db = getUserDb(req.user.id);
    const orderId = req.params.id;

    // Update status to 'completed' (or 'paid')
    db.run(`UPDATE sales SET status = 'completed' WHERE id = ?`, [orderId], function (err) {
        if (err) {
            db.close();
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Pedido confirmado com sucesso' });
        db.close();
    });
});

app.post('/api/pos/online-orders/:id/reject', authenticateToken, (req, res) => {
    const db = getUserDb(req.user.id);
    const orderId = req.params.id;

    // Update status to 'rejected'
    db.run(`UPDATE sales SET status = 'rejected' WHERE id = ?`, [orderId], function (err) {
        if (err) {
            db.close();
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Pedido rejeitado' });
        db.close();
    });
});

// ==================== BACKUP & RESTORE ====================
const archiver = require('archiver');
const admZip = require('adm-zip');

app.get('/api/backup', authenticateToken, (req, res) => {
    const userId = req.user.id;
    console.log(`[BACKUP] Starting backup for User ID: ${userId}`);

    const dbPath = path.join(__dirname, `user_${userId}.db`);
    const uploadsDir = path.join(__dirname, 'public/uploads');

    res.setHeader('Content-Type', 'application/zip');
    res.attachment(`backup_${userId}_${new Date().toISOString().slice(0, 10)}.zip`);

    const archive = archiver('zip', {
        zlib: { level: 9 }
    });

    archive.on('error', function (err) {
        console.error('[BACKUP ERROR] Archiver error:', err);
        if (!res.headersSent) {
            res.status(500).send({ error: err.message });
        }
    });

    archive.on('end', () => {
        console.log(`[BACKUP] Backup finished for User ID: ${userId}, Total bytes: ${archive.pointer()}`);
    });

    archive.pipe(res);

    // Add Database
    if (fs.existsSync(dbPath)) {
        console.log(`[BACKUP] Adding database file: ${dbPath}`);
        archive.file(dbPath, { name: 'database.db' });
    } else {
        console.warn(`[BACKUP] Database file not found: ${dbPath}`);
    }

    // Add Uploads
    if (fs.existsSync(uploadsDir)) {
        console.log(`[BACKUP] Adding uploads directory: ${uploadsDir}`);
        archive.directory(uploadsDir, 'uploads');
    }

    archive.finalize();
});

app.post('/api/restore', authenticateToken, upload.single('backup'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const userId = req.user.id;
    const dbPath = path.join(__dirname, `user_${userId}.db`);
    const uploadsDir = path.join(__dirname, 'public/uploads');
    const zipPath = req.file.path;

    try {
        const zip = new admZip(zipPath);
        const zipEntries = zip.getEntries();

        // 1. Restore Database
        const dbEntry = zipEntries.find(entry => entry.entryName === 'database.db');
        if (dbEntry) {
            // Close existing DB connections if any (simplified: we rely on getUserDb opening new ones)
            // Ideally we should force close, but for sqlite file swap it often works or requires restart
            // For safety, we overwrite. 
            // Warning: active connections might lock the file on Windows.
            // Solving this properly requires a DB pool manager. 
            // For this scope: We attempt to write. 
            fs.writeFileSync(dbPath, dbEntry.getData());
        }

        // 2. Restore Uploads
        zipEntries.forEach(entry => {
            if (entry.entryName.startsWith('uploads/') && !entry.isDirectory) {
                const fileName = entry.entryName.replace('uploads/', '');
                const targetPath = path.join(uploadsDir, fileName);
                fs.writeFileSync(targetPath, entry.getData());
            }
        });

        // Cleanup uploaded zip
        fs.unlinkSync(zipPath);

        res.json({ message: 'Backup restaurado com sucesso! Recarregue a página.' });

    } catch (err) {
        console.error('Restore error:', err);
        res.status(500).json({ error: 'Erro ao restaurar backup: ' + err.message });
    }
});

// Rota para obter a versÃ£o do sistema
app.get('/api/version', (req, res) => {
    try {
        const packageJson = require('./package.json');
        res.json({ version: packageJson.version });
    } catch (error) {
        console.error('Erro ao ler versÃ£o:', error);
        res.status(500).json({ error: 'Erro ao obter versÃ£o' });
    }
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'online' });
});

// Start Server
app.listen(PORT, '0.0.0.0', async () => {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let localIP = 'localhost';

    for (const interfaceName in networkInterfaces) {
        for (const iface of networkInterfaces[interfaceName]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                localIP = iface.address;
                break;
            }
        }
        if (localIP !== 'localhost') break;
    }

    console.log('='.repeat(60));
    console.log('ðŸ›’ Sistema PDV Supermercado - PWA');
    console.log('='.repeat(60));
    console.log(`ðŸ“¡ Servidor LOCAL: http://localhost:${PORT}`);
    console.log(`ðŸŒ Servidor REDE:  http://${localIP}:${PORT}`);
    console.log('');
    console.log('ðŸ‘¤ ADMINISTRADOR:');
    console.log(`   ðŸ“§ Email: ${ADMIN_EMAIL}`);
    console.log(`   ðŸ”‘ Senha: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    console.log('');
    console.log('='.repeat(60));
    console.log('');

    // Iniciar ngrok automaticamente se configurado
    if (process.env.NGROK_AUTHTOKEN) {
        console.log('ðŸŒ Iniciando tÃºnel pÃºblico ngrok...');
        try {
            const ngrok = require('@ngrok/ngrok');
            const listener = await ngrok.forward({
                addr: PORT,
                authtoken_from_env: true,
            });

            const publicUrl = listener.url();
            console.log('');
            console.log('âœ… TÃšNEL PÃšBLICO ATIVO!');
            console.log(`ðŸŒ URL PÃšBLICA: ${publicUrl}`);
            console.log('');
            global.NGROK_URL = publicUrl;
        } catch (error) {
            console.log('âš ï¸ Ngrok nÃ£o iniciado:', error.message);
        }
    }
});
