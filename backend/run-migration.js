const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'adotech_in',
        user: 'adotech_in',
        password: 'Techaasvik@2026!Secure',
    });

    try {
        console.log('🔌 Connecting to database...');
        await client.connect();
        console.log('✅ Connected to database successfully!');

        // Read the migration SQL file
        const sqlPath = path.join(__dirname, 'migrations', '002_campaigns.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📝 Running migration...');
        await client.query(sql);
        console.log('✅ Migration completed successfully!');

        // Verify the table was created
        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'campaigns'
            ORDER BY ordinal_position;
        `);

        console.log('\n📊 Campaigns table structure:');
        console.log('Columns:', result.rows.length);
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type})`);
        });

        // Check indexes
        const indexes = await client.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'campaigns';
        `);

        console.log('\n🔍 Indexes created:');
        indexes.rows.forEach(row => {
            console.log(`  - ${row.indexname}`);
        });

        console.log('\n🎉 Migration successful! The campaigns table is ready.');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
