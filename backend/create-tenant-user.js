/**
 * Creates a tenant admin user for the first active tenant.
 */
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({
    connectionString: 'postgresql://adotech_in:Techaasvik%402026%21Secure@localhost:5432/adotech_in',
});

const TENANT_ID = '1bd30149-2497-460d-9a9f-712d046da12b';

async function main() {
    await client.connect();
    console.log('Connected!');

    // Check existing users for this tenant
    const existing = await client.query(
        'SELECT id, email, role FROM tenant_users WHERE tenant_id = $1',
        [TENANT_ID]
    );
    console.log('Existing users:', JSON.stringify(existing.rows));

    if (existing.rows.length > 0) {
        console.log('✅ Tenant user already exists:', existing.rows[0].email);
        console.log('\nLogin credentials for the DASHBOARD:');
        console.log('  Email:', existing.rows[0].email);
        console.log('  Password: (use the password you set when creating the tenant)');
        console.log('\nOR update the password:');
        await client.end();
        return;
    }

    // Create tenant admin user
    const hash = await bcrypt.hash('Admin@123', 10);
    await client.query(`
        INSERT INTO tenant_users (tenant_id, email, password_hash, name, role, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
    `, [TENANT_ID, 'tenant@techaasvik.com', hash, 'Tenant Admin', 'TENANT_ADMIN']);

    console.log('✅ Created tenant user!');
    console.log('\nDashboard login credentials:');
    console.log('  Email: tenant@techaasvik.com');
    console.log('  Password: Admin@123');

    await client.end();
}

main().catch(e => { console.error('ERROR:', e.message); client.end(); });
