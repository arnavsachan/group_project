/**
 * Smart Offline AI Model Engine
 * Synthesizes answers directly from scheme markdown guidelines
 * Decoupled structure allowing future LLM API plugins
 */

class SmartOfflineAiService {
  constructor() {
    this.provider = 'smart-offline';
    this.status = 'active';
  }

  // 1. "Explain Simply" - Plain English 3-bullet breakdown
  explainSimply(scheme) {
    if (!scheme) return { error: 'Scheme data required' };

    const title = scheme.title || 'Government Scheme';
    const briefDesc = scheme.brief_description || scheme.detailed_description_md || '';
    const benefitsMd = scheme.benefits_md || '';
    const eligMd = scheme.eligibility_md || '';

    // Extract first 2 sentences from brief description
    const overviewSentences = briefDesc
      .replace(/[#*`_]/g, '')
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.length > 10)
      .slice(0, 2)
      .join(' ');

    const whatIsIt = overviewSentences || `${title} is a ${scheme.level || 'Government'} initiative designed to provide support to citizens.`;

    // Extract top 3 benefit bullet points from markdown
    const benefitBullets = (benefitsMd.match(/[-*•]\s*(.*)/g) || [])
      .map(b => b.replace(/^[-*•]\s*/, '').trim())
      .filter(b => b.length > 5)
      .slice(0, 3);

    const keyBenefits = benefitBullets.length > 0
      ? benefitBullets
      : [
          `Financial assistance / subsidy as per ${scheme.level || 'Government'} guidelines.`,
          `Direct Benefit Transfer (DBT) eligible for verified bank account holders.`,
          `Implementation managed by ${scheme.implementing_agency || scheme.nodal_ministry || 'concerned ministry'}.`
        ];

    // Extract top 3 eligibility bullet points
    const eligBullets = (eligMd.match(/[-*•]\s*(.*)/g) || [])
      .map(b => b.replace(/^[-*•]\s*/, '').trim())
      .filter(b => b.length > 5)
      .slice(0, 3);

    const keyEligibility = eligBullets.length > 0
      ? eligBullets
      : [
          `Open to Indian citizens residing in ${scheme.state || 'eligible States/UTs'}.`,
          `Must fulfill targeted criteria specified by ${scheme.nodal_ministry || 'implementing agency'}.`,
          `Valid photo ID and supporting verification documents required.`
        ];

    return {
      provider: this.provider,
      mode: 'Smart Offline Engine',
      schemeTitle: title,
      summary: {
        whatIsIt,
        keyBenefits,
        keyEligibility
      }
    };
  }

  // 2. "Can I Apply?" - Interactive Feasibility Assessment
  canIApply(scheme, profile = {}) {
    if (!scheme) return { error: 'Scheme data required' };

    const eligMd = (scheme.eligibility_md || '').toLowerCase();
    const state = scheme.state || 'Central';
    const userState = profile.state || 'All';
    const userAge = parseInt(profile.age, 10) || null;
    const userGender = (profile.gender || 'All').toLowerCase();

    const criteriaChecks = [];
    let passCount = 0;
    let totalChecks = 0;

    // Check 1: State / Jurisdiction
    totalChecks++;
    if (scheme.level === 'Central') {
      passCount++;
      criteriaChecks.push({ check: 'Jurisdiction', status: 'PASS', detail: 'This is a Central Scheme applicable nationwide.' });
    } else if (state && userState.toLowerCase() === state.toLowerCase()) {
      passCount++;
      criteriaChecks.push({ check: 'Jurisdiction', status: 'PASS', detail: `You reside in ${userState}, matching the scheme state.` });
    } else if (userState === 'All') {
      passCount += 0.5;
      criteriaChecks.push({ check: 'Jurisdiction', status: 'INFO', detail: `Scheme is specific to ${state}. Check if state residence applies.` });
    } else {
      criteriaChecks.push({ check: 'Jurisdiction', status: 'WARN', detail: `Scheme is designated for ${state}. You selected ${userState}.` });
    }

    // Check 2: Gender
    totalChecks++;
    const femaleOnly = eligMd.includes('women') || eligMd.includes('female') || eligMd.includes('girl');
    if (femaleOnly) {
      if (userGender === 'female') {
        passCount++;
        criteriaChecks.push({ check: 'Gender Criteria', status: 'PASS', detail: 'Matches female / women targeted scheme criteria.' });
      } else if (userGender === 'male') {
        criteriaChecks.push({ check: 'Gender Criteria', status: 'FAIL', detail: 'This scheme is specifically reserved for female applicants.' });
      } else {
        passCount += 0.5;
        criteriaChecks.push({ check: 'Gender Criteria', status: 'INFO', detail: 'Scheme prioritizes female applicants.' });
      }
    } else {
      passCount++;
      criteriaChecks.push({ check: 'Gender Criteria', status: 'PASS', detail: 'Scheme is gender-inclusive for all citizens.' });
    }

    // Check 3: Age Range
    totalChecks++;
    const ageMatch = eligMd.match(/(\d{1,2})\s*(?:to|-|and)\s*(\d{1,2})\s*years?/);
    if (ageMatch && userAge) {
      const minAge = parseInt(ageMatch[1], 10);
      const maxAge = parseInt(ageMatch[2], 10);
      if (userAge >= minAge && userAge <= maxAge) {
        passCount++;
        criteriaChecks.push({ check: 'Age Criteria', status: 'PASS', detail: `Your age (${userAge}) is within the required ${minAge}-${maxAge} range.` });
      } else {
        criteriaChecks.push({ check: 'Age Criteria', status: 'WARN', detail: `Your age (${userAge}) is outside the typical ${minAge}-${maxAge} range.` });
      }
    } else {
      passCount++;
      criteriaChecks.push({ check: 'Age Criteria', status: 'PASS', detail: 'General age guidelines apply. Verify identity documents.' });
    }

    // Check 4: Documentation
    totalChecks++;
    if (scheme.documents_md) {
      passCount++;
      criteriaChecks.push({ check: 'Document Readiness', status: 'PASS', detail: 'Document checklist available (Aadhaar, Bank Passbook, Residence Proof).' });
    } else {
      passCount += 0.5;
      criteriaChecks.push({ check: 'Document Readiness', status: 'INFO', detail: 'Standard KYC identity documents required.' });
    }

    const fitScore = Math.round((passCount / totalChecks) * 100);
    let verdict = 'High Eligibility Fit';
    let verdictColor = 'green';
    if (fitScore < 60) {
      verdict = 'Detailed Criteria Review Recommended';
      verdictColor = 'amber';
    } else if (fitScore < 85) {
      verdict = 'Moderate Fit — Check Specific Guidelines';
      verdictColor = 'blue';
    }

    return {
      provider: this.provider,
      mode: 'Smart Offline Engine',
      verdict,
      fitScore,
      verdictColor,
      criteriaChecks,
      actionableAdvice: `Based on your profile, you have a ${fitScore}% match rate. Review the required documents tab and proceed to apply via ${scheme.application_mode || 'Official Portal'}.`
    };
  }

  // 3. "Ask AI About This Scheme" - Contextual Q&A
  askAiAboutScheme(scheme, question = '') {
    if (!scheme) return { error: 'Scheme data required' };

    const q = (question || '').toLowerCase().trim();
    const title = scheme.title || 'this scheme';

    const fullCorpus = `
Title: ${scheme.title}
Level: ${scheme.level} ${scheme.state || ''}
Agency: ${scheme.implementing_agency || ''} Ministry: ${scheme.nodal_ministry || ''}
Description: ${scheme.brief_description || ''} ${scheme.detailed_description_md || ''}
Eligibility: ${scheme.eligibility_md || ''}
Benefits: ${scheme.benefits_md || ''}
Documents Required: ${scheme.documents_md || ''}
Application Process: ${scheme.application_process_md || ''}
URL: ${scheme.application_url || ''}
Mode: ${scheme.application_mode || ''}
    `.trim();

    let answerCategory = 'general';
    let answerText = '';

    if (q.includes('document') || q.includes('proof') || q.includes('aadhaar') || q.includes('card') || q.includes('certificate')) {
      answerCategory = 'documents';
      if (scheme.documents_md) {
        answerText = `### 📄 Required Documents for ${title}:\n\n${scheme.documents_md}\n\nMake sure all documents are self-attested or verified as required by ${scheme.implementing_agency || 'the issuing authority'}.`;
      } else {
        answerText = `### 📄 Standard Documents Required for ${title}:\n\n- Aadhaar Card / Voter ID (Identity Proof)\n- Proof of Residence / Domicile Certificate\n- Bank Account Passbook (for DBT transfer)\n- Passport size photographs`;
      }
    } else if (q.includes('apply') || q.includes('process') || q.includes('how to') || q.includes('link') || q.includes('online') || q.includes('portal') || q.includes('form')) {
      answerCategory = 'application';
      const appUrl = scheme.application_url ? `\n\n**Official Portal / Form Link:** [${scheme.application_url}](${scheme.application_url})` : '';
      if (scheme.application_process_md) {
        answerText = `### 📝 How to Apply for ${title} (${scheme.application_mode || 'Online'}):\n\n${scheme.application_process_md}${appUrl}`;
      } else {
        answerText = `### 📝 Application Instructions for ${title}:\n\nApplication Mode: **${scheme.application_mode || 'Online / Offline'}**${appUrl}\n\n1. Visit your nearest bank branch or nodal office of ${scheme.implementing_agency || 'the concerned department'}.\n2. Fill out the application form with required personal and bank details.\n3. Attach mandatory documents and submit.`;
      }
    } else if (q.includes('benefit') || q.includes('amount') || q.includes('money') || q.includes('loan') || q.includes('pension') || q.includes('subsidy') || q.includes('get')) {
      answerCategory = 'benefits';
      if (scheme.benefits_md) {
        answerText = `### 🎁 Benefits & Financial Assistance under ${title}:\n\n${scheme.benefits_md}`;
      } else {
        answerText = `### 🎁 Financial Assistance under ${title}:\n\nThis scheme provides government support, subsidies, or direct assistance managed by ${scheme.nodal_ministry || 'the Nodal Ministry'}. Direct Benefit Transfer (DBT) is enabled where applicable.`;
      }
    } else if (q.includes('eligible') || q.includes('who can') || q.includes('age') || q.includes('income') || q.includes('caste') || q.includes('student') || q.includes('farmer')) {
      answerCategory = 'eligibility';
      if (scheme.eligibility_md) {
        answerText = `### 👤 Eligibility Criteria for ${title}:\n\n${scheme.eligibility_md}`;
      } else {
        answerText = `### 👤 Eligibility Overview for ${title}:\n\nTarget Beneficiaries: ${scheme.target_beneficiaries || 'Citizens meeting nodal guidelines'}.\nLevel: ${scheme.level} Scheme (${scheme.state || 'All India'}).`;
      }
    } else {
      // General Q&A synthesis
      answerText = `### ℹ️ Scheme Information for "${question}":\n\n**${title}** is a ${scheme.level} scheme under ${scheme.nodal_ministry || 'the Government'}.\n\n- **Brief Summary:** ${scheme.brief_description || 'Refer to the detailed description tab.'}\n- **Application Mode:** ${scheme.application_mode || 'Online/Offline'}\n\n*You can ask specific questions about required documents, application process, benefits, or eligibility!*`;
    }

    return {
      provider: this.provider,
      mode: 'Smart Offline Engine',
      question,
      category: answerCategory,
      answer: answerText
    };
  }
}

module.exports = new SmartOfflineAiService();
