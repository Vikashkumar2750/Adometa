/**
 * Seeds a default tenant and tenant admin user if none exist.
 * Run with: node seed-tenant.js
 */
const { Client } = require('pg');
const bcrypt = require('bcrypt');

// Use connection string to avoid @ parsing issues with password
const client = new Client({
    connectionString: 'postgresql://adotech_in:Techaasvik%402026%21Secure@localhost:5432/adotech_in',
});

async function main() {
    await client.connect();
    console.log('Connected!');

    // 1. Check existing tenants
    const existing = await client.query('SELECT id, business_name, status FROM tenants LIMIT 5');
    console.log('Existing tenants:', JSON.stringify(existing.rows));

    if (existing.rows.length > 0) {
        const tenantId = existing.rows[0].id;
        console.log('✅ Tenant already exists:', tenantId);
        console.log('\n=== USE THIS ID IN BROWSER ===');
        console.log('Open browser console and run:');
        console.log(`localStorage.setItem('activeTenantId', '${tenantId}')`);
        console.log('Then refresh the page and try creating a segment again.');
        await client.end();
        return;
    }

    // 2. Check tenant_users table columns
    const cols = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'tenant_users' 
        ORDER BY ordinal_position
    `);
    console.log('tenant_users columns:', cols.rows.map(r => r.column_name).join(', '));

    const tenantCols = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'tenants' 
        ORDER BY ordinal_position
    `);
    console.log('tenants columns:', tenantCols.rows.map(r => r.column_name).join(', '));

    // 3. Create a default tenant
    const tenantResult = await client.query(`
        INSERT INTO tenants (business_name, owner_name, owner_email, status, plan, timezone, locale)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
    `, ['Techaasvik Demo', 'Admin User', 'admin@techaasvik.com', 'ACTIVE', 'PROFESSIONAL', 'Asia/Kolkata', 'en']);

    const tenantId = tenantResult.rows[0].id;
    console.log('✅ Created tenant:', tenantId);

    // 4. Create admin user for this tenant
    const hash = await bcrypt.hash('Admin@123', 10);
    await client.query(`
        INSERT INTO tenant_users (email, password_hash, name, role, tenant_id, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (email) DO UPDATE SET tenant_id = $5, is_active = true
    `, ['tenant@techaasvik.com', hash, 'Tenant Admin', 'TENANT_ADMIN', tenantId]);

    console.log('✅ Created tenant user: tenant@techaasvik.com / Admin@123');

    console.log('\n=== USE THIS ID IN BROWSER ===');
    console.log('Open browser console and run:');
    console.log(`localStorage.setItem('activeTenantId', '${tenantId}')`);
    console.log('Then refresh the page and try creating a segment again.');

    await client.end();
}

main().catch(e => {
    console.error('ERROR:', e.message, e.stack?.split('\n').slice(0, 3).join('\n'));
    client.end();
});
