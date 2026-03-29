const axios = require('axios');

async function detailedTest() {
    try {
        console.log('🧪 Detailed API Test\n');

        // Test 1: List campaigns (the failing one)
        console.log('1. Testing GET /api/campaigns...');
        try {
            const listRes = await axios.get('http://localhost:3001/api/campaigns');
            console.log('✅ Success!');
            console.log('   Total:', listRes.data.total);
            console.log('   Data:', JSON.stringify(listRes.data, null, 2));
        } catch (error) {
            console.log('❌ Failed');
            console.log('   Status:', error.response?.status);
            console.log('   Error:', error.response?.data);

            // Try with explicit parameters
            console.log('\n2. Trying with explicit parameters...');
            try {
                const listRes2 = await axios.get('http://localhost:3001/api/campaigns?page=1&limit=10');
                console.log('✅ Success with params!');
                console.log('   Total:', listRes2.data.total);
            } catch (error2) {
                console.log('❌ Still failed');
                console.log('   Error:', error2.response?.data);
            }
        }

    } catch (error) {
        console.error('\n❌ Unexpected error:', error.message);
    }
}

detailedTest();
