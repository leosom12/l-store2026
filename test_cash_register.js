const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'djleocv.hotmail.com@gmail.com'; // Default admin
const ADMIN_PASSWORD = 'admin123';

async function testCashRegister() {
    try {
        console.log('1. Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        const token = loginRes.data.token;
        console.log('   Login successful. Token obtained.');

        console.log('\n2. Checking Cash Register Status...');
        const statusRes = await axios.get(`${API_URL}/cash-register/status`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   Current Status:', statusRes.data);

        if (statusRes.data.status === 'open') {
            console.log('   Caixa already open. Test concluded.');
            return;
        }

        console.log('\n3. Opening Cash Register...');
        const openRes = await axios.post(`${API_URL}/cash-register/open`, {
            openingBalance: 150.00
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   Response:', openRes.data);

        console.log('\n4. Verifying Status After Opening...');
        const newStatusRes = await axios.get(`${API_URL}/cash-register/status`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   New Status:', newStatusRes.data);

        if (newStatusRes.data.status === 'open' && newStatusRes.data.openingBalance === 150) {
            console.log('\n✅ TEST PASSED: Cash register opened successfully.');
        } else {
            console.error('\n❌ TEST FAILED: Status mismatch.');
        }

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.response ? error.response.data : error.message);
    }
}

testCashRegister();
