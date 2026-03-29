const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

const c = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function run() {
    await c.connect();
    
    // Show all tenant users
    const r = await c.query('SELECT id, email, name, role, is_active FROM tenant_users ORDER BY created_at DESC LIMIT 10');
    console.log('\n=== All Tenant Users ===');
    r.rows.forEach(u => console.log(`${u.email} | name:"${u.name}" | role:${u.role} | active:${u.is_active}`));
    
    // Fix broken name for demo1
    const fix = await c.query(
        "UPDATE tenant_users SET name = $1 WHERE email = $2 AND (name IS NULL OR name = '' OR name LIKE '%-%-%-%') RETURNING email, name",
        ['Demo User 1', 'demo1@techaasvik.com']
    );
    if (fix.rows.length > 0) {
        console.log('\n✅ Fixed name:', fix.rows[0]);
    } else {
        console.log('\nℹ️  No name update needed for demo1');
    }

    // Show tenants
    const t = await c.query('SELECT id, business_name, owner_email, owner_name, status FROM tenants ORDER BY created_at DESC LIMIT 5');
    console.log('\n=== Tenants ===');
    t.rows.forEach(t => console.log(`${t.business_name} | ${t.owner_email} | owner:"${t.owner_name}" | ${t.status}`));

    await c.end();
}
run().catch(console.error);
