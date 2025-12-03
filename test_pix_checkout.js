
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data'); // axios needs form-data package in node

// Config
const BASE_URL = 'http://localhost:3000';
const CLIENT_NAME = 'TestClient_' + Date.now();
const CLIENT_PIN = '1234';

async function runTest() {
    try {
        console.log('1. Registering Client...');
        // We need a store user first. I'll assume the admin exists (ID 1).
        // Register client
        // Actually, client registration is usually done via the store page or by the store owner.
        // But there is a public endpoint /api/client/register? No.
        // There is /api/client/login which creates if not exists? No.
        // Let's check how clients are created.
        // Usually via `POST /api/clients` (admin) or `POST /api/client/auth` (public)?

        // I'll try to login directly. If it fails, I might need to create one via admin API.
        // But wait, the client login uses Name + PIN + StoreID.
        // I need to know the store ID. Admin is ID 1.

        // Let's try to register a client via the public API if it exists, or just use a known one.
        // I'll use the Admin token to create a client first to be safe.

        // Login as Admin
        console.log('Logging in as Admin...');
        const adminRes = await axios.post(`${BASE_URL}/api/login`, {
            email: 'djleocv.hotmail.com@gmail.com',
            password: '123456'
        });
        const adminToken = adminRes.data.token;
        console.log('Admin logged in.');

        // Create Client
        console.log('Creating Client...');
        const clientRes = await axios.post(`${BASE_URL}/api/clients`, {
            name: CLIENT_NAME,
            phone: '999999999',
            email: `${CLIENT_NAME}@test.com`
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const clientId = clientRes.data.id;
        console.log(`Client created with ID: ${clientId}`);

        // Now Login as Client (Simulating Store Login)
        // The client login endpoint is /api/client/login
        console.log('Logging in as Client...');
        const loginRes = await axios.post(`${BASE_URL}/api/client/login`, {
            username: CLIENT_NAME,
            pin: '1234', // Wait, does the client have a PIN? 
            // The client login uses the STORE's PIN if I recall correctly?
            // Or the client's own PIN?
            // Let's check app.js loginClient function.
            // It sends { username, pin, storeId }.
            // The PIN is the STORE PIN (seller pin).
            storeId: 1
        });

        const clientToken = loginRes.data.token;
        console.log('Client logged in.');

        // Create dummy proof file
        const filePath = path.join(__dirname, 'test_proof.txt');
        fs.writeFileSync(filePath, 'This is a fake proof image content.');

        // Prepare Checkout Data
        const form = new FormData();
        form.append('clientId', clientId);
        form.append('items', JSON.stringify([{
            id: 1, name: 'Test Product', price: 10.00, quantity: 1
        }]));
        form.append('total', '10.00');
        form.append('paymentMethod', 'pix');
        form.append('deliveryMethod', 'delivery');
        form.append('clientName', CLIENT_NAME);
        form.append('proofImage', fs.createReadStream(filePath));

        console.log('Sending Checkout Request...');
        const checkoutRes = await axios.post(`${BASE_URL}/api/client/checkout`, form, {
            headers: {
                Authorization: `Bearer ${clientToken}`,
                ...form.getHeaders()
            }
        });

        console.log('Checkout Response:', checkoutRes.data);

        if (checkoutRes.data.orderId) {
            console.log('✅ Checkout Successful! Order ID:', checkoutRes.data.orderId);
        } else {
            console.error('❌ Checkout Failed:', checkoutRes.data);
        }

        // Cleanup
        fs.unlinkSync(filePath);

    } catch (error) {
        console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
    }
}

runTest();
