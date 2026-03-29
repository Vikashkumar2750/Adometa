const axios = require('axios');

async function quickTest() {
    try {
        console.log('🧪 Quick API Test\n');

        // Test 1: Create Campaign
        console.log('1. Creating campaign...');
        const createRes = await axios.post('http://localhost:3001/api/campaigns', {
            name: 'Test Campaign',
            description: 'Quick test',
            templateId: 'template-1',
            segmentId: 'segment-1',
        });
        console.log('✅ Created:', createRes.data.id);
        const campaignId = createRes.data.id;

        // Test 2: List Campaigns
        console.log('\n2. Listing campaigns...');
        const listRes = await axios.get('http://localhost:3001/api/campaigns');
        console.log('✅ Total campaigns:', listRes.data.total);
        console.log('   Campaigns:', listRes.data.data.length);

        // Test 3: Get Statistics
        console.log('\n3. Getting statistics...');
        const statsRes = await axios.get('http://localhost:3001/api/campaigns/statistics');
        console.log('✅ Stats:', JSON.stringify(statsRes.data, null, 2));

        console.log('\n🎉 Basic tests passed!');
        console.log(`\n📝 Campaign ID: ${campaignId}`);

    } catch (error) {
        console.error('\n❌ Error:', error.response?.data || error.message);
    }
}

quickTest();
