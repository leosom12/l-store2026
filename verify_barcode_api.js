const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/products/barcode/0000',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer 1764327012125' // Using the token from previous logs/context if valid, or I might need to login again if it expired. 
        // Wait, the token in the previous curl command was just a guess or reused. 
        // I should probably use the reproduction script's login logic or just check the DB directly which I did.
        // Actually, let's try to use the token from the reproduction script output if possible, or just login first.
        // For simplicity, I'll use the login logic in this script.
    }
};

// Better approach: Login then fetch.
const axios = require('axios');

async function verify() {
    try {
        // 1. Login
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'djleocv.hotmail.com@gmail.com',
            password: 'admin123' // Assuming this is the admin creds from previous context
        });
        const token = loginRes.data.token;
        console.log('Login successful, token obtained.');

        // 2. Fetch product by barcode
        const res = await axios.get('http://localhost:3000/api/products/barcode/0000', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('API Response:', JSON.stringify(res.data, null, 2));

        if (res.data.image) {
            console.log('SUCCESS: Image field is present.');
        } else {
            console.log('FAILURE: Image field is MISSING.');
        }

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

verify();
