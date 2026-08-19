import React from 'react';
import { marked } from 'marked';

// Decode HTML entities helper (runs repeatedly to resolve double-encoded entities like &amp;amp;)
function decodeHTMLEntities(text) {
  if (!text) return '';
  let decoded = text;
  // Resolve up to 3 passes of nested entities e.g. &amp;amp; -> &amp; -> &
  for (let i = 0; i < 3; i++) {
    if (!decoded.includes('&amp;') && !decoded.includes('&lt;') && !decoded.includes('&gt;') && !decoded.includes('&quot;') && !decoded.includes('&#39;') && !decoded.includes('&apos;')) {
      break;
    }
    const txt = document.createElement('textarea');
    txt.innerHTML = decoded;
    decoded = txt.value;
  }
  return decoded;
}

/**
 * Preprocessing step: Reconstructs malformed or stripped table-like markdown
 * (e.g. scraped raw tables where pipe separators and header rows were lost)
 * into standard GitHub-Flavored Markdown (GFM) tables or clean bulleted lists.
 */
function reconstructMalformedTables(text) {
  if (!text) return '';
  let clean = text;

  // Pattern 1: CoursesHostellersDay Scholar table (e.g., Post-Matric ST schemes)
  if (/Courses\s*Hostellers\s*Day\s*Scholar/i.test(clean)) {
    clean = clean.replace(
      /Courses\s*Hostellers\s*Day\s*Scholar([\s\S]*?)(?=(?:<br\s*\/?>|\*\*Note|\n\n|$))/i,
      (match, tableBody) => {
        const header = '\n\n| Courses | Hostellers | Day Scholar |\n| :--- | :--- | :--- |\n';
        const rowRegex = /([^]+?)(Monthly:\s*\d+[^;]*;\s*Annually:\s*\d+)(Monthly:\s*\d+[^;]*;\s*Annually:\s*\d+)/gi;
        let rows = '';
        let m;
        while ((m = rowRegex.exec(tableBody)) !== null) {
          const course = m[1].replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();
          const hosteller = m[2].replace(/\s+/g, ' ').trim();
          const dayScholar = m[3].replace(/\s+/g, ' ').trim();
          if (course && hosteller && dayScholar) {
            rows += `| ${course} | ${hosteller} | ${dayScholar} |\n`;
          }
        }
        return rows ? `${header}${rows}\n\n` : match;
      }
    );
  }

  // Pattern 2: Sl. No. Category of courses Hostellers Day Scholars
  if (/\*\*Sl\.\s*No\.\*\*\s*\*\*Category\s*of\s*courses\*\*/i.test(clean)) {
    clean = clean.replace(
      /\*\*Sl\.\s*No\.\*\*\s*\*\*Category\s*of\s*courses\*\*\s*\*\*Hostellers[^*]*\*\*\s*\*\*Day\s*Scholars[^*]*\*\*([\s\S]*?)(?=(?:\*\*Note|\n\n|$))/i,
      (match, body) => {
        const header = '\n\n| Sl. No. | Category of Courses | Hostellers (Yearly in ₹) | Day Scholars (Yearly in ₹) |\n| :--- | :--- | :--- | :--- |\n';
        const rowRegex = /(\d+)(Group\s*\d+:[^\d]+)(\d+)\s+(\d+)/gi;
        let rows = '';
        let m;
        while ((m = rowRegex.exec(body)) !== null) {
          rows += `| ${m[1]} | ${m[2].trim()} | ₹${m[3]} | ₹${m[4]} |\n`;
        }
        return rows ? `${header}${rows}\n\n` : match;
      }
    );
  }

  // Pattern 3: S. No. Category Maximum Project cost Admissible (e.g., syss Skilled Youth Startup Scheme)
  if (/\*\*S\.?\s*No\.?\*\*\s*\*\*Category\*\*\s*\*\*Maximum\s*Project\s*cost[^*]*\*\*/i.test(clean)) {
    clean = clean.replace(
      /\*\*S\.?\s*No\.?\*\*\s*\*\*Category\*\*\s*\*\*Maximum\s*Project\s*cost[^*]*\*\*([\s\S]*?)(?=(?:<br\s*\/?>|\n\n|$))/i,
      (match, body) => {
        const rowRegex = /(\d{1,2})\s*([A-Za-z][^0-9\n]*?)\s*(\d+\s*lakhs?(?:[^\d\n]*?\d+\s*lakhs?)*|Nominal funding)/gi;
        let tableRows = '';
        let m;
        while ((m = rowRegex.exec(body)) !== null) {
          const sno = m[1];
          let cat = m[2].replace(/\*+/g, '').replace(/\s+/g, ' ').trim();
          let cost = m[3].replace(/\*+/g, '').replace(/10 lakhs10 lakhs/g, '10 lakhs').replace(/20 lakhs20 lakhs/g, '20 lakhs').replace(/\s+/g, ' ').trim();
          if (cat.length > 2) {
            tableRows += `| ${sno} | ${cat} | ${cost} |\n`;
          }
        }
        if (tableRows) {
          return `\n\n| S. No. | Category | Maximum Project Cost Admissible |\n| :--- | :--- | :--- |\n${tableRows}\n\n`;
        }
        return match;
      }
    );
  }

  // Pattern 4: Generic Concatenated Header (**Col1****Col2**...) Fallback
  // If headers were run together (e.g. **Header1****Header2****Header3**), separate them with spaces
  clean = clean.replace(/\*\*([^*]+)\*\*\*\*([^*]+)\*\*/g, '**$1** | **$2**');

  return clean;
}

// Custom renderer for step labels, links, and clean responsive tables
const renderer = new marked.Renderer();

renderer.strong = (text) => {
  // Treat texts ending with ':' as step labels
  const isStep = text.trim().endsWith(':');
  if (isStep) {
    return `<p class="step-badge"><strong>${text}</strong></p>`;
  }
  return `<strong>${text}</strong>`;
};

renderer.link = (href, title, text) => {
  const safeTitle = title ? title.replace(/"/g, '&quot;') : '';
  return `<a href="${href}" title="${safeTitle}" class="md-link" target="_blank" rel="noopener noreferrer">${text}</a>`;
};

renderer.table = (header, body) => {
  return `<div class="table-container my-4 overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-900/60 shadow-md">
    <table class="w-full text-left border-collapse text-sm text-slate-200">
      <thead class="bg-slate-800/80 text-xs uppercase font-semibold text-indigo-300 border-b border-slate-700">
        ${header}
      </thead>
      <tbody class="divide-y divide-slate-800">
        ${body}
      </tbody>
    </table>
  </div>`;
};

renderer.tablerow = (content) => {
  return `<tr class="hover:bg-slate-800/40 transition-colors">${content}</tr>`;
};

renderer.tablecell = (content, flags) => {
  const type = flags.header ? 'th' : 'td';
  const tagClass = flags.header
    ? 'px-4 py-3 font-semibold text-indigo-300'
    : 'px-4 py-3 text-slate-300';
  return `<${type} class="${tagClass}">${content}</${type}>`;
};

marked.setOptions({
  renderer,
  gfm: true,
  breaks: true,
  tables: true
});

/**
 * Shared component to render markdown with custom styling.
 * Ensures step/label badges appear as block headings, adds spacing, and formats GFM tables.
 */
export default function MarkdownRenderer({ markdown }) {
  if (!markdown) return null;
  const decoded = decodeHTMLEntities(markdown);
  const structured = reconstructMalformedTables(decoded);
  const html = marked.parse(structured);
  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />;
}

