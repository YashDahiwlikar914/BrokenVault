let currentMode = process.env.SECURE_MODE === 'true' ? 'secure' : 'vulnerable';

function getMode() {
  return currentMode;
}

function isSecureMode() {
  return currentMode === 'secure';
}

function setSecureMode(enabled) {
  currentMode = enabled ? 'secure' : 'vulnerable';
  process.env.SECURE_MODE = enabled ? 'true' : 'false';
  return currentMode;
}

module.exports = {
  getMode,
  isSecureMode,
  setSecureMode
};
