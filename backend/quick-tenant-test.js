const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function quickTest() {
    try {
        // Test 1: Health check
        console.log('1. Testing API health...');
        const health = await axios.get(`${API_URL}`);
        console.log('   ✅ API is responding');

        // Test 2: Login
        console.log('\n2. Testing login...');
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@techaasvik.com',
            password: 'Admin@Techaasvik2026!',
        });
        console.log('   ✅ Login successful');

        const token = loginResponse.data.access_token || loginResponse.data.accessToken;
        if (!token) {
            throw new Error('No token received from login');
        }

        console.log('   Token:', token.substring(0, 20) + '...');
        console.log('   User:', loginResponse.data.user?.email || 'N/A');
        console.log('   Role:', loginResponse.data.user?.role || 'N/A');

        // Test 3: Create tenant with password
        console.log('\n3. Testing tenant creation with password...');
        const tenantData = {
            business_name: 'Quick Test Company ' + Date.now(),
            owner_name: 'Quick Test Owner',
            owner_email: `quicktest${Date.now()}@example.com`,
            password: 'SecurePass123!',
        };

        const tenantResponse = await axios.post(`${API_URL}/tenants`, tenantData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });

        console.log('   ✅ Tenant created!');
        console.log('   ID:', tenantResponse.data.id);
        console.log('   Business:', tenantResponse.data.business_name);
        console.log('   Email:', tenantResponse.data.owner_email);
        console.log('   Status:', tenantResponse.data.status);

        // Test 4: Login as tenant admin
        console.log('\n4. Testing tenant admin login...');
        const tenantLoginResponse = await axios.post(`${API_URL}/auth/login`, {
            email: tenantData.owner_email,
            password: tenantData.password,
        });
        console.log('   ✅ Tenant admin login successful!');
        console.log('   Email:', tenantLoginResponse.data.user.email);
        console.log('   Role:', tenantLoginResponse.data.user.role);

        console.log('\n🎉 ALL TESTS PASSED! ✅\n');

    } catch (error) {
        console.error('\n❌ Error:', error.response?.data || error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

quickTest();
