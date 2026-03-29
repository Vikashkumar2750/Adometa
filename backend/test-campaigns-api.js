const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testCampaignsAPI() {
    let campaignId = null;

    try {
        log('cyan', '\n🧪 TESTING CAMPAIGNS API\n');
        log('cyan', '='.repeat(50));

        // Test 1: Create Campaign
        log('blue', '\n📝 Test 1: Create Campaign');
        const createResponse = await axios.post(`${API_BASE_URL}/campaigns`, {
            name: 'Summer Sale 2024',
            description: 'Promotional campaign for summer sale',
            templateId: 'template-123',
            segmentId: 'segment-456',
        });
        campaignId = createResponse.data.id;
        log('green', `✅ Campaign created successfully!`);
        log('yellow', `   ID: ${campaignId}`);
        log('yellow', `   Name: ${createResponse.data.name}`);
        log('yellow', `   Status: ${createResponse.data.status}`);

        // Test 2: Get Campaign by ID
        log('blue', '\n📖 Test 2: Get Campaign by ID');
        const getResponse = await axios.get(`${API_BASE_URL}/campaigns/${campaignId}`);
        log('green', `✅ Campaign retrieved successfully!`);
        log('yellow', `   Name: ${getResponse.data.name}`);
        log('yellow', `   Description: ${getResponse.data.description}`);

        // Test 3: List Campaigns
        log('blue', '\n📋 Test 3: List All Campaigns');
        const listResponse = await axios.get(`${API_BASE_URL}/campaigns?page=1&limit=10`);
        log('green', `✅ Campaigns listed successfully!`);
        log('yellow', `   Total: ${listResponse.data.total}`);
        log('yellow', `   Page: ${listResponse.data.page}`);
        log('yellow', `   Campaigns: ${listResponse.data.data.length}`);

        // Test 4: Update Campaign
        log('blue', '\n✏️  Test 4: Update Campaign');
        const updateResponse = await axios.patch(`${API_BASE_URL}/campaigns/${campaignId}`, {
            name: 'Updated Summer Sale 2024',
            description: 'Updated description for summer sale',
        });
        log('green', `✅ Campaign updated successfully!`);
        log('yellow', `   New Name: ${updateResponse.data.name}`);

        // Test 5: Get Statistics
        log('blue', '\n📊 Test 5: Get Campaign Statistics');
        const statsResponse = await axios.get(`${API_BASE_URL}/campaigns/statistics`);
        log('green', `✅ Statistics retrieved successfully!`);
        log('yellow', `   Total Campaigns: ${statsResponse.data.totalCampaigns}`);
        log('yellow', `   Active Campaigns: ${statsResponse.data.activeCampaigns}`);
        log('yellow', `   Total Messages Sent: ${statsResponse.data.totalMessagesSent}`);

        // Test 6: Start Campaign
        log('blue', '\n▶️  Test 6: Start Campaign');
        const startResponse = await axios.post(`${API_BASE_URL}/campaigns/${campaignId}/start`);
        log('green', `✅ Campaign started successfully!`);
        log('yellow', `   Status: ${startResponse.data.status}`);
        log('yellow', `   Started At: ${startResponse.data.startedAt}`);

        // Test 7: Pause Campaign
        log('blue', '\n⏸️  Test 7: Pause Campaign');
        const pauseResponse = await axios.post(`${API_BASE_URL}/campaigns/${campaignId}/pause`);
        log('green', `✅ Campaign paused successfully!`);
        log('yellow', `   Status: ${pauseResponse.data.status}`);

        // Test 8: Resume Campaign
        log('blue', '\n▶️  Test 8: Resume Campaign');
        const resumeResponse = await axios.post(`${API_BASE_URL}/campaigns/${campaignId}/resume`);
        log('green', `✅ Campaign resumed successfully!`);
        log('yellow', `   Status: ${resumeResponse.data.status}`);

        // Test 9: Search Campaigns
        log('blue', '\n🔍 Test 9: Search Campaigns');
        const searchResponse = await axios.get(`${API_BASE_URL}/campaigns?search=summer`);
        log('green', `✅ Search completed successfully!`);
        log('yellow', `   Results: ${searchResponse.data.data.length}`);

        // Test 10: Filter by Status
        log('blue', '\n🔍 Test 10: Filter by Status');
        const filterResponse = await axios.get(`${API_BASE_URL}/campaigns?status=running`);
        log('green', `✅ Filter completed successfully!`);
        log('yellow', `   Running Campaigns: ${filterResponse.data.data.length}`);

        // Summary
        log('cyan', '\n' + '='.repeat(50));
        log('green', '\n🎉 ALL TESTS PASSED! ✅');
        log('cyan', '\n📊 Test Summary:');
        log('yellow', '   ✅ Create Campaign');
        log('yellow', '   ✅ Get Campaign');
        log('yellow', '   ✅ List Campaigns');
        log('yellow', '   ✅ Update Campaign');
        log('yellow', '   ✅ Get Statistics');
        log('yellow', '   ✅ Start Campaign');
        log('yellow', '   ✅ Pause Campaign');
        log('yellow', '   ✅ Resume Campaign');
        log('yellow', '   ✅ Search Campaigns');
        log('yellow', '   ✅ Filter Campaigns');
        log('cyan', '\n' + '='.repeat(50));

        log('green', '\n✨ Campaigns API is fully functional!');
        log('blue', `\n🔗 Campaign ID for manual testing: ${campaignId}`);

    } catch (error) {
        log('red', '\n❌ TEST FAILED!');
        if (error.response) {
            log('red', `   Status: ${error.response.status}`);
            log('red', `   Message: ${JSON.stringify(error.response.data, null, 2)}`);
        } else if (error.request) {
            log('red', `   No response received from server`);
            log('red', `   Check if backend is running on http://localhost:3001`);
            log('red', `   Error: ${error.message}`);
        } else {
            log('red', `   Error: ${error.message}`);
            log('red', `   Stack: ${error.stack}`);
        }
        process.exit(1);
    }
}

// Run tests
testCampaignsAPI();
