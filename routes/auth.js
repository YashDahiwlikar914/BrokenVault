const express = require('express');
const app = express.Router();
const db = require('../db');

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const query = `SELECT * FROM users WHERE username = '${username}' AND password='${password}'`;
    const [rows] = await db.query(query);
    if (rows.length > 0) {
        res.json({ success: true, userId: rows[0].id, username: rows[0].username });
    } else {
        res.json({ success: false, message: 'Invalid credentials' });
    }
});

module.exports = app;