const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
let authToken = '';
let templateId = '';

// Test credentials
const credentials = {
    email: 'admin@techaasvik.com',
    password: 'Admin@Techaasvik2026!',
};

async function login() {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, credentials);
        authToken = response.data.accessToken;
        console.log('✅ Login successful');
        return true;
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data || error.message);
        return false;
    }
}

async function testCreateTemplate() {
    try {
        const template = {
            name: 'welcome_message',
            description: 'Welcome message for new customers',
            category: 'MARKETING',
            language: 'en',
            headerText: 'Welcome to Techaasvik!',
            bodyText: 'Hello {{1}}, thank you for joining us! We are excited to have you.',
            footerText: 'Best regards, Techaasvik Team',
            buttons: ['Visit Website', 'Contact Support'],
            variables: {
                '1': 'Customer Name',
            },
        };

        const response = await axios.post(`${API_URL}/templates`, template, {
            headers: { Authorization: `Bearer ${authToken}` },
        });

        templateId = response.data.id;
        console.log('✅ Create Template:', response.data.name);
        return true;
    } catch (error) {
        console.error('❌ Create Template failed:', error.response?.data || error.message);
        return false;
    }
}

async function testGetTemplates() {
    try {
        const response = await axios.get(`${API_URL}/templates`, {
            headers: { Authorization: `Bearer ${authToken}` },
        });

        console.log(`✅ Get Templates: ${response.data.total} templates found`);
        return true;
    } catch (error) {
        console.error('❌ Get Templates failed:', error.response?.data || error.message);
        return false;
    }
}

async function testGetTemplate() {
    try {
        const response = await axios.get(`${API_URL}/templates/${templateId}`, {
            headers: { Authorization: `Bearer ${authToken}` },
        });

        console.log('✅ Get Template:', response.data.name);
        return true;
    } catch (error) {
        console.error('❌ Get Template failed:', error.response?.data || error.message);
        return false;
    }
}

async function testUpdateTemplate() {
    try {
        const update = {
            description: 'Updated welcome message for new customers',
            footerText: 'Warm regards, Techaasvik Team',
        };

        const response = await axios.patch(`${API_URL}/templates/${templateId}`, update, {
            headers: { Authorization: `Bearer ${authToken}` },
        });

        console.log('✅ Update Template:', response.data.description);
        return true;
    } catch (error) {
        console.error('❌ Update Template failed:', error.response?.data || error.message);
        return false;
    }
}

async function testGetStatistics() {
    try {
        const response = await axios.get(`${API_URL}/templates/statistics`, {
            headers: { Authorization: `Bearer ${authToken}` },
        });

        console.log('✅ Get Statistics:', JSON.stringify(response.data));
        return true;
    } catch (error) {
        console.error('❌ Get Statistics failed:', error.response?.data || error.message);
        return false;
    }
}

async function testSubmitTemplate() {
    try {
        const response = await axios.post(`${API_URL}/templates/${templateId}/submit`, {}, {
            headers: { Authorization: `Bearer ${authToken}` },
        });

        console.log('✅ Submit Template:', response.data.status);
        return true;
    } catch (error) {
        console.error('❌ Submit Template failed:', error.response?.data || error.message);
        return false;
    }
}

async function testSearchTemplates() {
    try {
        const response = await axios.get(`${API_URL}/templates?search=welcome`, {
            headers: { Authorization: `Bearer ${authToken}` },
        });

        console.log(`✅ Search Templates: ${response.data.total} results`);
        return true;
    } catch (error) {
        console.error('❌ Search Templates failed:', error.response?.data || error.message);
        return false;
    }
}

async function testFilterByStatus() {
    try {
        const response = await axios.get(`${API_URL}/templates?status=pending`, {
            headers: { Authorization: `Bearer ${authToken}` },
        });

        console.log(`✅ Filter by Status: ${response.data.total} pending templates`);
        return true;
    } catch (error) {
        console.error('❌ Filter by Status failed:', error.response?.data || error.message);
        return false;
    }
}

async function testGetApproved() {
    try {
        const response = await axios.get(`${API_URL}/templates/approved`, {
            headers: { Authorization: `Bearer ${authToken}` },
        });

        console.log(`✅ Get Approved Templates: ${response.data.length} templates`);
        return true;
    } catch (error) {
        console.error('❌ Get Approved Templates failed:', error.response?.data || error.message);
        return false;
    }
}

async function runAllTests() {
    console.log('\n🧪 TEMPLATES API TEST SUITE\n');
    console.log('='.repeat(50));

    const tests = [
        { name: 'Login', fn: login },
        { name: 'Create Template', fn: testCreateTemplate },
        { name: 'Get Templates', fn: testGetTemplates },
        { name: 'Get Template', fn: testGetTemplate },
        { name: 'Update Template', fn: testUpdateTemplate },
        { name: 'Get Statistics', fn: testGetStatistics },
        { name: 'Submit Template', fn: testSubmitTemplate },
        { name: 'Search Templates', fn: testSearchTemplates },
        { name: 'Filter by Status', fn: testFilterByStatus },
        { name: 'Get Approved', fn: testGetApproved },
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        const result = await test.fn();
        if (result) {
            passed++;
        } else {
            failed++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`\n📊 TEST RESULTS:`);
    console.log(`   ✅ Passed: ${passed}/${tests.length}`);
    console.log(`   ❌ Failed: ${failed}/${tests.length}`);

    if (failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! ✅\n');
    } else {
        console.log('\n⚠️  SOME TESTS FAILED\n');
    }
}

runAllTests();
