const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'adotech_in',
    user: 'adotech_in',
    password: 'Techaasvik@2026!Secure',
});

async function run() {
    await client.connect();
    console.log('Connected to database');

    const sql = fs.readFileSync(
        path.join(__dirname, 'migrations', '004_templates_media_columns.sql'),
        'utf8'
    );

    try {
        await client.query(sql);
        console.log('✅ Migration 004 applied successfully');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await client.end();
        console.log('Done');
    }
}

run().catch(console.error);
