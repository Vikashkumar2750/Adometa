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
    
    // Check demo1 user
    const users = await c.query(
        "SELECT tu.id, tu.email, tu.name, tu.role, tu.is_active, t.business_name, t.status FROM tenant_users tu JOIN tenants t ON tu.tenant_id = t.id ORDER BY tu.created_at DESC LIMIT 10"
    );
    console.log('\n=== Tenant Users ===');
    users.rows.forEach(u => console.log(`${u.email} | ${u.role} | active:${u.is_active} | tenant:${u.business_name} | status:${u.status}`));
    
    // Check if demo1 user exists at all
    const demo = await c.query("SELECT email, role, is_active, password_hash FROM tenant_users WHERE email ILIKE '%demo1%' OR email ILIKE '%demo%'");
    console.log('\n=== Demo Users ===');
    demo.rows.forEach(u => console.log(`${u.email} | ${u.role} | active:${u.is_active} | hash:${u.password_hash ? u.password_hash.substring(0, 20) + '...' : 'NULL'}`));
    
    await c.end();
}
run().catch(console.error);
