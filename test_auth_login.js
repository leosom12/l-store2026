const axios = require('axios');

async function testAuthLogin() {
    try {
        console.log('Testing /api/auth/login...');
        const response = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'djleocv.hotmail.com@gmail.com', // Admin email from server.js
            password: '123456' // Updated password from set_admin_user.js
        });
        console.log('Response Status:', response.status);
        console.log('Response Data:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('Error Response:', error.response.status, error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

testAuthLogin();
