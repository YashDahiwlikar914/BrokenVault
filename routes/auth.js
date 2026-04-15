const express = require('express');
const bcrypt = require('bcryptjs');
const app = express.Router();
const db = require('../db');
const asyncHandler = require('../utils/async-handler');
const { getMode, hasSqlInjectionSignal } = require('../utils/attack-signals');
const { isSecureMode } = require('../utils/mode');

function isBcryptHash(value) {
    return /^\$2[aby]\$\d{2}\$/.test(value || '');
}

app.post('/register', asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!isSecureMode()) {
        return res.status(400).json({
            success: false,
            message: 'Registration is only available in secure mode'
        });
    }

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required'
        });
    }

    const [existingUsers] = await db.query(
        'SELECT id FROM users WHERE username = ?',
        [username]
    );

    if (existingUsers.length > 0) {
        return res.status(409).json({
            success: false,
            message: 'Username already exists'
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.runQuery(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, hashedPassword]
    );

    res.json({
        success: true,
        userId: result.lastID,
        username
    });
}));

app.post('/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const suspiciousLogin = hasSqlInjectionSignal([username, password]);

    if (suspiciousLogin) {
        await db.logAuditEvent('sql_injection', { route: '/login', username, password }, getMode());
    }

    if (isSecureMode()) {
        const [rows] = await db.query(
            'SELECT * FROM users WHERE username = ? LIMIT 1',
            [username]
        );
        const user = rows[0];
        const passwordMatches =
            user && isBcryptHash(user.password)
                ? await bcrypt.compare(password, user.password)
                : false;

        if (passwordMatches) {
            return res.json({
                success: true,
                userId: user.id,
                username: user.username
            });
        }

        return res.json({ success: false, message: 'Invalid credentials' });
    }

    const query = `SELECT * FROM users WHERE username = '${username}' AND password='${password}'`;
    const [rows] = await db.query(query);
    if (rows.length > 0) {
        if (suspiciousLogin) {
            await db.logAuditEvent('login_bypass', { route: '/login', username, resolvedUserId: rows[0].id }, getMode());
        }
        return res.json({ success: true, userId: rows[0].id, username: rows[0].username });
    }

    res.json({ success: false, message: 'Invalid credentials' });
}));

module.exports = app;
