const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '../.env' });

const c = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

const EMAIL = 'demo1@techaasvik.com';
const NEW_PASSWORD = 'Demo1@Techaasvik!';

async function run() {
    await c.connect();
    
    // Hash new password
    const hash = await bcrypt.hash(NEW_PASSWORD, 10);
    
    // Update password
    const res = await c.query(
        "UPDATE tenant_users SET password_hash = $1 WHERE email = $2 RETURNING email, role, is_active",
        [hash, EMAIL]
    );
    
    if (res.rows.length === 0) {
        console.log('❌ User not found:', EMAIL);
    } else {
        console.log('✅ Password reset for:', res.rows[0].email);
        console.log('   Role:', res.rows[0].role);
        console.log('   Active:', res.rows[0].is_active);
        console.log('   New password:', NEW_PASSWORD);
    }
    
    // Verify bcrypt works
    const check = await bcrypt.compare(NEW_PASSWORD, hash);
    console.log('✅ bcrypt verify:', check);
    
    await c.end();
}
run().catch(console.error);
