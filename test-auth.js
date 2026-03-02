const http = require('http');

const data = JSON.stringify({
    email: 'creador@misaas.com',
    password: 'admin'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login/global',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, res => {
    let body = '';
    res.on('data', d => {
        body += d;
    });
    res.on('end', () => {
        console.log(`Status code: ${res.statusCode}`);
        console.log(`Response body: ${body}`);
    });
});

req.on('error', error => {
    console.error(error);
});

req.write(data);
req.end();
