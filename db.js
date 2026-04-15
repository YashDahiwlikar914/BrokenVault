const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database.db'));
let lastTrackedQuery = null;

// Original Promise-based API wrappers for compatibility with existing code
async function query(sql, params = []) {
    lastTrackedQuery = { sql, params };
    try {
        const rows = db.prepare(sql).all(...params);
        return [rows, null];
    } catch (err) {
        return [[], err];
    }
}

async function runQuery(sql, params = []) {
    lastTrackedQuery = { sql, params };
    try {
        const result = db.prepare(sql).run(...params);
        return { 
            lastID: result.lastInsertRowid, 
            changes: result.changes 
        };
    } catch (err) {
        throw err;
    }
}

// Low-level raw query for tracking (XSS/SQLi observability)
async function rawQuery(sql) {
    lastTrackedQuery = { sql, params: [] };
    const rows = db.prepare(sql).all();
    return rows;
}

async function rawRunQuery(sql) {
    lastTrackedQuery = { sql, params: [] };
    const result = db.prepare(sql).run();
    return result;
}

// Observability helpers
function getLastQuery() {
    return lastTrackedQuery;
}

async function logAuditEvent(event, payload, mode) {
    const sql = 'INSERT INTO audit_log (event, payload, mode) VALUES (?, ?, ?)';
    return runQuery(sql, [event, JSON.stringify(payload), mode]);
}

module.exports = {
    query,
    runQuery,
    rawQuery,
    rawRunQuery,
    getLastQuery,
    logAuditEvent,
    // Add exec for one-off table creations in server.js
    exec: (sql) => db.exec(sql),
    prepare: (sql) => db.prepare(sql)
};
