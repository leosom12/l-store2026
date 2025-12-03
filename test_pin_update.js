const axios = require('axios');

async function testPinUpdate() {
    try {
        // 1. Login as Admin to get token
        console.log('1. Logging in as Admin...');
        const loginRes = await axios.post('http://localhost:3000/api/login', {
            email: 'djleocv.hotmail.com@gmail.com',
            password: '123456' // Reset password
        });
        const token = loginRes.data.token;
        console.log('Login Success, Token received.');

        // 2. Update PIN
        const newPin = '9999';
        console.log(`2. Updating PIN to ${newPin}...`);
        const updateRes = await axios.put('http://localhost:3000/api/settings/pin',
            { pin: newPin },
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        console.log('Update Response:', updateRes.data);

        // 3. Verify Login with New PIN (Client Side)
        console.log('3. Verifying Client Login with New PIN...');
        const clientLoginRes = await axios.post('http://localhost:3000/api/client/login', {
            name: 'Test Client',
            pin: newPin
        });
        console.log('Client Login Success:', clientLoginRes.status);

    } catch (error) {
        if (error.response) {
            console.log('Error Response:', error.response.status, error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

testPinUpdate();
