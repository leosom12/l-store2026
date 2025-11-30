const axios = require('axios');

async function testRegistration() {
    const url = 'http://localhost:3000/api/auth/register';
    const userData = {
        username: 'TestUser_' + Date.now(),
        email: 'test_' + Date.now() + '@example.com',
        password: 'password123',
        cpf: '12345678900'
    };

    console.log('Attempting to register with:', userData);

    try {
        const response = await axios.post(url, userData);
        console.log('Registration Successful:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('Registration Failed:', error.response.status, error.response.data);
        } else {
            console.error('Registration Error:', error.message);
        }
    }
}

testRegistration();
