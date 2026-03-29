const { Client } = require('pg');

async function checkDatabase() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'adotech_in',
        user: 'adotech_in',
        password: 'Techaasvik@2026!Secure',
    });

    try {
        await client.connect();
        console.log('✅ Connected to database\n');

        // Check campaigns table
        const result = await client.query('SELECT * FROM campaigns LIMIT 5');
        console.log(`📊 Found ${result.rows.length} campaigns:`);
        result.rows.forEach((row, i) => {
            console.log(`\n${i + 1}. ${row.name}`);
            console.log(`   ID: ${row.id}`);
            console.log(`   Tenant: ${row.tenantId}`);
            console.log(`   Status: ${row.status}`);
        });

        // Check column names
        const columns = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'campaigns'
            ORDER BY ordinal_position
        `);
        console.log(`\n📋 Column names:`);
        columns.rows.forEach(col => {
            console.log(`   - ${col.column_name}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

checkDatabase();
