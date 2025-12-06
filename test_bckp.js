const axios = require('axios');

async function testBackup() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post('http://localhost:3000/api/login', {
            email: 'djleocv.hotmail.com@gmail.com',
            password: 'admin123'
        });
        const token = loginRes.data.token;
        console.log('Login successful. Token acquired.');

        // 2. Request Backup
        console.log('Requesting backup...');
        const backupRes = await axios.get('http://localhost:3000/api/backup', {
            headers: { 'Authorization': `Bearer ${token}` },
            responseType: 'arraybuffer' // Expect binary data
        });

        console.log('Backup Status:', backupRes.status);
        console.log('Headers:', backupRes.headers);
        console.log('Data Length:', backupRes.data.length);
        console.log('SUCCESS: Backup route is working from script.');

    } catch (error) {
        if (error.response) {
            console.error('FAILED: Server responded with:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('FAILED: Network/Other Error:', error.message);
        }
    }
}

testBackup();
