const express = require('express');
const app = express.Router();
const db = require('../db');

app.post('/notes', async (req, res) => {
    const { userId, title, content } = req.body;
    await db.query(`INSERT INTO notes (user_id, title, content) VALUES (${userId}, '${title}', '${content}' )`);
    res.json({ success: true });
});

app.get('/notes', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const [rows] = await db.query(`SELECT * FROM notes WHERE user_id = ${userId}`);
    res.json(rows);
});

app.get('/notes/search', async (req, res) => {
    const { q, userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const [rows] = await db.query(`SELECT id, title, content FROM notes WHERE user_id = ${userId} AND title LIKE '%${q}%'`);
    res.json(rows);
});

app.delete('/notes/:id', async (req, res) => {
    const { id } = req.params;
    await db.runQuery(`DELETE FROM notes WHERE id = ${id}`);
    res.json({ success: true });
});

module.exports = app;