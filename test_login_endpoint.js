const axios = require('axios');

async function testLogin() {
    try {
        const response = await axios.post('http://localhost:3000/api/login', {
            email: 'test@example.com',
            password: 'password'
        });
        console.log('Response:', response.status, response.data);
    } catch (error) {
        if (error.response) {
            console.log('Error Response:', error.response.status, error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

testLogin();
