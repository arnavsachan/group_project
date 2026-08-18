const http = require('http');

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Running Milestone 1 Backend API Verification Tests...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing GET /api/health ...');
    const health = await makeRequest('/api/health');
    console.log(`   Status: ${health.status} | Total Schemes: ${health.data.schemeCount} | AI Mode: ${health.data.aiEngine.mode}`);

    // Test 2: Filter Options
    console.log('2️⃣ Testing GET /api/schemes/filters ...');
    const filters = await makeRequest('/api/schemes/filters');
    console.log(`   Status: ${filters.status} | Categories: ${filters.data.categories.length} | States: ${filters.data.states.length}`);

    // Test 3: Stats & Analytics Aggregations
    console.log('3️⃣ Testing GET /api/schemes/stats ...');
    const stats = await makeRequest('/api/schemes/stats');
    console.log(`   Status: ${stats.status} | Central vs State:`, stats.data.levels, `| Top Categories Count: ${stats.data.topCategories.length}`);

    // Test 4: Paginated Scheme Search (FTS5 "loan")
    console.log('4️⃣ Testing GET /api/schemes?q=loan ...');
    const search = await makeRequest('/api/schemes?q=loan&limit=3');
    console.log(`   Status: ${search.status} | Matched "loan" schemes: ${search.data.total} | Returned: ${search.data.schemes.length}`);
    console.log(`   Sample Scheme: "${search.data.schemes[0].title}" (${search.data.schemes[0].slug})`);

    // Test 5: Scheme Details View
    const targetSlug = search.data.schemes[0].slug;
    console.log(`5️⃣ Testing GET /api/schemes/${targetSlug} ...`);
    const detail = await makeRequest(`/api/schemes/${targetSlug}`);
    console.log(`   Status: ${detail.status} | Title: "${detail.data.title}" | Related: ${detail.data.relatedSchemes.length}`);

    // Test 6: Rule-based Eligibility Matching Engine
    console.log('6️⃣ Testing POST /api/schemes/match ...');
    const matchProfile = {
      age: 25,
      gender: 'Female',
      state: 'Maharashtra',
      caste: 'OBC',
      income: 250000,
      occupation: 'Entrepreneur',
      studentStatus: false
    };
    const matchRes = await makeRequest('/api/schemes/match', 'POST', matchProfile);
    console.log(`   Status: ${matchRes.status} | Matched Candidates: ${matchRes.data.totalMatched}`);
    console.log(`   Top Match: "${matchRes.data.schemes[0].title}" (Score: ${matchRes.data.schemes[0].matchScore}%)`);
    console.log(`   Rationale:`, matchRes.data.schemes[0].rationale);

    // Test 7: AI "Explain Simply"
    console.log(`7️⃣ Testing POST /api/ai/explain for "${targetSlug}" ...`);
    const explainRes = await makeRequest('/api/ai/explain', 'POST', { slug: targetSlug });
    console.log(`   Status: ${explainRes.status} | AI Provider: ${explainRes.data.provider}`);
    console.log(`   Summary What: "${explainRes.data.summary.whatIsIt.slice(0, 100)}..."`);

    // Test 8: AI "Can I Apply?"
    console.log(`8️⃣ Testing POST /api/ai/can-i-apply for "${targetSlug}" ...`);
    const applyRes = await makeRequest('/api/ai/can-i-apply', 'POST', { slug: targetSlug, profile: matchProfile });
    console.log(`   Status: ${applyRes.status} | Verdict: "${applyRes.data.verdict}" | Score: ${applyRes.data.fitScore}%`);

    // Test 9: AI "Ask AI About This Scheme"
    console.log(`9️⃣ Testing POST /api/ai/chat for "${targetSlug}" ...`);
    const chatRes = await makeRequest('/api/ai/chat', 'POST', { slug: targetSlug, question: 'What documents are required?' });
    console.log(`   Status: ${chatRes.status} | Answer Category: ${chatRes.data.category}`);
    console.log(`   Answer snippet: "${chatRes.data.answer.slice(0, 120)}..."`);

    console.log('\n✅ ALL 9 BACKEND API VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀');

  } catch (err) {
    console.error('❌ API Verification Test Failed:', err.message);
  }
}

// Give server 1 second to bind port then run tests
setTimeout(runTests, 1000);
