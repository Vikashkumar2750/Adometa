/**
 * Cleans up all dummy/test tenants, keeping only the real active one.
 * Run with: node cleanup-tenants.js
 */
const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://adotech_in:Techaasvik%402026%21Secure@localhost:5432/adotech_in',
});

async function main() {
    await client.connect();
    console.log('Connected!');

    // Show all tenants first
    const all = await client.query('SELECT id, business_name, owner_email, status FROM tenants ORDER BY created_at');
    console.log('\nAll tenants:');
    all.rows.forEach(r => console.log(`  [${r.status}] ${r.business_name} (${r.owner_email}) -> ${r.id}`));

    // Keep ONLY the ACTIVE one (or if none active, keep the first one and activate it)
    const active = all.rows.filter(r => r.status === 'ACTIVE');
    let keepId;

    if (active.length > 0) {
        keepId = active[0].id;
        console.log('\nKeeping active tenant:', keepId, '-', active[0].business_name);
    } else if (all.rows.length > 0) {
        keepId = all.rows[0].id;
        await client.query('UPDATE tenants SET status = $1 WHERE id = $2', ['ACTIVE', keepId]);
        console.log('\nActivated and keeping:', keepId, '-', all.rows[0].business_name);
    }

    if (!keepId) {
        console.log('No tenants to clean up.');
        await client.end();
        return;
    }

    // Delete all segments, contacts, campaigns etc for dummy tenants (cascade or manual)
    const toDelete = all.rows.filter(r => r.id !== keepId).map(r => r.id);

    if (toDelete.length === 0) {
        console.log('Only one tenant exists — nothing to delete.');
        await client.end();
        return;
    }

    console.log(`\nDeleting ${toDelete.length} dummy tenant(s)...`);

    for (const tid of toDelete) {
        // Delete related data first
        await client.query('DELETE FROM tenant_users WHERE tenant_id = $1', [tid]).catch(() => { });
        await client.query('DELETE FROM segments WHERE "tenantId" = $1', [tid]).catch(() => { });
        await client.query('DELETE FROM campaigns WHERE "tenantId" = $1', [tid]).catch(() => { });
        await client.query('DELETE FROM templates WHERE "tenantId" = $1', [tid]).catch(() => { });
        await client.query('DELETE FROM contacts WHERE "tenantId" = $1', [tid]).catch(() => { });
    }

    // Delete the dummy tenants themselves
    const placeholders = toDelete.map((_, i) => `$${i + 1}`).join(', ');
    await client.query(`DELETE FROM tenants WHERE id IN (${placeholders})`, toDelete);
    console.log(`✅ Deleted ${toDelete.length} dummy tenant(s).`);

    // Show remaining
    const remaining = await client.query('SELECT id, business_name, owner_email, status FROM tenants');
    console.log('\nRemaining tenants:');
    remaining.rows.forEach(r => console.log(`  [${r.status}] ${r.business_name} (${r.owner_email}) -> ${r.id}`));

    await client.end();
}

main().catch(e => { console.error('ERROR:', e.message); client.end(); });
