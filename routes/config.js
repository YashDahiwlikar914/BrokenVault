const express = require('express');
const app = express.Router();
const asyncHandler = require('../utils/async-handler');
const db = require('../db');
const { getMode, isSecureMode, setSecureMode } = require('../utils/mode');

app.get('/config', (req, res) => {
  res.json({
    mode: getMode(),
    secureMode: isSecureMode()
  });
});

app.post('/toggle-mode', asyncHandler(async (req, res) => {
  const enabled =
    typeof req.body.secureMode === 'boolean'
      ? req.body.secureMode
      : !isSecureMode();

  const mode = setSecureMode(enabled);

  await db.logAuditEvent(
    'mode_toggle',
    { route: '/toggle-mode', secureMode: enabled },
    mode
  );

  res.json({
    success: true,
    mode,
    secureMode: enabled
  });
}));

module.exports = app;
