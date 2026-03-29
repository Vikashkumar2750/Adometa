const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function createContactsTable() {
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

        // Read SQL file
        const sql = fs.readFileSync(path.join(__dirname, 'create-contacts-table.sql'), 'utf8');

        // Execute SQL
        await client.query(sql);
        console.log('✅ Contacts table created successfully!');

        // Verify table exists
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'contacts'
        `);

        if (result.rows.length > 0) {
            console.log('✅ Verified: contacts table exists');

            // Check indexes
            const indexes = await client.query(`
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename = 'contacts'
            `);
            console.log(`✅ Created ${indexes.rows.length} indexes:`, indexes.rows.map(r => r.indexname));
        } else {
            console.log('❌ Table creation failed');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

createContactsTable();
