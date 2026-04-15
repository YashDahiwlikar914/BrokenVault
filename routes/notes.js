const express = require('express');
const DOMPurify = require('isomorphic-dompurify');
const app = express.Router();
const db = require('../db');
const asyncHandler = require('../utils/async-handler');
const {
    getMode,
    hasSqlInjectionSignal,
    hasXssSignal
} = require('../utils/attack-signals');
const { isSecureMode } = require('../utils/mode');

function sanitizeContent(value) {
    return DOMPurify.sanitize(value || '');
}

app.post('/notes', asyncHandler(async (req, res) => {
    const { userId, title, content } = req.body;

    if (hasSqlInjectionSignal([userId, title, content])) {
        await db.logAuditEvent('sql_injection', { route: '/notes', userId, title, content }, getMode());
    }

    if (hasXssSignal([title, content])) {
        await db.logAuditEvent('xss_attack', { route: '/notes', title, content }, getMode());
    }

    if (isSecureMode()) {
        const sanitizedTitle = sanitizeContent(title);
        const sanitizedContent = sanitizeContent(content);

        await db.runQuery(
            'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
            [userId, sanitizedTitle, sanitizedContent]
        );

        return res.json({ success: true });
    }

    await db.query(`INSERT INTO notes (user_id, title, content) VALUES (${userId}, '${title}', '${content}' )`);
    res.json({ success: true });
}));

app.get('/notes', asyncHandler(async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    if (hasSqlInjectionSignal([userId])) {
        await db.logAuditEvent('sql_injection', { route: '/notes', userId }, getMode());
    }

    if (isSecureMode()) {
        const [rows] = await db.query(
            'SELECT * FROM notes WHERE user_id = ?',
            [userId]
        );
        return res.json(rows);
    }

    const [rows] = await db.query(`SELECT * FROM notes WHERE user_id = ${userId}`);
    res.json(rows);
}));

app.get('/notes/search', asyncHandler(async (req, res) => {
    const { q, userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    if (hasSqlInjectionSignal([q, userId])) {
        await db.logAuditEvent('sql_injection', { route: '/notes/search', q, userId }, getMode());
    }

    if (isSecureMode()) {
        const [rows] = await db.query(
            'SELECT id, title, content FROM notes WHERE user_id = ? AND title LIKE ?',
            [userId, `%${q}%`]
        );
        return res.json(rows);
    }

    const [rows] = await db.query(`SELECT id, title, content FROM notes WHERE user_id = ${userId} AND title LIKE '%${q}%'`);
    res.json(rows);
}));

app.delete('/notes/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (hasSqlInjectionSignal([id])) {
        await db.logAuditEvent('sql_injection', { route: '/notes/:id', id }, getMode());
    }

    if (isSecureMode()) {
        await db.runQuery('DELETE FROM notes WHERE id = ?', [id]);
        return res.json({ success: true });
    }

    await db.runQuery(`DELETE FROM notes WHERE id = ${id}`);
    res.json({ success: true });
}));

module.exports = app;
