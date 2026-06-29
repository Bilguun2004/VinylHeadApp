const fs = require('fs');
const path = require('path');

const { meta, sections } = require('../legal/privacy-policy-data.cjs');

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatParagraph(text) {
  return text
    .split('\n')
    .map((line) => escapeHtml(line))
    .join('<br />\n        ');
}

function renderBlock(block) {
  switch (block.type) {
    case 'heading':
      if (block.level === 2) {
        return `      <h2>${escapeHtml(block.text)}</h2>`;
      }
      return `      <h3>${escapeHtml(block.text)}</h3>`;
    case 'paragraph':
      return `      <p>${formatParagraph(block.text)}</p>`;
    case 'bullets':
      return `      <ul>\n${block.items
        .map((item) => `        <li>${escapeHtml(item)}</li>`)
        .join('\n')}\n      </ul>`;
    default:
      return '';
  }
}

function renderSections() {
  return sections
    .map((section) => {
      const body = section.blocks.map((block) => renderBlock(block)).join('\n');
      return `    <section id="${escapeHtml(section.id)}">\n${body}\n    </section>`;
    })
    .join('\n\n');
}

const html = `<!DOCTYPE html>
<html lang="mn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(meta.title)} — Пянз толгойт (VinylHeadApp)</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #ffffff;
      --text: #0a0a0a;
      --muted: #6b6b6b;
      --border: #e5e5e5;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: var(--text);
      background: var(--bg);
    }
    main {
      max-width: 680px;
      margin: 0 auto;
      padding: 2rem 1.25rem 3rem;
    }
    header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.25rem;
      margin-bottom: 1.5rem;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      margin: 0 0 0.75rem;
      line-height: 1.25;
    }
    .meta {
      font-size: 0.875rem;
      color: var(--muted);
      margin: 0;
    }
    h2 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 2rem 0 0.75rem;
    }
    h3 {
      font-size: 1rem;
      font-weight: 600;
      margin: 1.25rem 0 0.5rem;
    }
    p {
      font-size: 0.9375rem;
      color: var(--muted);
      margin: 0 0 0.75rem;
    }
    ul {
      margin: 0 0 0.75rem;
      padding-left: 1.25rem;
      color: var(--muted);
      font-size: 0.9375rem;
    }
    li { margin-bottom: 0.5rem; }
    footer {
      margin-top: 2.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
      font-size: 0.8125rem;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(meta.title)}</h1>
      <p class="meta">${escapeHtml(meta.effectiveDateLabel)}: ${escapeHtml(meta.effectiveDate)}<br />
      ${escapeHtml(meta.lastUpdatedLabel)}: ${escapeHtml(meta.lastUpdated)}</p>
    </header>

${renderSections()}

    <footer>
      <p>Пянз толгойт (VinylHeadApp) — Bilguun Enkhtaivan</p>
    </footer>
  </main>
</body>
</html>
`;

const outDir = path.join(__dirname, '..', 'docs', 'privacy');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'index.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log('Wrote', outPath);
