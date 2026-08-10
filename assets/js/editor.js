/* The block editor itself: state management, rendering the block list
   UI, wiring up add/remove/reorder/edit controls, keeping the live
   preview in sync, and triggering the docx download. */

const state = {
  topsheet: {
    categories: '', summary: '', date: '', name: '', sourceFiles: '',
    sourceFilesDate: '', sourceVars: '', syntaxProvided: '', syntaxLocation: '',
    syntaxDate: '', syntaxFormat: '', outputDataProvided: '', outputDate: '',
    outputLocation: '', outputFormat: '', docProvided: '', papers: '', outputVars: '',
  },
  blocks: [],
};

let blockIdCounter = 0;
function newBlockId() { return 'blk-' + (++blockIdCounter); }

function addBlock(type) {
  const base = { id: newBlockId(), type };
  const defaults = {
    section: { title: '' },
    subheading: { style: 'heading2', text: '' },
    paragraph: { runs: [{ text: '' }] },
    bulleted_list: { items: [''] },
    numbered_list: { items: ['', ''] }, // starts with 2, nudging away from the single-item trap
    table: { rows: [['', ''], ['', '']] },
    image: { dataUrl: null, imageBytes: null, caption: '', width: 400, height: 300, imageType: 'png' },
  };
  state.blocks.push(Object.assign(base, defaults[type]));
  renderAll();
}

function removeBlock(id) {
  state.blocks = state.blocks.filter(b => b.id !== id);
  renderAll();
}

function moveBlock(id, direction) {
  const idx = state.blocks.findIndex(b => b.id === id);
  const swapWith = idx + direction;
  if (swapWith < 0 || swapWith >= state.blocks.length) return;
  [state.blocks[idx], state.blocks[swapWith]] = [state.blocks[swapWith], state.blocks[idx]];
  renderAll();
}

function findBlock(id) { return state.blocks.find(b => b.id === id); }

/* ---------- Topsheet form ---------- */

const TOPSHEET_FORM_FIELDS = [
  ['categories', 'Categories of variables', 'text', true],
  ['summary', 'Summary of work undertaken', 'textarea', true],
  ['sourceVars', 'Names of source variables (one per line)', 'textarea', true],
  ['outputVars', 'Output variables (one per line)', 'textarea', true],
  ['papers', 'Papers using these variables', 'textarea', true],
  ['date', 'Date of submitting documentation', 'text', false],
  ['name', 'Name of person responsible for cleaning/derivation', 'text', false],
  ['sourceFiles', 'Source data file(s)', 'text', false],
  ['sourceFilesDate', 'Date source file(s) created', 'text', false],
  ['syntaxProvided', 'Syntax provided (Yes/No)', 'text', false],
  ['syntaxLocation', 'Location of syntax file', 'text', false],
  ['syntaxDate', 'Date syntax file created', 'text', false],
  ['syntaxFormat', 'Format of syntax', 'text', false],
  ['outputDataProvided', 'Output data file provided (Yes/No)', 'text', false],
  ['outputDate', 'Date output file created', 'text', false],
  ['outputLocation', 'Location of output file', 'text', false],
  ['outputFormat', 'Format of output file', 'text', false],
  ['docProvided', 'Documentation provided (Yes/No)', 'text', false],
];

function renderTopsheetForm() {
  const publicFields = TOPSHEET_FORM_FIELDS.filter(f => f[3]);
  const privateFields = TOPSHEET_FORM_FIELDS.filter(f => !f[3]);

  function fieldHtml([key, label, type]) {
    const value = escHtml(state.topsheet[key] || '');
    const input = type === 'textarea'
      ? `<textarea data-field="${key}" rows="3" class="db-input">${value}</textarea>`
      : `<input type="text" data-field="${key}" value="${value}" class="db-input">`;
    return `<label class="db-field-label">${escHtml(label)}${input}</label>`;
  }

  return `
    <div class="db-topsheet-section db-topsheet-public">
      <h3>Public fields (shown on the page)</h3>
      ${publicFields.map(fieldHtml).join('')}
    </div>
    <details class="db-topsheet-private">
      <summary>Private fields (kept internal, never published) — click to expand</summary>
      <div class="db-topsheet-section">
        ${privateFields.map(fieldHtml).join('')}
      </div>
    </details>
  `;
}

/* ---------- Block list rendering ---------- */

