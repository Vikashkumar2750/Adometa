const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function testTenantLogin() {
    try {
        // First, create a tenant
        console.log('1. Logging in as super admin...');
        const adminLogin = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@techaasvik.com',
            password: 'Admin@Techaasvik2026!',
        });
        const adminToken = adminLogin.data.access_token;
        console.log('✅ Super admin logged in\n');

        // Create tenant
        console.log('2. Creating tenant...');
        const tenantEmail = `test${Date.now()}@example.com`;
        const tenantPassword = 'TestPass123!';

        const createTenant = await axios.post(`${API_URL}/tenants`, {
            business_name: `Test Business ${Date.now()}`,
            owner_name: 'Test Owner',
            owner_email: tenantEmail,
            password: tenantPassword,
        }, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        console.log('✅ Tenant created:', createTenant.data.id);
        console.log('   Email:', tenantEmail);
        console.log('   Password:', tenantPassword, '\n');

        // Login as tenant
        console.log('3. Logging in as tenant...');
        const tenantLogin = await axios.post(`${API_URL}/auth/login`, {
            email: tenantEmail,
            password: tenantPassword,
        });

        console.log('✅ Tenant logged in\n');
        console.log('Login Response:');
        console.log('User:', JSON.stringify(tenantLogin.data.user, null, 2));

        // Decode JWT
        const token = tenantLogin.data.access_token;
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        console.log('\nJWT Payload:');
        console.log(JSON.stringify(payload, null, 2));

        // Test contacts API
        console.log('\n4. Testing Contacts API...');
        try {
            const contacts = await axios.get(`${API_URL}/contacts`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log('✅ Contacts API works!');
            console.log('   Total:', contacts.data.total);
        } catch (error) {
            console.log('❌ Contacts API failed:', error.response?.data?.message || error.message);
        }

    } catch (error) {
        console.error('\n❌ Error:', error.response?.data || error.message);
    }
}

testTenantLogin();
