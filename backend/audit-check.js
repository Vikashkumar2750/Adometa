const { Client } = require('pg');
const client = new Client({ host: 'localhost', port: 5432, database: 'adotech_in', user: 'adotech_in', password: 'Techaasvik@2026!Secure', connectionTimeoutMillis: 8000 });
setTimeout(() => { console.error('TIMEOUT'); process.exit(1); }, 12000);
client.connect().then(async () => {
    const r = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tenant_audit_logs' ORDER BY ordinal_position`);
    console.log('tenant_audit_logs columns:');
    r.rows.forEach(c => console.log(' -', c.column_name, ':', c.data_type));
    await client.end(); process.exit(0);
}).catch(e => { console.error('Error:', e.message); process.exit(1); });
