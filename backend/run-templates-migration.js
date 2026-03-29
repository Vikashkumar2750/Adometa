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
        await client.connect();
        console.log('✅ Connected to database');

        // Read migration file
        const migrationPath = path.join(__dirname, 'migrations', '003_templates.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('📝 Running migration: 003_templates.sql');

        // Execute migration
        await client.query(sql);

        console.log('✅ Migration completed successfully!');
        console.log('📊 Templates table created with indexes and constraints');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
