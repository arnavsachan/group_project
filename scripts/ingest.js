const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const JSON_PATH = path.join(__dirname, '..', 'myscheme_complete.json');
const DB_PATH = path.join(__dirname, '..', 'schemes.db');

// Helper to clean and extract string labels from varied JSON formats
function cleanText(val) {
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'object') {
    return (val.label || val.value || '').toString().trim();
  }
  return String(val).trim();
}

function extractList(arr) {
  if (!Array.isArray(arr)) return [];
  const list = [];
  for (const item of arr) {
    const cleaned = cleanText(item);
    if (cleaned && cleaned !== '#N/A') list.push(cleaned);
  }
  return Array.from(new Set(list));
}

// Convert Slate/JSON AST process blocks to markdown if process_md is missing
function extractProcessMarkdown(apList) {
  if (!Array.isArray(apList) || apList.length === 0) return { mode: 'Offline', url: '', md: '' };
  
  const modes = new Set();
  const urls = new Set();
  const mdParts = [];

  for (const item of apList) {
    if (!item) continue;
    if (item.mode) modes.add(cleanText(item.mode));
    if (item.url) urls.add(cleanText(item.url));
    
    if (item.process_md && item.process_md.trim()) {
      mdParts.push(item.process_md.trim());
    } else if (Array.isArray(item.process)) {
      const extracted = item.process
        .map(node => {
          if (node.children) {
            return node.children.map(c => c.text || '').join('');
          }
          return '';
        })
        .filter(Boolean)
        .join('\n\n');
      if (extracted) mdParts.push(extracted);
    }
  }

  return {
    mode: Array.from(modes).join(' / ') || 'Online / Offline',
    url: Array.from(urls).join(', '),
    md: mdParts.join('\n\n---\n\n')
  };
}

