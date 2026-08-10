/* The block editor itself: state management, rendering the block list
   UI, wiring up add/remove/reorder/edit controls, keeping the live
   preview in sync, and triggering the docx download. */

const state = {
  topsheet: {
    title: '', categories: '', summary: '', date: '', name: '', sourceFiles: '',
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

/* Splits the flat block list into groups: an (optional) preamble group
   for anything before the first section, then one group per section
   (the section header itself, plus every block that belongs to it up
   to the next section or the end of the list). Used so moving a block
   up/down can respect section boundaries, rather than treating the
   whole document as one undifferentiated list. */
function groupBlocksForOrdering(blocks) {
  const groups = [];
  let current = null;
  blocks.forEach(block => {
    if (block.type === 'section') {
      current = { sectionBlock: block, children: [] };
      groups.push(current);
    } else if (current) {
      current.children.push(block);
    } else {
      if (!groups.length || groups[0].sectionBlock) groups.unshift({ sectionBlock: null, children: [] });
      groups[0].children.push(block);
    }
  });
  return groups;
}

function flattenGroups(groups) {
  const flat = [];
  groups.forEach(g => {
    if (g.sectionBlock) flat.push(g.sectionBlock);
    flat.push(...g.children);
  });
  return flat;
}

function moveBlock(id, direction) {
  const groups = groupBlocksForOrdering(state.blocks);
  const block = findBlock(id);
  if (!block) return;

  if (block.type === 'section') {
    // Move the whole section (its header plus every child) relative
    // to the adjacent section — sections never interleave with each
    // other's content.
    const groupIdx = groups.findIndex(g => g.sectionBlock && g.sectionBlock.id === id);
    const swapWith = groupIdx + direction;
    if (swapWith < 0 || swapWith >= groups.length || !groups[swapWith].sectionBlock) return;
    [groups[groupIdx], groups[swapWith]] = [groups[swapWith], groups[groupIdx]];
  } else {
    // Move only within this block's own group of children — never
    // into a different section's children, and never past its own
    // section header.
    const group = groups.find(g => g.children.some(c => c.id === id));
    if (!group) return;
    const idx = group.children.findIndex(c => c.id === id);
    const swapWith = idx + direction;
    if (swapWith < 0 || swapWith >= group.children.length) return;
    [group.children[idx], group.children[swapWith]] = [group.children[swapWith], group.children[idx]];
  }

  state.blocks = flattenGroups(groups);
  renderAll();
}

function findBlock(id) { return state.blocks.find(b => b.id === id); }

/* ---------- Topsheet form ---------- */

const TOPSHEET_FORM_FIELDS = [
  ['title', 'Document title (shown at the top of the page)', 'text', true, 'e.g. Atopy Documentation Example'],
  ['categories', 'Categories of variables', 'text', true, 'e.g. Health'],
  ['summary', 'Summary of work undertaken', 'textarea', true, 'Briefly describe what work was undertaken and why...'],
  ['sourceVars', 'Names of source variables (one per line)', 'textarea', true, 'eczema53\nasthma53\nhayfever53'],
  ['outputVars', 'Output variables (one per line)', 'textarea', true, 'atopy_life_69\natopy_cum_score_69'],
  ['papers', 'Papers using these variables', 'textarea', true, 'Author A, et al. Title of paper. Journal. Year.'],
  ['name', 'Name of person responsible for cleaning/derivation', 'text', true, 'e.g. Dr J. Fielding'],
  ['date', 'Date of submitting documentation', 'text', true, 'e.g. 14/03/2023'],
  ['sourceFiles', 'Source data file(s)', 'text', false, 'e.g. Z:\\NSHD\\raw\\atopy_raw_2023.sav'],
  ['sourceFilesDate', 'Date source file(s) created', 'text', false, 'e.g. 02/02/2023'],
  ['syntaxProvided', 'Syntax provided (Yes/No)', 'text', false, 'Yes or No'],
  ['syntaxLocation', 'Location of syntax file', 'text', false, 'e.g. Z:\\NSHD\\syntax\\atopy_derivation.sps'],
  ['syntaxDate', 'Date syntax file created', 'text', false, 'e.g. 02/02/2023'],
  ['syntaxFormat', 'Format of syntax', 'text', false, 'e.g. SPSS'],
  ['outputDataProvided', 'Output data file provided (Yes/No)', 'text', false, 'Yes or No'],
  ['outputDate', 'Date output file created', 'text', false, 'e.g. 14/03/2023'],
  ['outputLocation', 'Location of output file', 'text', false, 'e.g. Z:\\NSHD\\output\\atopy_final.sav'],
  ['outputFormat', 'Format of output file', 'text', false, 'e.g. SPSS'],
  ['docProvided', 'Documentation provided (Yes/No)', 'text', false, 'Yes or No'],
];

function renderTopsheetForm() {
  const publicFields = TOPSHEET_FORM_FIELDS.filter(f => f[3]);
  const privateFields = TOPSHEET_FORM_FIELDS.filter(f => !f[3]);

  function fieldHtml([key, label, type, isPublic, placeholder]) {
    const value = escHtml(state.topsheet[key] || '');
    const ph = escHtml(placeholder || '');
    const input = type === 'textarea'
      ? `<textarea data-field="${key}" rows="3" class="db-input" placeholder="${ph}">${value}</textarea>`
      : `<input type="text" data-field="${key}" value="${value}" class="db-input" placeholder="${ph}">`;
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

/* Same 5-colour rotation live-preview.js uses (also excluding
   gs-card-explore, reserved for the outer page section) — strong for
   the Section block itself, a much lighter version of the same hue
   for the blocks that belong to it, so a whole section reads as one
   family of colour without collapsing into one flat undifferentiated
   block. */
const EDITOR_SECTION_COLORS = [
  { strong: 'hsl(180 45% 45%)', light: 'hsl(180 45% 88%)' },
  { strong: 'hsl(340 45% 50%)', light: 'hsl(340 45% 89%)' },
  { strong: 'hsl(125 35% 45%)', light: 'hsl(125 35% 87%)' },
  { strong: 'hsl(210 45% 45%)', light: 'hsl(210 45% 88%)' },
  { strong: 'hsl(270 35% 50%)', light: 'hsl(270 35% 89%)' },
];

function computeBlockDisplayInfo(blocks) {
  // Returns a Map from block.id -> { color, hidden, isSection }
  const info = new Map();
  let colorIndex = -1;
  let currentColor = null;
  let currentCollapsed = false;
  blocks.forEach(block => {
    if (block.type === 'section') {
      colorIndex++;
      currentColor = EDITOR_SECTION_COLORS[colorIndex % EDITOR_SECTION_COLORS.length];
      currentCollapsed = !!block.collapsed;
      info.set(block.id, { color: currentColor, hidden: false, isSection: true });
    } else {
      info.set(block.id, { color: currentColor, hidden: currentCollapsed, isSection: false });
    }
  });
  return info;
}

function renderBlockEditor(block, canMoveUp, canMoveDown, displayInfo) {
  const isSection = block.type === 'section';
  const collapseToggle = isSection
    ? `<button type="button" class="db-btn-icon" data-action="toggle-collapse" data-id="${block.id}" title="${block.collapsed ? 'Expand section' : 'Collapse section'}">${block.collapsed ? '▶' : '▼'}</button>`
    : '';
  const controls = `
    <div class="db-block-controls">
      ${collapseToggle}
      <button type="button" class="db-btn-icon" data-action="up" data-id="${block.id}" ${canMoveUp ? '' : 'disabled'} title="${isSection ? 'Move section up' : 'Move up (within this section)'}">↑</button>
      <button type="button" class="db-btn-icon" data-action="down" data-id="${block.id}" ${canMoveDown ? '' : 'disabled'} title="${isSection ? 'Move section down' : 'Move down (within this section)'}">↓</button>
      <button type="button" class="db-btn-icon db-btn-danger" data-action="remove" data-id="${block.id}" title="Remove">✕</button>
    </div>
  `;

  let body = '';
  switch (block.type) {
    case 'section':
      if (block.collapsed) {
        body = `<p class="db-collapsed-summary">"${escHtml(block.title) || '(untitled section)'}" — ${block._childCount || 0} item${block._childCount === 1 ? '' : 's'} hidden. Click ▶ to expand.</p>`;
      } else {
        body = `<label class="db-block-label">Section title (Heading 1)
        <input type="text" class="db-input" data-id="${block.id}" data-prop="title" value="${escHtml(block.title)}" placeholder="e.g. Background and Rationale">
      </label>`;
      }
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
      const rows = block.rows.map((row, ri) => `
        <tr>
          ${row.map((cell, ci) => `<td><input type="text" class="db-input db-table-cell" data-id="${block.id}" data-prop="cell" data-row="${ri}" data-col="${ci}" value="${escHtml(cell)}"></td>`).join('')}
          <td><button type="button" class="db-btn-icon db-btn-danger" data-action="remove-row" data-id="${block.id}" data-row="${ri}" ${block.rows.length <= 1 ? 'disabled' : ''}>✕</button></td>
        </tr>
      `).join('');
      body = `<label class="db-block-label">Table (first row is treated as the header)</label>
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

  let styleAttr = '';
  let headerStyleAttr = '';
  if (displayInfo && displayInfo.color) {
    if (isSection) {
      styleAttr = ` style="border-left: 5px solid ${displayInfo.color.strong};"`;
      headerStyleAttr = ` style="background: ${displayInfo.color.strong}; color: white;"`;
    } else {
      styleAttr = ` style="border-left: 5px solid ${displayInfo.color.strong}; background: ${displayInfo.color.light};"`;
    }
  }

  return `<div class="db-block${isSection ? ' db-block-section' : ''}" data-block-id="${block.id}"${styleAttr}>
    <div class="db-block-header"${headerStyleAttr}><span class="db-block-type">${typeLabel}</span>${controls}</div>
    <div class="db-block-body">${body}</div>
  </div>`;
}

/* ---------- Rendering ---------- */

function computeMoveFlags(blocks) {
  const groups = groupBlocksForOrdering(blocks);
  const flags = new Map();
  groups.forEach((group, groupIdx) => {
    if (group.sectionBlock) {
      const prevIsSection = groupIdx > 0 && !!groups[groupIdx - 1].sectionBlock;
      const nextIsSection = groupIdx < groups.length - 1 && !!groups[groupIdx + 1].sectionBlock;
      flags.set(group.sectionBlock.id, { up: prevIsSection, down: nextIsSection });
    }
    group.children.forEach((child, childIdx) => {
      flags.set(child.id, { up: childIdx > 0, down: childIdx < group.children.length - 1 });
    });
  });
  return flags;
}

function renderAll() {
  document.getElementById('db-topsheet-form').innerHTML = renderTopsheetForm();

  const displayInfo = computeBlockDisplayInfo(state.blocks);
  const moveFlags = computeMoveFlags(state.blocks);
  // Attach a child count to each collapsed section block, for its summary line
  let lastSectionId = null;
  state.blocks.forEach(b => {
    if (b.type === 'section') {
      lastSectionId = b.id;
      b._childCount = 0;
    } else if (lastSectionId) {
      const sectionBlock = state.blocks.find(sb => sb.id === lastSectionId);
      if (sectionBlock) sectionBlock._childCount = (sectionBlock._childCount || 0) + 1;
    }
  });

  const visibleBlocks = state.blocks.filter(b => !displayInfo.get(b.id).hidden);
  document.getElementById('db-block-list').innerHTML = visibleBlocks
    .map(b => {
      const flags = moveFlags.get(b.id) || { up: false, down: false };
      return renderBlockEditor(b, flags.up, flags.down, displayInfo.get(b.id));
    })
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
  document.querySelectorAll('[data-action="toggle-collapse"]').forEach(el => el.addEventListener('click', () => {
    const block = findBlock(el.dataset.id);
    if (block) { block.collapsed = !block.collapsed; renderAll(); }
  }));

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

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function saveProgress() {
  // imageBytes (a Uint8Array) isn't meaningfully JSON-serialisable —
  // dataUrl already carries the same image as a base64 string, so
  // imageBytes is dropped here and reconstructed from dataUrl on load
  // instead, rather than saving the same image data twice.
  const payload = {
    _type: 'owl-doc-builder-progress',
    _version: 1,
    topsheet: state.topsheet,
    blocks: state.blocks.map(b => {
      if (b.type === 'image') {
        const { imageBytes, ...rest } = b;
        return rest;
      }
      return b;
    }),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const filename = (state.topsheet.title || 'documentation-progress').replace(/[^A-Za-z0-9 _-]/g, '').trim() || 'documentation-progress';
  a.download = filename + '.owlprogress.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function resumeProgress(file) {
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch (e) {
    alert('That file doesn\'t look like a valid saved-progress file (couldn\'t be read as JSON).');
    return;
  }
  if (payload._type !== 'owl-doc-builder-progress') {
    alert('That file doesn\'t look like a saved-progress file from this tool. If you meant to continue editing a downloaded Word document, that can only be done in Word — it can\'t be re-uploaded here.');
    return;
  }
  if (state.blocks.length > 0 || Object.values(state.topsheet).some(v => (v || '').trim())) {
    if (!confirm('This replaces everything currently in the form with the saved progress. Continue?')) return;
  }
  state.topsheet = Object.assign({}, payload.topsheet);
  state.blocks = (payload.blocks || []).map(b => {
    if (b.type === 'image' && b.dataUrl) {
      return Object.assign({}, b, { imageBytes: dataUrlToBytes(b.dataUrl) });
    }
    return b;
  });
  renderAll();
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
    const filename = (state.topsheet.title || state.topsheet.categories || 'Documentation').replace(/[^A-Za-z0-9 _-]/g, '').trim() || 'Documentation';
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

function loadAtopyExample() {
  const hasContent = state.blocks.length > 0 || Object.values(state.topsheet).some(v => (v || '').trim());
  if (hasContent && !confirm('This replaces everything currently in the form with the Atopy example. Continue?')) {
    return;
  }
  const example = getAtopyExample();
  state.topsheet = Object.assign({}, example.topsheet);
  state.blocks = example.blocks;
  renderAll();
}

function clearForm() {
  if (!confirm('This clears the form back to blank, placeholder-only fields. Continue?')) {
    return;
  }
  Object.keys(state.topsheet).forEach(k => { state.topsheet[k] = ''; });
  state.blocks = [];
  renderAll();
}

document.addEventListener('DOMContentLoaded', () => {
  renderAll();
  document.getElementById('db-download-btn').addEventListener('click', handleDownload);
  document.querySelectorAll('[data-add-block]').forEach(btn => {
    btn.addEventListener('click', () => addBlock(btn.dataset.addBlock));
  });
  const loadBtn = document.getElementById('db-load-example-btn');
  if (loadBtn) loadBtn.addEventListener('click', loadAtopyExample);
  const clearBtn = document.getElementById('db-clear-form-btn');
  if (clearBtn) clearBtn.addEventListener('click', clearForm);
  const saveBtn = document.getElementById('db-save-progress-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveProgress);
  const resumeInput = document.getElementById('db-resume-progress-input');
  if (resumeInput) resumeInput.addEventListener('change', () => {
    if (resumeInput.files[0]) resumeProgress(resumeInput.files[0]);
    resumeInput.value = '';
  });
});