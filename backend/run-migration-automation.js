#!/usr/bin/env node
/**
 * Migration runner for automation_rules table
 * Run: node run-migration-automation.js
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'techaasvik',
    });

    try {
        await client.connect();
        console.log('✅ Connected to PostgreSQL');

        const sql = fs.readFileSync(
            path.join(__dirname, 'migrations/005_automation_rules.sql'),
            'utf8',
        );
        await client.query(sql);
        console.log('✅ Migration 005_automation_rules applied successfully');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
