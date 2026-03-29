const { Client } = require('pg');

async function checkSuperAdmin() {
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

        // Check if super admin exists
        console.log('📊 Checking for super admin with ID 00000000-0000-0000-0000-000000000000:');
        const result = await client.query(`
            SELECT * FROM super_admins 
            WHERE id = '00000000-0000-0000-0000-000000000000';
        `);

        if (result.rows.length > 0) {
            console.log('✅ Super admin exists:');
            console.table(result.rows);
        } else {
            console.log('❌ Super admin does NOT exist!');
            console.log('\n📝 Creating super admin...');

            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash('Admin@Techaasvik2026!', 10);

            await client.query(`
                INSERT INTO super_admins (id, email, password_hash, name, role, is_active)
                VALUES (
                    '00000000-0000-0000-0000-000000000000',
                    'admin@techaasvik.com',
                    $1,
                    'System Super Admin',
                    'SUPER_ADMIN',
                    true
                )
                ON CONFLICT (email) DO UPDATE
                SET id = '00000000-0000-0000-0000-000000000000';
            `, [hashedPassword]);

            console.log('✅ Super admin created successfully!');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await client.end();
    }
}

checkSuperAdmin();
