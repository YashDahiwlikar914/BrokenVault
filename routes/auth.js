const express = require('express');
const app = express.Router();
const db = require('../db');
const asyncHandler = require('../utils/async-handler');
const { getMode, hasSqlInjectionSignal } = require('../utils/attack-signals');

app.post('/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const suspiciousLogin = hasSqlInjectionSignal([username, password]);

    if (suspiciousLogin) {
        await db.logAuditEvent('sql_injection', { route: '/login', username, password }, getMode());
    }

    const query = `SELECT * FROM users WHERE username = '${username}' AND password='${password}'`;
    const [rows] = await db.query(query);
    if (rows.length > 0) {
        if (suspiciousLogin) {
            await db.logAuditEvent('login_bypass', { route: '/login', username, resolvedUserId: rows[0].id }, getMode());
        }
        res.json({ success: true, userId: rows[0].id, username: rows[0].username });
    } else {
        res.json({ success: false, message: 'Invalid credentials' });
    }
}));

module.exports = app;
