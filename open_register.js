const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'djleocv.hotmail.com@gmail.com';
const ADMIN_PASSWORD = 'admin123';

async function openCashRegister() {
    try {
        // 1. Login
        console.log('🔑 Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        const token = loginRes.data.token;
        console.log('✅ Login successful!');

        // 2. Check Status
        console.log('🔍 Checking cash register status...');
        const statusRes = await axios.get(`${API_URL}/cash-register/status`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (statusRes.data.status === 'open') {
            console.log('✅ Cash register is ALREADY OPEN.');
            console.log('Session ID:', statusRes.data.id);
            console.log('Opening Balance:', statusRes.data.openingBalance);
        } else {
            console.log('⚠️ Cash register is CLOSED.');
            console.log('🔓 Opening cash register with R$ 100.00...');

            const openRes = await axios.post(`${API_URL}/cash-register/open`, {
                openingBalance: 100.00
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('✅ Cash register OPENED successfully!');
            console.log('Session ID:', openRes.data.id);
        }

    } catch (error) {
        console.error('❌ Error:', error.response ? error.response.data : error.message);
    }
}

openCashRegister();
