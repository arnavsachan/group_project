const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { queryGet, queryAll } = require('./db');
const { matchSchemes } = require('./matcher');
const aiService = require('./aiService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// IP-based Rate Limiter for AI endpoints
const rateLimitMap = new Map();
function checkAiRateLimit(ip) {
  const now = Date.now();
  const clientData = rateLimitMap.get(ip) || { lastRequest: 0, count: 0, windowStart: now };

  // Reset 1-minute window
  if (now - clientData.windowStart > 60000) {
    clientData.count = 0;
    clientData.windowStart = now;
  }

  // Minimum 2.5s cooldown between consecutive requests
  if (now - clientData.lastRequest < 2500) {
    const waitSeconds = Math.ceil((2500 - (now - clientData.lastRequest)) / 1000);
    return { allowed: false, error: `Please wait ${waitSeconds}s before asking another question.` };
  }

  // Max 15 requests per minute per IP
  if (clientData.count >= 15) {
    return { allowed: false, error: 'Hourly/minute message rate limit reached. Please wait a moment.' };
  }

  clientData.lastRequest = now;
  clientData.count += 1;
  rateLimitMap.set(ip, clientData);
  return { allowed: true };
}

// Helper for FTS5 Query formatting
function formatFtsQuery(q) {
  if (!q) return '';
  const terms = q.trim().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  if (terms.length === 0) return '';
  return terms.map(term => `${term}*`).join(' ');
}

// 1. Health Check
app.get('/api/health', async (req, res) => {
  try {
    const row = await queryGet(`SELECT COUNT(*) as count FROM schemes`);
    res.json({
      status: 'online',
      database: 'connected',
      schemeCount: row.count,
      aiEngine: {
        provider: aiService.provider,
        mode: 'Smart Offline Engine',
        status: 'Active (No external API dependency)'
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 2. Filter Options for UI Dropdowns
app.get('/api/schemes/filters', async (req, res) => {
  try {
    const categories = await queryAll(`SELECT category, COUNT(*) as count FROM scheme_categories GROUP BY category ORDER BY count DESC`);
    const states = await queryAll(`SELECT DISTINCT state FROM schemes WHERE state IS NOT NULL AND state != '' ORDER BY state ASC`);
    const ministries = await queryAll(`SELECT nodal_ministry, COUNT(*) as count FROM schemes WHERE nodal_ministry IS NOT NULL AND nodal_ministry != '' GROUP BY nodal_ministry ORDER BY count DESC LIMIT 30`);

    res.json({
      categories: categories.map(c => c.category),
      states: states.map(s => s.state),
      ministries: ministries.map(m => m.nodal_ministry)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Analytics Aggregations Endpoint
app.get('/api/schemes/stats', async (req, res) => {
  try {
    const totalRow = await queryGet(`SELECT COUNT(*) as count FROM schemes`);
    const levelRows = await queryAll(`SELECT level, COUNT(*) as count FROM schemes GROUP BY level`);
    const categoryRows = await queryAll(`SELECT category, COUNT(*) as count FROM scheme_categories GROUP BY category ORDER BY count DESC LIMIT 15`);
    const ministryRows = await queryAll(`SELECT nodal_ministry, COUNT(*) as count FROM schemes WHERE nodal_ministry IS NOT NULL AND nodal_ministry != '' GROUP BY nodal_ministry ORDER BY count DESC LIMIT 10`);
    const stateRows = await queryAll(`SELECT state, COUNT(*) as count FROM schemes WHERE state IS NOT NULL AND state != '' GROUP BY state ORDER BY count DESC`);
    const dbtRows = await queryAll(`SELECT dbt_scheme, COUNT(*) as count FROM schemes GROUP BY dbt_scheme`);
    const modeRows = await queryAll(`SELECT application_mode, COUNT(*) as count FROM schemes GROUP BY application_mode`);

    res.json({
      totalSchemes: totalRow.count,
      levels: levelRows.reduce((acc, curr) => ({ ...acc, [curr.level]: curr.count }), {}),
      topCategories: categoryRows,
      topMinistries: ministryRows,
      stateDensity: stateRows,
      dbtBreakdown: {
        dbt: (dbtRows.find(r => r.dbt_scheme === 1) || {}).count || 0,
        nonDbt: (dbtRows.find(r => r.dbt_scheme === 0) || {}).count || 0
      },
      applicationModes: modeRows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Scheme Search & Paginated Catalog
app.get('/api/schemes', async (req, res) => {
  try {
    const { q, level, state, category, dbt, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(100, parseInt(limit, 10) || 20);
    const offset = (pageNum - 1) * limitNum;

    let sql = '';
    let countSql = '';
    const params = [];
    const countParams = [];

    const formattedFts = formatFtsQuery(q);

    if (formattedFts) {
      sql = `
        SELECT 
          s.id, s.slug, s.title, s.short_title, s.level, s.state, s.dbt_scheme,
          s.implementing_agency, s.nodal_ministry, s.brief_description, s.application_mode,
          GROUP_CONCAT(DISTINCT c.category) as categories
        FROM schemes_fts fts
        JOIN schemes s ON fts.slug = s.slug
        LEFT JOIN scheme_categories c ON s.slug = c.scheme_slug
      `;

      countSql = `
        SELECT COUNT(DISTINCT s.slug) as count
        FROM schemes_fts fts
        JOIN schemes s ON fts.slug = s.slug
        LEFT JOIN scheme_categories c ON s.slug = c.scheme_slug
      `;

      const whereClauses = [`schemes_fts MATCH ?`];
      params.push(formattedFts);
      countParams.push(formattedFts);

      if (level && level !== 'All') {
        whereClauses.push(`s.level = ?`);
        params.push(level);
        countParams.push(level);
      }

      if (state && state !== 'All') {
        whereClauses.push(`(s.state = ? OR s.level = 'Central')`);
        params.push(state);
        countParams.push(state);
      }

      if (category && category !== 'All') {
        whereClauses.push(`c.category = ?`);
        params.push(category);
        countParams.push(category);
      }

      if (dbt === 'true' || dbt === '1') {
        whereClauses.push(`s.dbt_scheme = 1`);
      }

      const whereStr = ` WHERE ` + whereClauses.join(' AND ');
      sql += whereStr + ` GROUP BY s.slug ORDER BY s.id ASC LIMIT ? OFFSET ?`;
      countSql += whereStr;

      params.push(limitNum, offset);

    } else {
      sql = `
        SELECT 
          s.id, s.slug, s.title, s.short_title, s.level, s.state, s.dbt_scheme,
          s.implementing_agency, s.nodal_ministry, s.brief_description, s.application_mode,
          GROUP_CONCAT(DISTINCT c.category) as categories
        FROM schemes s
        LEFT JOIN scheme_categories c ON s.slug = c.scheme_slug
      `;

      countSql = `
        SELECT COUNT(DISTINCT s.slug) as count
        FROM schemes s
        LEFT JOIN scheme_categories c ON s.slug = c.scheme_slug
      `;

      const whereClauses = [];

      if (level && level !== 'All') {
        whereClauses.push(`s.level = ?`);
        params.push(level);
        countParams.push(level);
      }

      if (state && state !== 'All') {
        whereClauses.push(`(s.state = ? OR s.level = 'Central')`);
        params.push(state);
        countParams.push(state);
      }

      if (category && category !== 'All') {
        whereClauses.push(`c.category = ?`);
        params.push(category);
        countParams.push(category);
      }

      if (dbt === 'true' || dbt === '1') {
        whereClauses.push(`s.dbt_scheme = 1`);
      }

      if (whereClauses.length > 0) {
        const whereStr = ` WHERE ` + whereClauses.join(' AND ');
        sql += whereStr;
        countSql += whereStr;
      }

      sql += ` GROUP BY s.slug ORDER BY s.id ASC LIMIT ? OFFSET ?`;
      params.push(limitNum, offset);
    }

    const totalRow = await queryGet(countSql, countParams);
    const rows = await queryAll(sql, params);

    const formattedSchemes = rows.map(r => ({
      ...r,
      dbt_scheme: r.dbt_scheme === 1,
      categories: r.categories ? r.categories.split(',') : []
    }));

    res.json({
      total: totalRow ? totalRow.count : 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((totalRow ? totalRow.count : 0) / limitNum),
      schemes: formattedSchemes
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Single Scheme Details
app.get('/api/schemes/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const scheme = await queryGet(`SELECT * FROM schemes WHERE slug = ?`, [slug]);

    if (!scheme) {
      return res.status(404).json({ error: 'Scheme not found' });
    }

    const categories = await queryAll(`SELECT category FROM scheme_categories WHERE scheme_slug = ?`, [slug]);
    const tags = await queryAll(`SELECT tag FROM scheme_tags WHERE scheme_slug = ?`, [slug]);
    const beneficiaries = await queryAll(`SELECT beneficiary FROM scheme_target_beneficiaries WHERE scheme_slug = ?`, [slug]);

    // Related schemes in same level/category
    const related = await queryAll(`
      SELECT s.slug, s.title, s.level, s.state, s.brief_description 
      FROM schemes s 
      JOIN scheme_categories c ON s.slug = c.scheme_slug 
      WHERE c.category IN (SELECT category FROM scheme_categories WHERE scheme_slug = ?) 
        AND s.slug != ? 
      GROUP BY s.slug 
      LIMIT 4
    `, [slug, slug]);

    res.json({
      ...scheme,
      dbt_scheme: scheme.dbt_scheme === 1,
      categories: categories.map(c => c.category),
      tags: tags.map(t => t.tag),
      target_beneficiaries: beneficiaries.map(b => b.beneficiary),
      raw_json: scheme.raw_json ? JSON.parse(scheme.raw_json) : null,
      relatedSchemes: related
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Rule-based Eligibility Matching Engine
app.post('/api/schemes/match', async (req, res) => {
  try {
    const profile = req.body || {};
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;

    const result = await matchSchemes(profile, { page, limit });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. AI "Explain Simply" Endpoint
app.post('/api/ai/explain', async (req, res) => {
  try {
    const { slug } = req.body;
    let scheme = req.body.scheme;

    if (!scheme && slug) {
      scheme = await queryGet(`SELECT * FROM schemes WHERE slug = ?`, [slug]);
    }

    if (!scheme) {
      return res.status(400).json({ error: 'Scheme data or valid slug required' });
    }

    const explanation = aiService.explainSimply(scheme);
    res.json(explanation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. AI "Can I Apply?" Endpoint
app.post('/api/ai/can-i-apply', async (req, res) => {
  try {
    const { slug, profile = {} } = req.body;
    let scheme = req.body.scheme;

    if (!scheme && slug) {
      scheme = await queryGet(`SELECT * FROM schemes WHERE slug = ?`, [slug]);
    }

    if (!scheme) {
      return res.status(400).json({ error: 'Scheme data or valid slug required' });
    }

    const assessment = aiService.canIApply(scheme, profile);
    res.json(assessment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. AI "Ask AI About This Scheme" Chat Endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { slug, question = '' } = req.body;
    let scheme = req.body.scheme;

    if (!scheme && slug) {
      scheme = await queryGet(`SELECT * FROM schemes WHERE slug = ?`, [slug]);
    }

    if (!scheme) {
      return res.status(400).json({ error: 'Scheme data or valid slug required' });
    }

    const chatResponse = aiService.askAiAboutScheme(scheme, question);
    res.json(chatResponse);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. AI Site-wide Floating Assistant Chat (Gemini Flash + Local Schemes Grounding)
app.post('/api/ai/assistant-chat', async (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const rateCheck = checkAiRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: rateCheck.error });
    }

    const { message = '', history = [] } = req.body;
    const cleanMsg = (message || '').trim();
    if (!cleanMsg) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    // 1. Extract intent & search database for relevant candidate schemes
    const terms = cleanMsg.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 2);
    let matchedSchemes = [];

    // Check for state mention
    const stateList = [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa',
      'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
      'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
      'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
    ];
    const detectedState = stateList.find(s => cleanMsg.toLowerCase().includes(s.toLowerCase()));

    // Try FTS search with query terms
    const ftsQuery = formatFtsQuery(terms.slice(0, 5).join(' '));
    if (ftsQuery) {
      try {
        let ftsSql = `
          SELECT s.slug, s.title, s.level, s.state, s.brief_description, s.nodal_ministry, s.eligibility_md
          FROM schemes_fts fts
          JOIN schemes s ON fts.rowid = s.id
          WHERE schemes_fts MATCH ?
        `;
        const ftsParams = [ftsQuery];
        if (detectedState) {
          ftsSql += ` AND (s.level = 'Central' OR s.state = ?)`;
          ftsParams.push(detectedState);
        }
        ftsSql += ` LIMIT 6`;
        matchedSchemes = await queryAll(ftsSql, ftsParams);
      } catch (ftsErr) {
        console.warn('Assistant FTS lookup fallback:', ftsErr.message);
      }
    }

    // If FTS returned fewer than 2 results, do fallback LIKE / category search
    if (matchedSchemes.length < 2 && terms.length > 0) {
      const likeClause = terms.slice(0, 3).map(() => `(title LIKE ? OR brief_description LIKE ?)`).join(' OR ');
      const likeParams = [];
      terms.slice(0, 3).forEach(t => {
        likeParams.push(`%${t}%`, `%${t}%`);
      });
      if (likeClause) {
        let fallbackSql = `SELECT slug, title, level, state, brief_description, nodal_ministry, eligibility_md FROM schemes WHERE (${likeClause})`;
        if (detectedState) {
          fallbackSql += ` AND (level = 'Central' OR state = ?)`;
          likeParams.push(detectedState);
        }
        fallbackSql += ` LIMIT 6`;
        const extraSchemes = await queryAll(fallbackSql, likeParams);
        const existingSlugs = new Set(matchedSchemes.map(s => s.slug));
        extraSchemes.forEach(s => {
          if (!existingSlugs.has(s.slug)) matchedSchemes.push(s);
        });
      }
    }

    // Truncate to top 4 schemes for context
    const candidateSchemes = matchedSchemes.slice(0, 4);

    // 2. Check if GEMINI_API_KEY is available
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
      // Offline fallback response when no Gemini key is set
      if (candidateSchemes.length > 0) {
        const schemeListText = candidateSchemes.map(s => `• **[${s.title}](/scheme/${s.slug})** (${s.level === 'Central' ? 'Central Scheme' : s.state}): ${s.brief_description || 'Click to view benefits & eligibility.'}`).join('\n\n');
        return res.json({
          reply: `Here are relevant government schemes matching your inquiry:\n\n${schemeListText}\n\n*💡 Tip: Click any scheme link above to view comprehensive guidelines, required documents, and application steps.*`,
          schemes: candidateSchemes.map(s => ({ slug: s.slug, title: s.title, level: s.level, state: s.state }))
        });
      } else {
        return res.json({
          reply: "I couldn't find an exact scheme match for that specific inquiry. You can try searching by category (like Education, Agriculture, Health) or use the **[Find Schemes For Me](/find-schemes)** tool to filter by your exact age, occupation, and state.",
          schemes: []
        });
      }
    }

    // 3. Prepare Grounded Prompt for Gemini
    const schemeContext = candidateSchemes.map((s, idx) => `
Scheme ${idx + 1}:
- Title: ${s.title}
- Slug: ${s.slug}
- Level: ${s.level} (State: ${s.state || 'All-India Central'})
- Ministry: ${s.nodal_ministry || 'N/A'}
- Summary: ${s.brief_description || 'N/A'}
- Eligibility Info: ${(s.eligibility_md || '').substring(0, 300)}...
`).join('\n');

    const systemPrompt = `You are "Scheme Finder AI", an empathetic, highly knowledgeable government welfare assistant for Indian citizens.
Your job is to answer user inquiries about government schemes in clear, friendly, and practical language.

Available Grounded Schemes from Official Database:
${schemeContext || 'No specific database matches found for this query.'}

Guidelines:
1. Always reference 2-3 of the relevant schemes provided above if applicable.
2. Format scheme names as Markdown links using their EXACT slug: [Scheme Name](/scheme/slug). Example: [PM Kisan Samman Nidhi](/scheme/pm-kisan-samman-nidhi).
3. Mention key eligibility conditions and benefits concisely (e.g. age, gender, state, income bracket, financial assistance).
4. If no exact schemes fit or if the user asks a general question, offer helpful guidance and recommend visiting the [Find Schemes](/find-schemes) page.
5. Keep answers concise, well-structured with bullet points, and easy to read on mobile.
6. Do NOT invent fake URLs or external domains; only use internal links like /scheme/:slug or /find-schemes.`;

    const recentHistory = Array.isArray(history) ? history.slice(-4) : [];
    const contents = [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nUser Question: ${cleanMsg}` }]
      }
    ];

    // 4. Call Google Gemini Flash REST API (Server-side only)
    const geminiModels = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
    let generatedText = null;

    for (const modelName of geminiModels) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      try {
        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 600,
              topP: 0.95
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generatedText) break;
        } else {
          const errText = await geminiResponse.text();
          console.warn(`Gemini model ${modelName} returned status ${geminiResponse.status}:`, errText);
        }
      } catch (callErr) {
        clearTimeout(timeoutId);
        console.warn(`Gemini attempt with ${modelName} failed:`, callErr.message);
      }
    }

    if (generatedText) {
      return res.json({
        reply: generatedText,
        schemes: candidateSchemes.map(s => ({ slug: s.slug, title: s.title, level: s.level, state: s.state }))
      });
    }

    // Graceful fallback with database matches if all Gemini models fail or are throttled
    console.warn('Gemini calls failed, falling back to grounded scheme matches');
    if (candidateSchemes.length > 0) {
      const fallbackText = candidateSchemes.map(s => `• **[${s.title}](/scheme/${s.slug})** (${s.level === 'Central' ? 'Central Scheme' : s.state}): ${s.brief_description || 'Click to view benefits & eligibility.'}`).join('\n\n');
      return res.json({
        reply: `Here are matching government schemes from our national directory:\n\n${fallbackText}\n\n*💡 Tip: Click any scheme above to view eligibility & application steps.*`,
        schemes: candidateSchemes.map(s => ({ slug: s.slug, title: s.title, level: s.level, state: s.state }))
      });
    } else {
      return res.json({
        reply: "AI assistant is temporarily operating in offline mode. Please use the search bar on Home or filter tailored benefits via the **[Find Schemes For Me](/find-schemes)** tool.",
        schemes: []
      });
    }

  } catch (err) {
    console.error('Assistant chat error:', err);
    res.status(500).json({ error: 'AI assistant is temporarily unavailable. Please try again in a moment.' });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Scheme Finder Express API Server is Running!`);
  console.log(`📍 Listening on: http://localhost:${PORT}`);
  console.log(`🤖 AI Engine: Smart Offline Engine (Active)`);
  console.log(`=================================================`);
});
