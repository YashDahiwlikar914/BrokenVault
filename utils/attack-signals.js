function normalizeValues(values) {
  return values
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value));
}

function hasSqlInjectionSignal(values) {
  const sqlPatterns = [
    /--/,
    /\/\*/,
    /\bunion\b/i,
    /\bselect\b/i,
    /\bor\b\s+['"(0-9]/i,
    /\b1\s*=\s*1\b/i,
    /\bdrop\b/i
  ];

  return normalizeValues(values).some((value) =>
    sqlPatterns.some((pattern) => pattern.test(value))
  );
}

function hasXssSignal(values) {
  const xssPatterns = [
    /<script/i,
    /onerror\s*=/i,
    /onload\s*=/i,
    /javascript:/i,
    /<img/i,
    /<svg/i,
    /<iframe/i
  ];

  return normalizeValues(values).some((value) =>
    xssPatterns.some((pattern) => pattern.test(value))
  );
}

function getMode() {
  return process.env.SECURE_MODE === 'true' ? 'secure' : 'vulnerable';
}

module.exports = {
  getMode,
  hasSqlInjectionSignal,
  hasXssSignal
};
