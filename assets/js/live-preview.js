/* Renders the same block data model used by docx-generator.js into
   HTML matching the real site's styling — reuses the same CSS classes
   established in html_render.py (Page Proof's HTML preview), so a
   document built here looks the same as one checked through Page Proof
   or eventually published for real. */

function escHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const TOPSHEET_PUBLIC_FIELDS = [
  ['categories', 'Categories of variables'],
  ['summary', 'Summary of work undertaken'],
  ['sourceVars', 'Names of source variables'],
  ['outputVars', 'Output variables'],
  ['papers', 'Papers using these variables'],
];

function renderDetailsTable(topsheet) {
  const rows = TOPSHEET_PUBLIC_FIELDS
    .filter(([key]) => (topsheet[key] || '').trim())
    .map(([key, label]) => {
      const value = topsheet[key].split('\n').filter(l => l.trim()).join(', ');
      return `<tr><td>${escHtml(label)}</td><td>${escHtml(value)}</td></tr>`;
    })
    .join('');
  if (!rows) return '';
  return `<table class="doc-details-table">${rows}</table>`;
}

function renderInline(runs) {
  if (!runs || !runs.length) return '';
  return runs.map(r => {
    let t = escHtml(r.text || '');
    if (r.bold) t = `<strong>${t}</strong>`;
    if (r.italic) t = `<em>${t}</em>`;
    if (r.underline) t = `<u>${t}</u>`;
    return t;
  }).join('');
}

function renderBlock(block) {
  switch (block.type) {
    case 'section':
      return `<h2>${escHtml(block.title)}</h2>`;

    case 'subheading': {
      const text = escHtml(block.text);
      if (block.style === 'heading2') return `<h3>${text}</h3>`;
      if (block.style === 'bold_underline') return `<p class="doc-subheading"><strong><u>${text}</u></strong></p>`;
      if (block.style === 'underline') return `<p class="doc-subheading"><u>${text}</u></p>`;
      return `<p class="doc-subheading"><strong>${text}</strong></p>`;
    }

    case 'paragraph':
      return `<p>${renderInline(block.runs)}</p>`;

    case 'bulleted_list': {
      const items = (block.items || []).filter(t => t.trim()).map(t => `<li>${escHtml(t)}</li>`).join('');
      return items ? `<ul>${items}</ul>` : '';
    }

    case 'numbered_list': {
      const items = (block.items || []).filter(t => t.trim()).map(t => `<li>${escHtml(t)}</li>`).join('');
      return items ? `<ol>${items}</ol>` : '';
    }

    case 'table': {
      const rows = block.rows || [];
      if (!rows.length) return '';
      const trs = rows.map((row, ri) => {
        const cells = row.map(c => ri === 0 ? `<th>${escHtml(c)}</th>` : `<td>${escHtml(c)}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table>${trs}</table>`;
    }

    case 'image': {
      if (!block.dataUrl) return '';
      const cap = block.caption ? `<p style="font-size:0.9em;color:#555;font-style:italic;">${escHtml(block.caption)}</p>` : '';
      return `<img src="${block.dataUrl}" style="max-width:100%;height:auto;">${cap}`;
    }

    default:
      return '';
  }
}

function renderLivePreview(topsheet, blocks) {
  const detailsHtml = renderDetailsTable(topsheet);
  const bodyHtml = blocks.map(renderBlock).join('\n');

  return `
    <div class="doc-details-box">
      <h2 id="live-preview-details">Document details</h2>
      ${detailsHtml || '<p style="color:#999;font-style:italic;">No public fields filled in yet.</p>'}
    </div>
    <div class="doc-content-body">
      ${bodyHtml || '<p style="color:#999;font-style:italic;">Add a block below to start writing.</p>'}
    </div>
  `;
}

if (typeof module !== 'undefined') {
  module.exports = { renderLivePreview };
}
