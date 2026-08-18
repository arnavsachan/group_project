const fs = require('fs');
const path = require('path');
const jsonPath = path.join(__dirname, '..', 'myscheme_complete.json');
const targetSlug = process.argv[2] || 'famdpwog';

function findScheme(data, slug) {
  return data.find(item => item.slug === slug);
}

fs.readFile(jsonPath, 'utf8', (err, text) => {
  if (err) { console.error('Read error:', err); process.exit(1); }
  let arr;
  try { arr = JSON.parse(text); }
  catch(e) { console.error('JSON parse error', e); process.exit(1); }
  const scheme = findScheme(arr, targetSlug);
  if (!scheme) { console.error('Scheme not found'); process.exit(1); }
  console.log('=== documents.en for slug', targetSlug, '===');
  console.log(JSON.stringify(scheme.documents?.en || {}, null, 2));
});
