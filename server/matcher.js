const { queryAll } = require('./db');

/**
 * Rule-based Eligibility Matching Engine
 * Evaluates candidate user profile against 4,764 schemes
 */
async function matchSchemes(profile, options = {}) {
  const limit = options.limit || 50;
  const page = options.page || 1;
  const offset = (page - 1) * limit;

  // Retrieve base candidate schemes
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

  // If user selected a specific state, prioritize Central schemes + that State's schemes
  if (profile.state && profile.state !== 'All' && profile.state !== 'All States') {
    whereClauses.push(`(s.level = 'Central' OR s.state = ? OR s.state IS NULL OR s.state = '')`);
    params.push(profile.state);
  }

  if (whereClauses.length > 0) {
    sql += ` WHERE ` + whereClauses.join(' AND ');
  }

  sql += ` GROUP BY s.slug`;

  const rawSchemes = await queryAll(sql, params);

  // Normalize user profile inputs
  const userAge = parseInt(profile.age, 10) || null;
  const userGender = (profile.gender || 'All').toLowerCase();
  const userState = profile.state || 'All';
  const userCaste = (profile.caste || '').toLowerCase();
  const userIncome = parseFloat(profile.income) || null;
  const isStudent = profile.studentStatus === true || profile.studentStatus === 'true' || (profile.occupation && profile.occupation.toLowerCase() === 'student');
  const isDisabled = profile.disabilityStatus === true || profile.disabilityStatus === 'true';
  const occupation = (profile.occupation || '').toLowerCase();
  const benefitType = (profile.benefitType || '').toLowerCase();

  const scoredResults = rawSchemes.map(scheme => {
    let score = 50; // Base score for valid scheme
    const rationale = [];

    const eligText = (scheme.eligibility_md || '').toLowerCase();
    const titleText = (scheme.title || '').toLowerCase();
    const catText = (scheme.categories || '').toLowerCase();
    const tagText = (scheme.tags || '').toLowerCase();
    const fullSearchContext = `${titleText} ${catText} ${tagText} ${eligText}`;

    // 1. State / Level evaluation
    if (scheme.level === 'Central') {
      score += 15;
      rationale.push('Central Government Scheme (Nationwide)');
    } else if (scheme.state && userState.toLowerCase() === scheme.state.toLowerCase()) {
      score += 20;
      rationale.push(`State Match: ${scheme.state}`);
    }

    // 2. Gender evaluation
    const isFemaleOnly = eligText.includes('female') || eligText.includes('women') || eligText.includes('girl') || titleText.includes('women') || titleText.includes('mahila');
    if (isFemaleOnly) {
      if (userGender === 'female') {
        score += 15;
        rationale.push('Targeted Women/Female Beneficiary Scheme');
      } else if (userGender === 'male') {
        score -= 25; // Penalty for wrong gender targeting
      }
    } else {
      score += 5;
    }

    // 3. Age evaluation via regex extraction
    if (userAge !== null) {
      // Look for patterns like "18 to 35", "18-60 years", "at least 18"
      const ageRangeMatch = eligText.match(/(\d{1,2})\s*(?:to|-|and)\s*(\d{1,2})\s*years?/);
      const minAgeMatch = eligText.match(/(?:at least|minimum|above)\s*(\d{1,2})\s*years?/);

      if (ageRangeMatch) {
        const minAge = parseInt(ageRangeMatch[1], 10);
        const maxAge = parseInt(ageRangeMatch[2], 10);
        if (userAge >= minAge && userAge <= maxAge) {
          score += 15;
          rationale.push(`Age ${userAge} in eligible range (${minAge}-${maxAge} yrs)`);
        } else {
          score -= 15;
        }
      } else if (minAgeMatch) {
        const minAge = parseInt(minAgeMatch[1], 10);
        if (userAge >= minAge) {
          score += 10;
          rationale.push(`Age ${userAge} meets minimum age requirement (${minAge}+ yrs)`);
        } else {
          score -= 15;
        }
      }
    }

    // 4. Occupation / Category evaluation
    if (occupation) {
      if (occupation.includes('farmer') && (fullSearchContext.includes('farm') || fullSearchContext.includes('kisan') || fullSearchContext.includes('agriculture'))) {
        score += 20;
        rationale.push('Matches Farmer / Agriculture sector');
      } else if (occupation.includes('entrepreneur') || occupation.includes('business') || occupation.includes('self-employed')) {
        if (fullSearchContext.includes('loan') || fullSearchContext.includes('business') || fullSearchContext.includes('msme') || fullSearchContext.includes('enterprise')) {
          score += 20;
          rationale.push('Matches Entrepreneur / Business sector');
        }
      } else if (isStudent && (fullSearchContext.includes('student') || fullSearchContext.includes('scholarship') || fullSearchContext.includes('education'))) {
        score += 20;
        rationale.push('Matches Student / Scholarship scheme');
      }
    }

    // 5. Special Category (Caste / EWS / Disability)
    if (userCaste && userCaste !== 'general') {
      if (eligText.includes(userCaste) || catText.includes('social welfare')) {
        score += 10;
        rationale.push(`Includes ${userCaste.toUpperCase()} category support`);
      }
    }

    if (isDisabled && (eligText.includes('disab') || eligText.includes('handicap') || eligText.includes('divyang'))) {
      score += 20;
      rationale.push('Targeted Persons with Disabilities (Divyangjan) Scheme');
    }

    // 6. DBT Scheme bonus
    if (scheme.dbt_scheme === 1) {
      score += 5;
      rationale.push('Direct Benefit Transfer (DBT) Scheme');
    }

    // Clamp match percentage score between 35% and 98%
    const matchPercentage = Math.max(35, Math.min(98, Math.round(score)));

    return {
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
      matchScore: matchPercentage,
      rationale: rationale.slice(0, 4) // Return top 4 reasons
    };
  });

  // Sort by match score descending
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
