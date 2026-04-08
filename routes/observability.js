const express = require('express');
const app = express.Router();
const db = require('../db');
const asyncHandler = require('../utils/async-handler');

app.get('/last-query', (req, res) => {
  res.json({
    query: db.getLastTrackedQuery() || 'No tracked queries yet.'
  });
});

app.get('/stats', asyncHandler(async (req, res) => {
  const [rows] = await db.rawQuery(
    `SELECT
      SUM(CASE WHEN event = ? THEN 1 ELSE 0 END) AS sqlInjectionCount,
      SUM(CASE WHEN event = ? THEN 1 ELSE 0 END) AS xssCount,
      SUM(CASE WHEN event = ? THEN 1 ELSE 0 END) AS loginBypassCount
    FROM audit_log`,
    ['sql_injection', 'xss_attack', 'login_bypass']
  );

  const stats = rows[0] || {};

  res.json({
    sqlInjectionCount: stats.sqlInjectionCount || 0,
    xssCount: stats.xssCount || 0,
    loginBypassCount: stats.loginBypassCount || 0
  });
}));

module.exports = app;