async function runIngestion() {
  console.log('🚀 Starting Scheme Finder Data Ingestion...');
  console.time('Ingestion Time');

  if (fs.existsSync(DB_PATH)) {
    console.log('🗑️ Removing existing database:', DB_PATH);
    fs.unlinkSync(DB_PATH);
  }

  const rawData = fs.readFileSync(JSON_PATH, 'utf-8');
  const schemesData = JSON.parse(rawData);
  console.log(`📦 Loaded ${schemesData.length} raw scheme records from JSON.`);

  const db = new sqlite3.Database(DB_PATH);

  await new Promise((resolve, reject) => {
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE schemes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE,
        scheme_id TEXT,
        title TEXT,
        short_title TEXT,
        level TEXT,
        state TEXT,
        dbt_scheme INTEGER,
        implementing_agency TEXT,
        nodal_ministry TEXT,
        nodal_department TEXT,
        open_date TEXT,
        close_date TEXT,
        brief_description TEXT,
        detailed_description_md TEXT,
        benefits_md TEXT,
        eligibility_md TEXT,
        documents_md TEXT,
        application_mode TEXT,
        application_url TEXT,
        application_process_md TEXT,
        raw_json TEXT
      );

      CREATE TABLE scheme_categories (
        scheme_slug TEXT,
        category TEXT
      );

      CREATE TABLE scheme_tags (
        scheme_slug TEXT,
        tag TEXT
      );

      CREATE TABLE scheme_target_beneficiaries (
        scheme_slug TEXT,
        beneficiary TEXT
      );

      CREATE INDEX idx_schemes_slug ON schemes(slug);
      CREATE INDEX idx_schemes_level ON schemes(level);
      CREATE INDEX idx_schemes_state ON schemes(state);
      CREATE INDEX idx_schemes_dbt ON schemes(dbt_scheme);
      CREATE INDEX idx_cat_category ON scheme_categories(category);
      CREATE INDEX idx_cat_slug ON scheme_categories(scheme_slug);
      CREATE INDEX idx_tag_tag ON scheme_tags(tag);
      CREATE INDEX idx_tag_slug ON scheme_tags(scheme_slug);
      CREATE INDEX idx_ben_beneficiary ON scheme_target_beneficiaries(beneficiary);

      CREATE VIRTUAL TABLE schemes_fts USING fts5(
        slug UNINDEXED,
        title,
        short_title,
        brief_description,
        detailed_description_md,
        eligibility_md,
        benefits_md,
        categories,
        tags,
        state,
        nodal_ministry
      );
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  console.log('⚡ SQLite Schema created successfully. Inserting records...');

  const insertSchemeStmt = db.prepare(`
    INSERT INTO schemes (
      slug, scheme_id, title, short_title, level, state, dbt_scheme,
      implementing_agency, nodal_ministry, nodal_department, open_date, close_date,
      brief_description, detailed_description_md, benefits_md, eligibility_md,
      documents_md, application_mode, application_url, application_process_md, raw_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCatStmt = db.prepare(`INSERT INTO scheme_categories (scheme_slug, category) VALUES (?, ?)`);
  const insertTagStmt = db.prepare(`INSERT INTO scheme_tags (scheme_slug, tag) VALUES (?, ?)`);
  const insertBenStmt = db.prepare(`INSERT INTO scheme_target_beneficiaries (scheme_slug, beneficiary) VALUES (?, ?)`);

  const insertFtsStmt = db.prepare(`
    INSERT INTO schemes_fts (
      slug, title, short_title, brief_description, detailed_description_md,
      eligibility_md, benefits_md, categories, tags, state, nodal_ministry
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seenSlugs = new Map();

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    let count = 0;
    for (const item of schemesData) {
      let baseSlug = cleanText(item.slug) || 'scheme';
      let slug = baseSlug;

      if (seenSlugs.has(baseSlug)) {
        const dupCount = seenSlugs.get(baseSlug) + 1;
        seenSlugs.set(baseSlug, dupCount);
        slug = `${baseSlug}-${dupCount}`;
      } else {
        seenSlugs.set(baseSlug, 1);
      }

      const schemeId = cleanText(item.scheme_id);
      
      const enDetails = (item.details && item.details.en) ? item.details.en : {};
      const basicDetails = enDetails.basicDetails || {};
      const schemeContent = enDetails.schemeContent || {};
      const eligibilityCriteria = enDetails.eligibilityCriteria || {};
      // Documents are stored under a top‑level `documents` object, not inside `details`
      const docs = (item.documents && item.documents.en) ? item.documents.en : {};

      const title = cleanText(basicDetails.schemeName) || slug;
      const shortTitle = cleanText(basicDetails.schemeShortTitle);
      
      let level = cleanText(basicDetails.level);
      if (level.toLowerCase().includes('state')) level = 'State';
      else if (level.toLowerCase().includes('central')) level = 'Central';
      else level = level || 'Central';

      const state = cleanText(basicDetails.state);
      const dbtScheme = basicDetails.dbtScheme ? 1 : 0;
      const implementingAgency = cleanText(basicDetails.implementingAgency);
      const nodalMinistry = cleanText(basicDetails.nodalMinistryName);
      const nodalDepartment = cleanText(basicDetails.nodalDepartmentName);
      const openDate = cleanText(basicDetails.schemeOpenDate);
      const closeDate = cleanText(basicDetails.schemeCloseDate);

      const briefDescription = cleanText(schemeContent.briefDescription);
      const detailedDescriptionMd = cleanText(schemeContent.detailedDescription_md);
      const benefitsMd = cleanText(schemeContent.benefits_md);
      const eligibilityMd = cleanText(eligibilityCriteria.eligibilityDescription_md);
      // Prefer the markdown field; fallback to array of required documents
      let documentsMd = '';
      if (docs.documentsRequired_md) {
        documentsMd = cleanText(docs.documentsRequired_md);
      } else if (Array.isArray(docs.documents_required)) {
        // Convert array items to a markdown list
        const items = docs.documents_required.map(item => cleanText(item)).filter(Boolean);
        if (items.length) {
          documentsMd = items.map(i => `- ${i}`).join('\n');
        }
      }

      const appInfo = extractProcessMarkdown(enDetails.applicationProcess);

      const categories = extractList(basicDetails.schemeCategory);
      const tags = extractList(basicDetails.tags);
      const beneficiaries = extractList(basicDetails.targetBeneficiaries);

      insertSchemeStmt.run(
        slug, schemeId, title, shortTitle, level, state, dbtScheme,
        implementingAgency, nodalMinistry, nodalDepartment, openDate, closeDate,
        briefDescription, detailedDescriptionMd, benefitsMd, eligibilityMd,
        documentsMd, appInfo.mode, appInfo.url, appInfo.md, JSON.stringify(item)
      );

      for (const cat of categories) {
        insertCatStmt.run(slug, cat);
      }
      for (const tag of tags) {
        insertTagStmt.run(slug, tag);
      }
      for (const ben of beneficiaries) {
        insertBenStmt.run(slug, ben);
      }

      insertFtsStmt.run(
        slug, title, shortTitle, briefDescription, detailedDescriptionMd,
        eligibilityMd, benefitsMd, categories.join(', '), tags.join(', '),
        state, nodalMinistry
      );

      count++;
      if (count % 1000 === 0) {
        console.log(` progress: ${count}/${schemesData.length} schemes processed...`);
      }
    }

    db.run("COMMIT", (err) => {
      if (err) {
        console.error("❌ Commit error:", err);
      } else {
        insertSchemeStmt.finalize();
        insertCatStmt.finalize();
        insertTagStmt.finalize();
        insertBenStmt.finalize();
        insertFtsStmt.finalize();

        console.timeEnd('Ingestion Time');
        console.log(`✅ Successfully ingested all ${count} schemes into SQLite (${DB_PATH})`);
        db.close();
      }
    });
  });
}

runIngestion().catch(console.error);
