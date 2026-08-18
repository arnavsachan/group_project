import React from 'react';
import { marked } from 'marked';

// Decode HTML entities helper
function decodeHTMLEntities(text) {
  const txt = document.createElement('textarea');
  txt.innerHTML = text;
  return txt.value;
}

// Custom renderer for step labels and links
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

marked.setOptions({ renderer, gfm: true, breaks: true });

/**
 * Shared component to render markdown with custom styling.
 * Ensures step/label badges appear as block headings, adds spacing, etc.
 */
export default function MarkdownRenderer({ markdown }) {
  if (!markdown) return null;
  const html = marked.parse(decodeHTMLEntities(markdown));
  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />;
}

