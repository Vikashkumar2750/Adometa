/**
 * Resets the tenant admin password to Admin@123
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

    const hash = await bcrypt.hash('Admin@123', 10);

    // Reset password for existing user
    const r1 = await client.query(
        `UPDATE tenant_users SET password_hash = $1, is_active = true 
         WHERE tenant_id = $2 
         RETURNING id, email, role`,
        [hash, TENANT_ID]
    );
    console.log('Updated users:', JSON.stringify(r1.rows));

    // Also create a clean known-email user if none
    const clean = await client.query(
        `SELECT id FROM tenant_users WHERE email = 'tenant@techaasvik.com'`
    );
    if (clean.rows.length === 0) {
        await client.query(`
            INSERT INTO tenant_users (tenant_id, email, password_hash, name, role, is_active)
            VALUES ($1, 'tenant@techaasvik.com', $2, 'Tenant Admin', 'TENANT_ADMIN', true)
        `, [TENANT_ID, hash]);
        console.log('✅ Created fresh user: tenant@techaasvik.com');
    } else {
        await client.query(
            `UPDATE tenant_users SET password_hash = $1, tenant_id = $2, is_active = true WHERE email = 'tenant@techaasvik.com'`,
            [hash, TENANT_ID]
        );
        console.log('✅ Updated tenant@techaasvik.com');
    }

    console.log('\n=== DASHBOARD LOGIN ===');
    console.log('Email:    tenant@techaasvik.com');
    console.log('Password: Admin@123');
    console.log('URL:      http://localhost:3000/login');
    console.log('\nAfter login you will be redirected to /dashboard');
    console.log('Segment creation will work because this is a TENANT_ADMIN account.');

    await client.end();
}

main().catch(e => { console.error('ERROR:', e.message); client.end(); });
