const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'djleocv.hotmail.com@gmail.com';
const ADMIN_PASSWORD = 'admin123';

async function runTest() {
    try {
        console.log('1. Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        const token = loginRes.data.token;
        console.log('Login successful. Token obtained.');

        console.log('2. Creating a product...');
        const productData = {
            barcode: 'TEST-' + Date.now(),
            name: 'Test Product ' + Date.now(),
            category: 'Test',
            price: 10.50,
            stock: 100,
            icon: '🧪'
        };
        const createRes = await axios.post(`${API_URL}/products`, productData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Product created. ID:', createRes.data.id);

        console.log('3. Listing products...');
        const listRes = await axios.get(`${API_URL}/products`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const products = listRes.data;
        console.log(`Fetched ${products.length} products.`);

        const found = products.find(p => p.barcode === productData.barcode);
        if (found) {
            console.log('SUCCESS: Created product found in the list.');
            console.log(found);
        } else {
            console.error('FAILURE: Created product NOT found in the list.');
        }

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

runTest();
