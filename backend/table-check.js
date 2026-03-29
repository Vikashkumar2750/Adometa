const { Client } = require('pg');

const client = new Client({
    host: 'localhost', port: 5432,
    database: 'adotech_in', user: 'adotech_in',
    password: 'Techaasvik@2026!Secure',
    connectionTimeoutMillis: 8000,
});

setTimeout(() => { console.error('TIMEOUT'); process.exit(1); }, 12000);

client.connect().then(async () => {
    const tables = ['contacts', 'tenant_contacts', 'campaigns', 'tenant_campaigns', 'templates', 'tenant_templates'];

    for (const table of tables) {
        const cols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = $1 
            ORDER BY ordinal_position
            LIMIT 5
        `, [table]);
        const count = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`\n📊 ${table}: ${count.rows[0].count} rows | cols: ${cols.rows.map(r => r.column_name).join(', ')}`);
    }

    await client.end();
    process.exit(0);
}).catch(e => { console.error('Error:', e.message); process.exit(1); });
