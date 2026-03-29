const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
let authToken = '';

// Super Admin credentials
const credentials = {
    email: 'admin@techaasvik.com',
    password: 'Admin@Techaasvik2026!',
};

async function login() {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, credentials);
        authToken = response.data.accessToken;
        console.log('✅ Super Admin login successful');
        return true;
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data || error.message);
        return false;
    }
}

async function createTenant() {
    try {
        const tenantData = {
            business_name: 'Test Company ' + Date.now(),
            owner_name: 'Test Owner',
            owner_email: `test${Date.now()}@example.com`,
            password: 'SecurePass123!',
            timezone: 'UTC',
            locale: 'en'
        };

        const response = await axios.post(`${API_URL}/tenants`, tenantData, {
            headers: { Authorization: `Bearer ${authToken}` },
        });

        console.log('✅ Tenant created successfully!');
        console.log('   Business Name:', response.data.business_name);
        console.log('   Owner Email:', response.data.owner_email);
        console.log('   Status:', response.data.status);
        console.log('   Tenant ID:', response.data.id);
        return response.data;
    } catch (error) {
        console.error('❌ Tenant creation failed:', error.response?.data || error.message);
        return null;
    }
}

async function testTenantLogin(email, password) {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            email,
            password
        });

        console.log('✅ Tenant admin login successful!');
        console.log('   Email:', email);
        console.log('   Role:', response.data.user.role);
        return true;
    } catch (error) {
        console.error('❌ Tenant login failed:', error.response?.data || error.message);
        return false;
    }
}

async function runTest() {
    console.log('\n🧪 TENANT CREATION TEST WITH PASSWORD\n');
    console.log('='.repeat(50));

    // Step 1: Login as Super Admin
    const loginSuccess = await login();
    if (!loginSuccess) {
        console.log('\n❌ Test failed: Could not login as Super Admin');
        return;
    }

    // Step 2: Create Tenant with Password
    const tenant = await createTenant();
    if (!tenant) {
        console.log('\n❌ Test failed: Could not create tenant');
        return;
    }

    // Step 3: Test Tenant Admin Login with the password we set
    console.log('\n📝 Testing tenant admin login...');
    const tenantLoginSuccess = await testTenantLogin(tenant.owner_email, 'SecurePass123!');

    console.log('\n' + '='.repeat(50));
    if (tenantLoginSuccess) {
        console.log('\n🎉 ALL TESTS PASSED! ✅');
        console.log('   ✅ Tenant creation with password works');
        console.log('   ✅ Tenant admin can login with the password');
    } else {
        console.log('\n⚠️  PARTIAL SUCCESS');
        console.log('   ✅ Tenant created');
        console.log('   ❌ Tenant login failed');
    }
}

runTest();
