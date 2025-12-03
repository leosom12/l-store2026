const axios = require('axios');

async function testClientLogin() {
    try {
        console.log('1. Testing Client Login (New Client)...');
        const loginRes = await axios.post('http://localhost:3000/api/client/login', {
            name: 'Ghost Client',
            pin: '1234' // Seller PIN (Admin's PIN)
        });
        console.log('Login Success:', loginRes.status);
        console.log('Token:', loginRes.data.token ? 'Received' : 'Missing');

        const token = loginRes.data.token;

        console.log('\n2. Testing Product Fetch with Client Token...');
        const productsRes = await axios.get('http://localhost:3000/api/products', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Products Fetch Success:', productsRes.status);
        console.log('Products Found:', productsRes.data.length);
        if (productsRes.data.length > 0) {
            console.log('Sample Product:', productsRes.data[0].name, '| Owner:', productsRes.data[0].ownerName);
        }

    } catch (error) {
        if (error.response) {
            console.log('Error Response:', error.response.status, error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

testClientLogin();
