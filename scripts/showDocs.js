const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DB_PATH = path.join(__dirname, '..', 'schemes.db');

const slugs = process.argv.slice(2);
if (slugs.length === 0) {
  console.error('Provide at least one slug as argument');
  process.exit(1);
}

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, err => {
  if (err) { console.error('Failed to open DB:', err.message); process.exit(1); }
});

function fetchAndPrint(slug) {
  db.get('SELECT documents_md FROM schemes WHERE slug = ?', [slug], (err, row) => {
    if (err) { console.error(`Error fetching ${slug}:`, err.message); return; }
    console.log(`--- SLUG: ${slug} ---`);
    if (row && row.documents_md) {
      console.log(row.documents_md);
    } else {
      console.log('<<No documents_md>>');
    }
    console.log('--- END ---\n');
  });
}

slugs.forEach(fetchAndPrint);

db.close();
