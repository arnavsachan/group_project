const { queryAll } = require('./db');

/**
 * Intelligent Multi-Factor Scheme Matching Engine
 * Evaluates candidate schemes against comprehensive user profile with precision scoring
 */
async function matchSchemes(profile, options = {}) {
  const limit = options.limit || 50;
  const page = options.page || 1;
  const offset = (page - 1) * limit;

  // 1. Normalize profile inputs
  const userAge = parseInt(profile.age, 10) || null;
  const userGender = (profile.gender || 'All').toLowerCase().trim();
  const userState = (profile.state || 'All').trim();
  const userCategory = (profile.category || profile.caste || '').toLowerCase().trim();
  const userOccupation = (profile.occupation || '').toLowerCase().trim();
  const userIncomeStr = (profile.income || '').toLowerCase().trim();

  // Retrieve candidate schemes: Central schemes + Selected state schemes (if specified)
  let sql = `
    SELECT 
      s.id, s.slug, s.title, s.short_title, s.level, s.state, s.dbt_scheme,
      s.implementing_agency, s.nodal_ministry, s.brief_description,
      s.eligibility_md, s.benefits_md, s.application_mode,
      GROUP_CONCAT(DISTINCT c.category) as categories,
      GROUP_CONCAT(DISTINCT t.tag) as tags
    FROM schemes s
    LEFT JOIN scheme_categories c ON s.slug = c.scheme_slug
    LEFT JOIN scheme_tags t ON s.slug = t.scheme_slug
  `;

  const whereClauses = [];
  const params = [];

  if (userState && userState !== 'All' && userState !== 'All States' && userState !== 'Other') {
    whereClauses.push(`(s.level = 'Central' OR s.state = ? OR s.state IS NULL OR s.state = '')`);
    params.push(userState);
  }

  if (whereClauses.length > 0) {
    sql += ` WHERE ` + whereClauses.join(' AND ');
  }

  sql += ` GROUP BY s.slug`;

  const rawSchemes = await queryAll(sql, params);

  // 2. Score each scheme against the user profile
  const scoredResults = [];

  for (const scheme of rawSchemes) {
    let score = 30; // Clean baseline for a valid public scheme
    const rationale = [];
    let isDisqualified = false;

    const eligText = (scheme.eligibility_md || '').toLowerCase();
    const titleText = (scheme.title || '').toLowerCase();
    const catText = (scheme.categories || '').toLowerCase();
    const tagText = (scheme.tags || '').toLowerCase();
    const descText = (scheme.brief_description || '').toLowerCase();
    const combinedText = `${titleText} ${descText} ${catText} ${tagText} ${eligText}`;

    // ----------------------------------------------------
    // Factor A: STATE TARGETING (Crucial for state schemes)
    // ----------------------------------------------------
    const isStateScheme = scheme.level === 'State' && scheme.state;
    const isExactStateMatch = isStateScheme && userState !== 'All' && scheme.state.toLowerCase() === userState.toLowerCase();

    if (isExactStateMatch) {
      score += 26; // High priority boost for schemes specifically from the user's state
      rationale.push(`State Scheme: Exclusively for ${scheme.state} residents`);
    } else if (scheme.level === 'Central') {
      score += 10;
      rationale.push('Central Government Scheme (All India)');
    } else if (isStateScheme && userState !== 'All' && scheme.state.toLowerCase() !== userState.toLowerCase()) {
      isDisqualified = true; // State mismatch for a state scheme
    }

    // ----------------------------------------------------
    // Factor B: OCCUPATION & DOMAIN ALIGNMENT
    // ----------------------------------------------------
    if (userOccupation === 'student') {
      const isEduScheme = catText.includes('education') || tagText.includes('scholarship') || tagText.includes('student') ||
                          titleText.includes('scholarship') || titleText.includes('chhatravriti') || titleText.includes('chatravriti') ||
                          titleText.includes('fellowship') || titleText.includes('education') || titleText.includes('student') ||
                          descText.includes('scholarship') || descText.includes('students');

      const isBusinessOrAgri = (catText.includes('agriculture') || catText.includes('business') || tagText.includes('farmer') || tagText.includes('kisan')) && !isEduScheme;

      if (isEduScheme) {
        score += 28; // Major boost for education/scholarship schemes for a student
        rationale.push('Direct Match: Education & Student Scholarship');
      } else if (catText.includes('skills') || tagText.includes('internship') || tagText.includes('training')) {
        score += 14;
        rationale.push('Skill Development & Youth Internship');
      } else if (isBusinessOrAgri) {
        score -= 22; // Penalize agricultural/commercial enterprise schemes for students
      }
    } else if (userOccupation.includes('farmer')) {
      const isAgriScheme = catText.includes('agriculture') || tagText.includes('farmer') || tagText.includes('kisan') ||
                           titleText.includes('kisan') || titleText.includes('krishi') || titleText.includes('agri');
      if (isAgriScheme) {
        score += 28;
        rationale.push('Direct Match: Agriculture & Farmer Support');
      } else {
        score -= 10;
      }
    } else if (userOccupation.includes('unemployed')) {
      const isEmploymentScheme = catText.includes('skills') || tagText.includes('unemployed') || titleText.includes('allowance') || titleText.includes('employment');
      if (isEmploymentScheme) {
        score += 25;
        rationale.push('Employment & Unemployment Assistance');
      }
    } else if (userOccupation.includes('business') || userOccupation.includes('self-employed')) {
      const isBizScheme = catText.includes('business') || tagText.includes('msme') || tagText.includes('loan') || tagText.includes('startup');
      if (isBizScheme) {
        score += 25;
        rationale.push('Direct Match: Business & Entrepreneurship Scheme');
      }
    }

    // ----------------------------------------------------
    // Factor C: GENDER TARGETING & STRICT EXCLUSION
    // ----------------------------------------------------
    const isExclusivelyFemale = (
      titleText.includes('women scientist') ||
      titleText.includes('mahila') || titleText.includes('kanya') ||
      (titleText.includes('women') && !titleText.includes('men and women')) ||
      (titleText.includes('girl') && !titleText.includes('boys')) ||
      eligText.includes('only women') || eligText.includes('only female') || eligText.includes('women only') ||
      eligText.includes('female candidate') || eligText.includes('girl student')
    );

    if (isExclusivelyFemale) {
      if (userGender === 'female') {
        score += 18;
        rationale.push('Special Benefit: Women / Girl Beneficiaries');
      } else if (userGender === 'male') {
        isDisqualified = true; // Hard disqualification for male users on female-only schemes
      }
    }

    // ----------------------------------------------------
    // Factor D: SOCIAL CATEGORY / CASTE MATCHING
    // ----------------------------------------------------
    if (userCategory && userCategory !== 'general' && userCategory !== 'all') {
      const isCategoryTargeted = (
        eligText.includes(userCategory) || titleText.includes(userCategory) ||
        (userCategory === 'obc' && (combinedText.includes('other backward') || combinedText.includes('obc'))) ||
        (userCategory === 'sc' && (combinedText.includes('scheduled caste') || combinedText.includes(' sc '))) ||
        (userCategory === 'st' && (combinedText.includes('scheduled tribe') || combinedText.includes(' st '))) ||
        (userCategory === 'ews' && combinedText.includes('economically weaker'))
      );

      // Check if scheme is targeted to a DIFFERENT caste category exclusively
      const isOtherCasteExclusive = (
        (userCategory !== 'sc' && titleText.includes('scheduled caste') && !titleText.includes('obc')) ||
        (userCategory !== 'st' && titleText.includes('scheduled tribe') && !titleText.includes('obc'))
      );

      if (isCategoryTargeted) {
        score += 18;
        rationale.push(`Category Match: Targeted ${userCategory.toUpperCase()} Beneficiary`);
      } else if (isOtherCasteExclusive) {
        score -= 25;
      }
    }

    // ----------------------------------------------------
    // Factor E: AGE CRITERIA EVALUATION
    // ----------------------------------------------------
    if (userAge !== null) {
      const ageRangeMatch = eligText.match(/(\d{1,2})\s*(?:to|-|and)\s*(\d{1,2})\s*years?/);
      const minAgeMatch = eligText.match(/(?:at least|minimum|above)\s*(\d{1,2})\s*years?/);
      const maxAgeMatch = eligText.match(/(?:not exceeding|maximum|below|under)\s*(\d{1,2})\s*years?/);

      if (ageRangeMatch) {
        const min = parseInt(ageRangeMatch[1], 10);
        const max = parseInt(ageRangeMatch[2], 10);
        if (userAge >= min && userAge <= max) {
          score += 10;
          rationale.push(`Age ${userAge} is within eligible age range (${min}-${max} yrs)`);
        } else {
          score -= 20; // Out of explicit age range
        }
      } else if (maxAgeMatch) {
        const max = parseInt(maxAgeMatch[1], 10);
        if (userAge <= max) {
          score += 8;
        } else {
          score -= 20; // Over maximum age limit
        }
      } else if (minAgeMatch) {
        const min = parseInt(minAgeMatch[1], 10);
        if (userAge >= min) {
          score += 8;
        } else {
          score -= 20; // Under minimum age
        }
      }
    }

    // ----------------------------------------------------
    // Factor F: INCOME LEVEL EVALUATION
    // ----------------------------------------------------
    if (userIncomeStr) {
      if (userIncomeStr.includes('no income') || userIncomeStr.includes('zero') || userIncomeStr.includes('below')) {
        if (combinedText.includes('bpl') || combinedText.includes('poor') || combinedText.includes('financial assistance') || combinedText.includes('pension') || combinedText.includes('scholarship')) {
          score += 8;
          rationale.push('Low/Zero Income Support Alignment');
        }
      }
    }

    // Factor G: DBT (Direct Benefit Transfer) Bonus
    if (scheme.dbt_scheme === 1) {
      score += 4;
    }

    // Filter out completely disqualified schemes
    if (isDisqualified) continue;

    // Distribute final match score between 40% and 98% with high granularity
    const clampedScore = Math.max(38, Math.min(98, Math.round(score)));

    scoredResults.push({
      id: scheme.id,
      slug: scheme.slug,
      title: scheme.title,
      short_title: scheme.short_title,
      level: scheme.level,
      state: scheme.state,
      dbt_scheme: scheme.dbt_scheme === 1,
      implementing_agency: scheme.implementing_agency,
      nodal_ministry: scheme.nodal_ministry,
      brief_description: scheme.brief_description,
      application_mode: scheme.application_mode,
      categories: scheme.categories ? scheme.categories.split(',') : [],
      tags: scheme.tags ? scheme.tags.split(',') : [],
      matchScore: clampedScore,
      rationale: rationale.slice(0, 4)
    });
  }

  // Sort by match score descending (highest score first)
  scoredResults.sort((a, b) => b.matchScore - a.matchScore);

  const paginated = scoredResults.slice(offset, offset + limit);

  return {
    totalMatched: scoredResults.length,
    page,
    limit,
    totalPages: Math.ceil(scoredResults.length / limit),
    schemes: paginated
  };
}

module.exports = {
  matchSchemes
};

