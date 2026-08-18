const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, '..', 'schemes.db');

function countDocs(callback) {
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, err => {
    if (err) {
      console.error('Failed to open DB:', err.message);
      process.exit(1);
    }
  });
  const query = `SELECT COUNT(*) as cnt FROM schemes WHERE documents_md IS NOT NULL AND trim(documents_md) != ''`;
  db.get(query, (err, row) => {
    if (err) {
      console.error('Query error:', err.message);
      process.exit(1);
    }
    console.log('nonEmptyDocsCount:', row.cnt);
    db.close();
    if (callback) callback(row.cnt);
  });
}

countDocs();
