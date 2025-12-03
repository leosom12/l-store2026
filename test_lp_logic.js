const axios = require('axios');

async function testLPLogic() {
    try {
        // 1. Login as Admin
        console.log('1. Logging in as Admin...');
        const adminLogin = await axios.post('http://localhost:3000/api/login', {
            email: 'djleocv.hotmail.com@gmail.com',
            password: '123456'
        });
        const adminToken = adminLogin.data.token;
        console.log('Admin Token Received.');

        // 1.5 Update Admin PIN to unique value
        console.log('1.5 Updating Admin PIN to 9999...');
        await axios.put('http://localhost:3000/api/settings/pin', {
            pin: '9999'
        }, { headers: { 'Authorization': `Bearer ${adminToken}` } });
        console.log('Admin PIN Updated.');

        // 2. Create Product with LP
        console.log('2. Creating Product with 50 LP...');
        const productRes = await axios.post('http://localhost:3000/api/products', {
            barcode: 'LP_TEST_' + Date.now(),
            name: 'LP Test Product',
            category: 'Geral',
            price: 10.00,
            stock: 100,
            icon: '⭐',
            loyalty_points: 50
        }, { headers: { 'Authorization': `Bearer ${adminToken}` } });
        const productId = productRes.data.id;
        console.log(`Product Created: ID ${productId}`);

        // 3. Login as Client
        console.log('3. Logging in as Client...');
        const clientLogin = await axios.post('http://localhost:3000/api/client/login', {
            name: 'LP Client',
            pin: '9999' // Updated Admin PIN
        });
        const clientToken = clientLogin.data.token;
        const clientId = clientLogin.data.client.id;
        console.log(`Client Logged In: ID ${clientId}`);

        // 4. Checkout (Buy 2 items = 100 LP)
        console.log('4. Checking out (2 items)...');
        const checkoutRes = await axios.post('http://localhost:3000/api/client/checkout', {
            clientId: clientId,
            items: [{ id: productId, quantity: 2, price: 10.00 }],
            total: 20.00,
            paymentMethod: 'pix'
        }, { headers: { 'Authorization': `Bearer ${clientToken}` } });

        console.log('Checkout Result:', checkoutRes.data);
        if (checkoutRes.data.earnedLP === 100) {
            console.log('SUCCESS: Earned 100 LP!');
        } else {
            console.log(`FAILURE: Earned ${checkoutRes.data.earnedLP} LP (Expected 100)`);
        }

    } catch (error) {
        if (error.response) {
            console.log('Error Response:', error.response.status, error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

testLPLogic();
