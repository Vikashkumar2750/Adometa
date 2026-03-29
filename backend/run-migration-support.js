// Run: node run-migration-support.js
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    await client.connect();
    console.log('✅ Connected to database');

    const sql = fs.readFileSync(path.join(__dirname, 'migrations', 'add-support-tables.sql'), 'utf8');
    await client.query(sql);
    console.log('✅ Support tables migration complete!');

    await client.end();
}

run().catch(err => { console.error('❌ Migration failed:', err.message); process.exit(1); });
