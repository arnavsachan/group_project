const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DB_PATH = path.join(__dirname, '..', 'schemes.db');
const db = new sqlite3.Database(DB_PATH);

const slugs = ['sui', 'famdpwog']; // add more random later

db.serialize(() => {
  slugs.forEach(slug => {
    db.get('SELECT documents_md FROM schemes WHERE slug = ?', [slug], (err, row) => {
      if (err) {
        console.error(`Error fetching ${slug}:`, err);
        return;
      }
      console.log(`Slug: ${slug}\nDocuments MD:\n${row ? row.documents_md : 'Not found'}\n---`);
    });
  });
});

db.close();
