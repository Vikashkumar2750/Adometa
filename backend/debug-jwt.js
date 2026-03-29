const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function quickDebug() {
    try {
        // Login as super admin
        const login = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@techaasvik.com',
            password: 'Admin@Techaasvik2026!',
        });

        console.log('Login Response:');
        console.log('Token:', login.data.access_token.substring(0, 30) + '...');
        console.log('User:', JSON.stringify(login.data.user, null, 2));

        // Decode the JWT to see what's inside
        const token = login.data.access_token;
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        console.log('\nJWT Payload:');
        console.log(JSON.stringify(payload, null, 2));

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

quickDebug();