function renderBlockEditor(block, index, total) {
  const controls = `
    <div class="db-block-controls">
      <button type="button" class="db-btn-icon" data-action="up" data-id="${block.id}" ${index === 0 ? 'disabled' : ''} title="Move up">↑</button>
      <button type="button" class="db-btn-icon" data-action="down" data-id="${block.id}" ${index === total - 1 ? 'disabled' : ''} title="Move down">↓</button>
      <button type="button" class="db-btn-icon db-btn-danger" data-action="remove" data-id="${block.id}" title="Remove">✕</button>
    </div>
  `;

  let body = '';
  switch (block.type) {
    case 'section':
      body = `<label class="db-block-label">Section title (Heading 1)
        <input type="text" class="db-input" data-id="${block.id}" data-prop="title" value="${escHtml(block.title)}" placeholder="e.g. Background and Rationale">
      </label>`;
      break;

    case 'subheading':
      body = `
        <label class="db-block-label">Subheading style
          <select class="db-input" data-id="${block.id}" data-prop="style">
            <option value="heading2" ${block.style === 'heading2' ? 'selected' : ''}>Heading 2</option>
            <option value="bold_underline" ${block.style === 'bold_underline' ? 'selected' : ''}>Bold + Underline</option>
            <option value="underline" ${block.style === 'underline' ? 'selected' : ''}>Underline only</option>
            <option value="bold" ${block.style === 'bold' ? 'selected' : ''}>Bold only</option>
          </select>
        </label>
        <label class="db-block-label">Subheading text
          <input type="text" class="db-input" data-id="${block.id}" data-prop="text" value="${escHtml(block.text)}">
        </label>
      `;
      break;

    case 'paragraph': {
      const runs = block.runs && block.runs.length ? block.runs : [{ text: '' }];
      const runRows = runs.map((run, i) => `
        <div class="db-run-row" data-run-index="${i}">
          <input type="text" class="db-input db-run-text" data-id="${block.id}" data-run-index="${i}" value="${escHtml(run.text)}" placeholder="${i === 0 ? 'Start typing…' : 'Next segment…'}">
          <label class="db-run-toggle"><input type="checkbox" data-id="${block.id}" data-run-index="${i}" data-run-prop="bold" ${run.bold ? 'checked' : ''}><strong>B</strong></label>
          <label class="db-run-toggle"><input type="checkbox" data-id="${block.id}" data-run-index="${i}" data-run-prop="italic" ${run.italic ? 'checked' : ''}><em>I</em></label>
          <label class="db-run-toggle"><input type="checkbox" data-id="${block.id}" data-run-index="${i}" data-run-prop="underline" ${run.underline ? 'checked' : ''}><u>U</u></label>
          <button type="button" class="db-btn-icon db-btn-danger" data-action="remove-run" data-id="${block.id}" data-run-index="${i}" ${runs.length <= 1 ? 'disabled' : ''}>✕</button>
        </div>
      `).join('');
      body = `<label class="db-block-label">Paragraph text</label>
      <p class="db-hint">Built from one or more segments, in order. Tick B / I / U on a segment to format just that part — split a new segment off wherever the formatting needs to change.</p>
      ${runRows}
      <button type="button" class="db-btn-add-item" data-action="add-run" data-id="${block.id}">+ Add segment</button>`;
      break;
    }

    case 'bulleted_list':
    case 'numbered_list': {
      const label = block.type === 'bulleted_list' ? 'Bulleted list items' : 'Numbered list items';
      const minNote = block.type === 'numbered_list'
        ? '<p class="db-hint">Needs at least 2 items — a single numbered item reads as a heading, not a list, once published.</p>'
        : '';
      const items = (block.items || []).map((item, i) => `
        <div class="db-list-item-row">
          <input type="text" class="db-input" data-id="${block.id}" data-prop="item" data-item-index="${i}" value="${escHtml(item)}">
          <button type="button" class="db-btn-icon db-btn-danger" data-action="remove-item" data-id="${block.id}" data-item-index="${i}" ${block.items.length <= (block.type === 'numbered_list' ? 2 : 1) ? 'disabled' : ''}>✕</button>
        </div>
      `).join('');
      body = `<label class="db-block-label">${label}</label>${minNote}${items}
        <button type="button" class="db-btn-add-item" data-action="add-item" data-id="${block.id}">+ Add item</button>`;
      break;
    }

    case 'table': {
      const colCount = (block.rows[0] || []).length;
      const wideWarning = colCount > 4
        ? `<p class="db-hint db-hint-warning">This table has ${colCount} columns. On the published page, wide tables can overflow past the edge of their coloured section rather than shrinking to fit — keeping tables to around 4 columns or fewer avoids this.</p>`
        : '';
      const rows = block.rows.map((row, ri) => `
        <tr>
          ${row.map((cell, ci) => `<td><input type="text" class="db-input db-table-cell" data-id="${block.id}" data-prop="cell" data-row="${ri}" data-col="${ci}" value="${escHtml(cell)}"></td>`).join('')}
          <td><button type="button" class="db-btn-icon db-btn-danger" data-action="remove-row" data-id="${block.id}" data-row="${ri}" ${block.rows.length <= 1 ? 'disabled' : ''}>✕</button></td>
        </tr>
      `).join('');
      body = `<label class="db-block-label">Table (first row is treated as the header)</label>
        ${wideWarning}
        <div class="db-table-scroll"><table class="db-table-editor"><tbody>${rows}</tbody></table></div>
        <div class="db-table-buttons">
          <button type="button" class="db-btn-add-item" data-action="add-row" data-id="${block.id}">+ Add row</button>
          <button type="button" class="db-btn-add-item" data-action="add-col" data-id="${block.id}">+ Add column</button>
        </div>`;
      break;
    }

    case 'image': {
      const preview = block.dataUrl ? `<img src="${block.dataUrl}" class="db-image-preview">` : '<p class="db-hint">No image chosen yet.</p>';
      body = `<label class="db-block-label">Image
        <input type="file" accept="image/png,image/jpeg" data-id="${block.id}" data-prop="imageFile" class="db-input">
      </label>
      ${preview}
      <label class="db-block-label">Caption (optional)
        <input type="text" class="db-input" data-id="${block.id}" data-prop="caption" value="${escHtml(block.caption || '')}">
      </label>`;
      break;
    }
  }

  const typeLabel = { section: 'Section (Heading 1)', subheading: 'Subheading', paragraph: 'Paragraph',
    bulleted_list: 'Bulleted list', numbered_list: 'Numbered list', table: 'Table', image: 'Image' }[block.type];

  return `<div class="db-block" data-block-id="${block.id}">
    <div class="db-block-header"><span class="db-block-type">${typeLabel}</span>${controls}</div>
    <div class="db-block-body">${body}</div>
  </div>`;
}

