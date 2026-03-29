const { Client } = require('pg');

const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'adotech_in',
    user: 'adotech_in',
    password: 'Techaasvik@2026!Secure',
    connectionTimeoutMillis: 8000,
    query_timeout: 5000,
});

const timeout = setTimeout(() => {
    console.error('❌ TIMEOUT: Could not connect to database within 8 seconds');
    process.exit(1);
}, 10000);

client.connect()
    .then(async () => {
        clearTimeout(timeout);
        console.log('✅ DB connected\n');

        const tables = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' ORDER BY table_name
        `);
        console.log('TABLES:', tables.rows.map(r => r.table_name).join(', '));

        // Check tenant_audit_logs
        const hasAudit = tables.rows.some(r => r.table_name === 'tenant_audit_logs');
        console.log('\ntenant_audit_logs exists:', hasAudit ? '✅ YES' : '❌ NO - MISSING!');

        // Check enums
        const enums = await client.query(`
            SELECT typname, enumlabel FROM pg_type t 
            JOIN pg_enum e ON t.oid = e.enumtypid 
            ORDER BY typname, e.enumsortorder
        `);
        const enumMap = {};
        enums.rows.forEach(r => {
            if (!enumMap[r.typname]) enumMap[r.typname] = [];
            enumMap[r.typname].push(r.enumlabel);
        });
        console.log('\nENUMS:');
        Object.entries(enumMap).forEach(([k, v]) => console.log(' ', k, '->', v.join(', ')));

        await client.end();
        process.exit(0);
    })
    .catch(err => {
        clearTimeout(timeout);
        console.error('❌ DB Error:', err.message);
        process.exit(1);
    });
