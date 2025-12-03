const axios = require('axios');

const loginUrl = 'http://localhost:3000/api/login';
const credentials = {
    email: 'djleocv.hotmail.com@gmail.com',
    password: 'admin123'
};

console.log(`Attempting login to ${loginUrl} with email: ${credentials.email}`);

axios.post(loginUrl, credentials)
    .then(response => {
        console.log('Login Successful!');
        console.log('Token:', response.data.token ? 'Received' : 'Missing');
        console.log('User:', JSON.stringify(response.data.user, null, 2));
    })
    .catch(error => {
        console.error('Login Failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    });
