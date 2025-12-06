const https = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/health',
    method: 'GET'
};

const req = https.request(options, res => {
    console.log(`StatusCode: ${res.statusCode}`);
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        console.log('Body:', data);
    });
});

req.on('error', error => {
    console.error('Error:', error);
});

req.end();
