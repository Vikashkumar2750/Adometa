const { Client } = require('pg');

async function checkSchema() {
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

        // Check super_admins table structure
        console.log('📊 SUPER_ADMINS TABLE STRUCTURE:');
        const superAdminsColumns = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'super_admins'
            ORDER BY ordinal_position;
        `);
        console.table(superAdminsColumns.rows);

        // Check tenant_users table structure
        console.log('\n📊 TENANT_USERS TABLE STRUCTURE:');
        const tenantUsersColumns = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'tenant_users'
            ORDER BY ordinal_position;
        `);
        console.table(tenantUsersColumns.rows);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

checkSchema();
