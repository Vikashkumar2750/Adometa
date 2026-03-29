const { Client } = require('pg');

async function addRoleColumn() {
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

        // Add role column to super_admins
        console.log('📝 Adding role column to super_admins table...');

        await client.query(`
            ALTER TABLE super_admins 
            ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'SUPER_ADMIN';
        `);

        console.log('✅ Role column added successfully');

        // Update existing records to have SUPER_ADMIN role
        console.log('\n📝 Updating existing super admins with SUPER_ADMIN role...');

        const result = await client.query(`
            UPDATE super_admins 
            SET role = 'SUPER_ADMIN' 
            WHERE role IS NULL;
        `);

        console.log(`✅ Updated ${result.rowCount} records`);

        // Verify the change
        console.log('\n📊 Verifying super_admins table structure:');
        const columns = await client.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'super_admins'
            ORDER BY ordinal_position;
        `);
        console.table(columns.rows);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await client.end();
    }
}

addRoleColumn();