/* ---------- Rendering ---------- */

function renderAll() {
  document.getElementById('db-topsheet-form').innerHTML = renderTopsheetForm();
  document.getElementById('db-block-list').innerHTML = state.blocks
    .map((b, i) => renderBlockEditor(b, i, state.blocks.length))
    .join('') || '<p class="db-hint">No blocks yet — add your first section below.</p>';
  document.getElementById('db-live-preview').innerHTML = renderLivePreview(state.topsheet, state.blocks);
  attachHandlers();
}

function attachHandlers() {
  // Topsheet fields
  document.querySelectorAll('#db-topsheet-form [data-field]').forEach(el => {
    el.addEventListener('input', () => {
      state.topsheet[el.dataset.field] = el.value;
      document.getElementById('db-live-preview').innerHTML = renderLivePreview(state.topsheet, state.blocks);
    });
  });

  // Block-level controls
  document.querySelectorAll('[data-action="up"]').forEach(el => el.addEventListener('click', () => moveBlock(el.dataset.id, -1)));
  document.querySelectorAll('[data-action="down"]').forEach(el => el.addEventListener('click', () => moveBlock(el.dataset.id, 1)));
  document.querySelectorAll('[data-action="remove"]').forEach(el => el.addEventListener('click', () => removeBlock(el.dataset.id)));

  // Simple field edits (title, subheading style/text, paragraph text, caption)
  document.querySelectorAll('[data-prop="title"], [data-prop="text"], [data-prop="style"], [data-prop="caption"]').forEach(el => {
    el.addEventListener('input', () => {
      const block = findBlock(el.dataset.id);
      if (block) { block[el.dataset.prop] = el.value; syncPreviewOnly(); }
    });
  });

  document.querySelectorAll('[data-prop="paragraphText"]').forEach(el => {
    // legacy — no longer rendered, kept only so old saved state (if any) doesn't error
  });
  document.querySelectorAll('.db-run-text').forEach(el => {
    el.addEventListener('input', () => {
      const block = findBlock(el.dataset.id);
      if (block) { block.runs[parseInt(el.dataset.runIndex, 10)].text = el.value; syncPreviewOnly(); }
    });
  });
  document.querySelectorAll('[data-run-prop]').forEach(el => {
    el.addEventListener('change', () => {
      const block = findBlock(el.dataset.id);
      if (block) { block.runs[parseInt(el.dataset.runIndex, 10)][el.dataset.runProp] = el.checked; syncPreviewOnly(); }
    });
  });
  document.querySelectorAll('[data-action="add-run"]').forEach(el => el.addEventListener('click', () => {
    const block = findBlock(el.dataset.id);
    if (block) { block.runs.push({ text: '' }); renderAll(); }
  }));
  document.querySelectorAll('[data-action="remove-run"]').forEach(el => el.addEventListener('click', () => {
    const block = findBlock(el.dataset.id);
    if (block) { block.runs.splice(parseInt(el.dataset.runIndex, 10), 1); renderAll(); }
  }));

  // List items
  document.querySelectorAll('[data-prop="item"]').forEach(el => {
    el.addEventListener('input', () => {
      const block = findBlock(el.dataset.id);
      if (block) { block.items[parseInt(el.dataset.itemIndex, 10)] = el.value; syncPreviewOnly(); }
    });
  });
  document.querySelectorAll('[data-action="add-item"]').forEach(el => el.addEventListener('click', () => {
    const block = findBlock(el.dataset.id);
    if (block) { block.items.push(''); renderAll(); }
  }));
  document.querySelectorAll('[data-action="remove-item"]').forEach(el => el.addEventListener('click', () => {
    const block = findBlock(el.dataset.id);
    if (block) { block.items.splice(parseInt(el.dataset.itemIndex, 10), 1); renderAll(); }
  }));

  // Table cells
  document.querySelectorAll('[data-prop="cell"]').forEach(el => {
    el.addEventListener('input', () => {
      const block = findBlock(el.dataset.id);
      if (block) { block.rows[parseInt(el.dataset.row, 10)][parseInt(el.dataset.col, 10)] = el.value; syncPreviewOnly(); }
    });
  });
  document.querySelectorAll('[data-action="add-row"]').forEach(el => el.addEventListener('click', () => {
    const block = findBlock(el.dataset.id);
    if (block) { block.rows.push(block.rows[0].map(() => '')); renderAll(); }
  }));
  document.querySelectorAll('[data-action="add-col"]').forEach(el => el.addEventListener('click', () => {
    const block = findBlock(el.dataset.id);
    if (block) { block.rows.forEach(r => r.push('')); renderAll(); }
  }));
  document.querySelectorAll('[data-action="remove-row"]').forEach(el => el.addEventListener('click', () => {
    const block = findBlock(el.dataset.id);
    if (block) { block.rows.splice(parseInt(el.dataset.row, 10), 1); renderAll(); }
  }));

  // Image upload
  document.querySelectorAll('[data-prop="imageFile"]').forEach(el => {
    el.addEventListener('change', async () => {
      const file = el.files[0];
      if (!file) return;
      const block = findBlock(el.dataset.id);
      if (!block) return;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const dataUrl = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      const img = new Image();
      img.onload = () => {
        block.imageBytes = bytes;
        block.dataUrl = dataUrl;
        block.imageType = file.type.includes('png') ? 'png' : 'jpg';
        // Cap displayed/exported size at a sensible max width, preserving aspect ratio
        const maxW = 500;
        block.width = Math.min(img.width, maxW);
        block.height = Math.round(img.height * (block.width / img.width));
        renderAll();
      };
      img.src = dataUrl;
    });
  });
}

function syncPreviewOnly() {
  document.getElementById('db-live-preview').innerHTML = renderLivePreview(state.topsheet, state.blocks);
}

async function handleDownload() {
  const btn = document.getElementById('db-download-btn');
  btn.disabled = true;
  btn.textContent = 'Building document…';
  try {
    const blob = await generateDocx(state.topsheet, state.blocks);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = (state.topsheet.categories || 'Documentation').replace(/[^A-Za-z0-9 _-]/g, '').trim() || 'Documentation';
    a.download = filename + '.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('Something went wrong building the document: ' + e.message);
    console.error(e);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Download as Word document';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderAll();
  document.getElementById('db-download-btn').addEventListener('click', handleDownload);
  document.querySelectorAll('[data-add-block]').forEach(btn => {
    btn.addEventListener('click', () => addBlock(btn.dataset.addBlock));
  });
});