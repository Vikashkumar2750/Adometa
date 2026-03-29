/**
 * Activates the first tenant so the dashboard works.
 */
const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://adotech_in:Techaasvik%402026%21Secure@localhost:5432/adotech_in',
});

async function main() {
    await client.connect();
    console.log('Connected!');

    // Activate first tenant
    const result = await client.query(`
        UPDATE tenants 
        SET status = 'ACTIVE'
        WHERE id = '1bd30149-2497-460d-9a9f-712d046da12b'
        RETURNING id, business_name, status
    `);
    console.log('Updated:', JSON.stringify(result.rows));

    // Check tenant_users columns
    const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'tenant_users' ORDER BY ordinal_position`);
    console.log('tenant_users columns:', cols.rows.map(r => r.column_name).join(', '));

    await client.end();
}

main().catch(e => { console.error('ERROR:', e.message); client.end(); });
