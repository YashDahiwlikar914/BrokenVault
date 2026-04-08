const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database.db'));
let lastTrackedQuery = null;

function runAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve([rows]);
    });
  });
}

function runStatement(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

db.query = function(sql, params = []) {
  lastTrackedQuery = sql;
  return runAll(sql, params);
};

db.runQuery = function(sql, params = []) {
  lastTrackedQuery = sql;
  return runStatement(sql, params);
};

db.rawQuery = function(sql, params = []) {
  return runAll(sql, params);
};

db.rawRunQuery = function(sql, params = []) {
  return runStatement(sql, params);
};

db.getLastTrackedQuery = function() {
  return lastTrackedQuery;
};

db.logAuditEvent = function(event, payload, mode = 'vulnerable') {
  const serializedPayload =
    typeof payload === 'string' ? payload : JSON.stringify(payload);

  return runStatement(
    'INSERT INTO audit_log (event, payload, mode) VALUES (?, ?, ?)',
    [event, serializedPayload, mode]
  );
};

module.exports = db;
