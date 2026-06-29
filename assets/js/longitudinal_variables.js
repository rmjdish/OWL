document.addEventListener("DOMContentLoaded", () => {

  const SITE_BASEURL  = "/OWL";
  const DICT_URL      = `${SITE_BASEURL}/docs/data_dictionary/NSHD_Data_Dictionary_Public.json`;
  const SIDECAR_BASE  = `${SITE_BASEURL}/assets/variable_metadata/`;
  const PAGE_SIZE     = 20;

  let allFields      = [];
  let filteredFields = [];
  let currentPage    = 1;
  const openPanels   = new Set();
  const loadedPanels = new Set();
  const chartRegistry = {};

  // ── Helpers ────────────────────────────────────────────────────────────────

  function yearToSort(y) {
    const m = String(y || '').match(/(\d{4})/);
    return m ? parseInt(m[1]) : 0;
  }

  function yearToAge(y) {
    const s  = String(y || '');
    const m1 = s.match(/^(\d{4})-(\d{2})$/);
    if (m1) {
      const y1 = parseInt(m1[1]);
      const y2 = parseInt(m1[1].slice(0, 2) + m1[2]);
      return `${y1 - 1946}–${y2 - 1946}`;
    }
    const m2 = s.match(/^(\d{4})[-–](\d{4})$/);
    if (m2) return `${parseInt(m2[1]) - 1946}–${parseInt(m2[2]) - 1946}`;
    const yr = yearToSort(y);
    return yr ? String(yr - 1946) : '';
  }

  function stripId(s) {
    return (s || '').replace(/\s*\[.*?\]/g, '').trim();
  }

  function cleanLabel(s) {
    return (s || '').replace(/\s*-?\s*(?:at|aged?)\s+age\s+[\d–\-]+\s*(?:years?)?\s*\.?\s*$/gi, '').trim();
  }

  function fmt(n) {
    if (n === null || n === undefined) return '—';
    return parseFloat(n.toFixed(1)).toLocaleString();
  }

  // ── DOM refs ───────────────────────────────────────────────────────────────

  const loadingScreen  = document.getElementById('loadingScreen');
  const mainUI         = document.getElementById('mainUI');
  const searchBox      = document.getElementById('globalSearch');
  const typeFilter     = document.getElementById('typeFilter');
  const sweepFilter    = document.getElementById('sweepFilter');
  const topicFilter    = document.getElementById('topicFilter');
  const resultsCount   = document.getElementById('resultsCount');
  const tbody          = document.getElementById('mainTbody');
  const paginationTop  = document.getElementById('paginationTop');
  const paginationBottom = document.getElementById('paginationBottom');

  // ── Load + group ───────────────────────────────────────────────────────────

  fetch(DICT_URL)
    .then(r => r.json())
    .then(data => {
      const groups = {};
      data.forEach(row => {
        const fid = row['Showcase Field ID'];
        if (!fid) return;
        if (!groups[fid]) {
          groups[fid] = {
            fieldId:  fid,
            label:    cleanLabel(row['Variable Label'] || ''),
            topic:    stripId(row['Topic'] || ''),
            sweeps:   [],
            varnames: []
          };
        }
        groups[fid].sweeps.push({
          varname: row['NSHD Variable Name'] || '',
          year:    row['Year of collection']  || ''
        });
        groups[fid].varnames.push(row['NSHD Variable Name'] || '');
      });

      allFields = Object.values(groups)
        .filter(g => g.sweeps.length > 1)
        .map(g => {
          g.sweeps.sort((a, b) => yearToSort(a.year) - yearToSort(b.year));
          return g;
        });

      // Populate topic dropdown
      const topics = [...new Set(allFields.map(f => f.topic).filter(Boolean))].sort();
      topics.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        topicFilter.appendChild(opt);
      });

      // Update hero stat
      document.getElementById('fieldCount').textContent =
        allFields.length.toLocaleString();

      loadingScreen.style.display = 'none';
      mainUI.style.display        = 'block';
      applyFilters();
    })
    .catch(err => {
      loadingScreen.innerHTML =
        '<p style="color:#A32D2D;padding:20px;">Failed to load data dictionary.</p>';
      console.error(err);
    });

  // ── Filter ─────────────────────────────────────────────────────────────────

  function applyFilters() {
    const q         = searchBox.value.toLowerCase();
    const minSweeps = parseInt(sweepFilter.value) || 2;
    const topic     = topicFilter.value;

    filteredFields = allFields.filter(f => {
      if (f.sweeps.length < minSweeps) return false;
      if (topic && f.topic !== topic) return false;
      if (q) {
        const inLabel    = f.label.toLowerCase().includes(q);
        const inFieldId  = String(f.fieldId).includes(q);
        const inVarnames = f.varnames.some(v => v.toLowerCase().includes(q));
        if (!inLabel && !inFieldId && !inVarnames) return false;
      }
      return true;
    });

    currentPage = 1;
    renderTable();
  }

  searchBox.oninput   = applyFilters;
  typeFilter.onchange = applyFilters;
  sweepFilter.onchange = applyFilters;
  topicFilter.onchange = applyFilters;

  // ── Render table ───────────────────────────────────────────────────────────

  function renderTable() {
    const total      = filteredFields.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const start      = (currentPage - 1) * PAGE_SIZE;
    const pageRows   = filteredFields.slice(start, start + PAGE_SIZE);

    resultsCount.textContent = `${total.toLocaleString()} longitudinal fields`;
    tbody.innerHTML = '';

    pageRows.forEach(f => {
      const firstYear = f.sweeps[0]?.year || '';
      const lastYear  = f.sweeps[f.sweeps.length - 1]?.year || '';
      const yearRange = firstYear === lastYear
        ? firstYear
        : `${firstYear} → ${lastYear}`;
      const topicShort = f.topic.length > 24 ? f.topic.slice(0, 22) + '…' : f.topic;
      const namesPreview = f.varnames.slice(0, 5).join(' · ') +
        (f.varnames.length > 5 ? ` +${f.varnames.length - 5} more` : '');
      const panelId = `panel-${f.fieldId}`;

      // Main row
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align:center;padding:8px 6px;">
          <input type="checkbox" class="row-check"
                 data-varnames="${f.varnames.join(',')}"
                 data-label="${f.label.replace(/"/g,'&quot;')}"
                 style="accent-color:#534AB7;width:14px;height:14px;">
        </td>
        <td style="color:#534AB7;font-weight:500;font-size:12px;padding:8px 10px;">${f.fieldId}</td>
        <td style="padding:8px 10px;">
          <div style="font-size:12px;font-weight:500;color:var(--text-primary);">${f.label}</div>
          <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">${namesPreview}</div>
        </td>
        <td style="font-size:11px;color:var(--text-secondary);padding:8px 10px;">${topicShort}</td>
        <td style="padding:8px 10px;">
          <span style="font-size:11px;font-weight:500;padding:2px 8px;border-radius:6px;
                       background:#E1F5EE;color:#085041;">${f.sweeps.length} sweeps</span>
          <div style="font-size:10px;color:var(--text-muted);margin-top:3px;">${yearRange}</div>
        </td>
        <td style="padding:8px 10px;">
          <button class="view-btn" data-fid="${f.fieldId}"
                  style="font-size:11px;height:26px;padding:0 10px;display:inline-flex;align-items:center;gap:4px;">
            <i class="ti ti-chart-line" aria-hidden="true" style="font-size:11px;"></i> View
          </button>
        </td>`;
      tbody.appendChild(tr);

      // Panel row
      const panelRow = document.createElement('tr');
      panelRow.id           = panelId;
      panelRow.style.display = 'none';
      panelRow.innerHTML = `
        <td colspan="6" style="padding:0;background:#F8F6FF;border-bottom:2px solid #534AB7;">
          <div id="panel-content-${f.fieldId}" style="padding:16px;">
            <div style="color:var(--text-muted);font-size:12px;display:flex;align-items:center;gap:8px;">
              <span style="width:16px;height:16px;border:2px solid #534AB7;border-top-color:transparent;
                           border-radius:50%;display:inline-block;animation:spin .8s linear infinite;"></span>
              Loading sweep data…
            </div>
          </div>
        </td>`;
      tbody.appendChild(panelRow);
    });

    // Attach events
    tbody.querySelectorAll('.view-btn').forEach(btn => {
      btn.onclick = () => {
        const fid   = parseInt(btn.dataset.fid);
        const field = allFields.find(f => f.fieldId === fid);
        if (field) togglePanel(fid, field, btn);
      };
    });

    tbody.querySelectorAll('.row-check').forEach(cb => {
      cb.onchange = () => {
        const names = cb.dataset.varnames.split(',');
        const label = cb.dataset.label;
        if (cb.checked) names.forEach(n => { if (n) addToBasket(n, label); });
        else            names.forEach(n => { if (n) removeFromBasket(n); });
        updateBasketCountUI();
      };
    });

    renderPagination(totalPages);
  }

  // ── Panel toggle ───────────────────────────────────────────────────────────

  function togglePanel(fid, field, btn) {
    const panelRow = document.getElementById(`panel-${fid}`);
    if (!panelRow) return;
    const isOpen = openPanels.has(fid);

    if (isOpen) {
      panelRow.style.display = 'none';
      openPanels.delete(fid);
      btn.innerHTML          = '<i class="ti ti-chart-line" aria-hidden="true" style="font-size:11px;"></i> View';
      btn.style.background   = '';
      btn.style.borderColor  = '';
      btn.style.color        = '';
    } else {
      panelRow.style.display = '';
      openPanels.add(fid);
      btn.innerHTML          = '<i class="ti ti-x" aria-hidden="true" style="font-size:11px;"></i> Close';
      btn.style.background   = '#EEEDFE';
      btn.style.borderColor  = '#534AB7';
      btn.style.color        = '#3C3489';
      if (!loadedPanels.has(fid)) {
        loadedPanels.add(fid);
        loadPanelData(fid, field);
      }
    }
  }

  // ── Load sidecar data + render panel ──────────────────────────────────────

  function loadPanelData(fid, field) {
    const contentDiv = document.getElementById(`panel-content-${fid}`);

    Promise.all(
      field.sweeps.map(s =>
        fetch(`${SIDECAR_BASE}${s.varname}.json`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    ).then(sidecars => {

      const sweepData = field.sweeps.map((s, i) => ({
        varname:  s.varname,
        year:     s.year,
        age:      yearToAge(s.year),
        mean:     sidecars[i]?.mean     ?? null,
        sd:       sidecars[i]?.sd       ?? null,
        min:      sidecars[i]?.minimum  ?? null,
        max:      sidecars[i]?.maximum  ?? null,
        n:        sidecars[i]?.series_size ?? null,
        distType: sidecars[i]?.dist_type   ?? 'continuous',
        valLabels: sidecars[i]?.value_labels ?? []
      }));

      const isContinuous = sweepData.some(s => s.distType === 'continuous' && s.mean !== null);
      const sharedForm    = sidecars.find(s => s?.form)?.form    || '';
      const sharedUnits   = sidecars.find(s => s?.units)?.units  || '';
      const sharedDerived = sidecars.find(s => s?.derived != null)?.derived ?? '';
      const valLabels     = sweepData.find(s => s.valLabels?.length)?.valLabels || [];
      const units         = sharedUnits && sharedUnits !== 'Not applicable' ? sharedUnits : '';

      // Shared metadata chips
      const metaItems = [
        sharedForm    ? `<div><div class="sh-lbl">Form</div><div class="sh-val">${sharedForm}</div></div>` : '',
        units         ? `<div><div class="sh-lbl">Units</div><div class="sh-val">${units}</div></div>` : '',
        sharedDerived !== '' ? `<div><div class="sh-lbl">Derived</div>
          <div class="sh-val" style="color:${sharedDerived==='1'?'#854F0B':'#085041'}">
            ${sharedDerived==='1'?'Yes':'No'}</div></div>` : '',
        `<div><div class="sh-lbl">Type</div><div class="sh-val">${isContinuous?'Continuous':'Categorical'}</div></div>`
      ].filter(Boolean).join('');

      // Detail table rows
      const tableRows = sweepData.map(s => {
        if (isContinuous) {
          const range  = (s.max !== null && s.min !== null) ? s.max - s.min : 1;
          const barPct = (s.mean !== null && range > 0)
            ? Math.round(((s.mean - (s.min || 0)) / range) * 100) : 0;
          return `<tr>
            <td style="color:#534AB7;font-weight:500;">${s.varname}</td>
            <td>${s.year}</td>
            <td>${s.age}</td>
            <td>${s.mean !== null
              ? `${fmt(s.mean)}<div class="bar-wrap"><div class="bar-fill" style="width:${barPct}%"></div></div>`
              : '—'}</td>
            <td>${fmt(s.sd)}</td>
            <td>${fmt(s.min)}</td>
            <td>${fmt(s.max)}</td>
            <td>${s.n !== null ? Math.round(s.n).toLocaleString() : '—'}</td>
          </tr>`;
        } else {
          return `<tr>
            <td style="color:#534AB7;font-weight:500;">${s.varname}</td>
            <td>${s.year}</td>
            <td>${s.age}</td>
            <td colspan="4" style="color:var(--text-muted);font-style:italic;font-size:11px;">Categorical — see value labels below</td>
            <td>${s.n !== null ? Math.round(s.n).toLocaleString() : '—'}</td>
          </tr>`;
        }
      }).join('');

      const theadCols = isContinuous
        ? `<th>Variable</th><th>Year</th><th>Age</th><th>Mean${units?' ('+units+')':''}</th><th>SD</th><th>Min</th><th>Max</th><th>n</th>`
        : `<th>Variable</th><th>Year</th><th>Age</th><th colspan="4"></th><th>n</th>`;

      const valLabelHtml = valLabels.length ? `
        <div style="margin-top:10px;">
          <div style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;
                      color:var(--text-muted);margin-bottom:5px;">
            Value labels (shared across all sweeps)
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;">
            ${valLabels.slice(0, 25).map(vl =>
              `<span style="font-size:11px;padding:2px 8px;border-radius:6px;background:#EEEDFE;color:#3C3489;">
                <strong>${vl.value}</strong> = ${vl.label}
              </span>`).join('')}
            ${valLabels.length > 25
              ? `<span style="font-size:11px;color:var(--text-muted);">+${valLabels.length-25} more</span>`
              : ''}
          </div>
        </div>` : '';

      const chartId = `chart-${fid}`;

      contentDiv.innerHTML = `
        <div style="display:flex;align-items:flex-start;justify-content:space-between;
                    margin-bottom:10px;flex-wrap:wrap;gap:8px;">
          <div>
            <span style="font-size:14px;font-weight:500;color:#085041;">${field.label}</span>
            <span style="font-size:11px;color:var(--text-muted);margin-left:8px;">
              Field ID ${fid} · ${field.sweeps.length} sweeps
            </span>
          </div>
          <button onclick="addAllFromPanel(${fid})"
                  style="font-size:11px;height:26px;padding:0 12px;">
            Add all to basket
          </button>
        </div>

        <div style="background:var(--surface-1);border:0.5px solid var(--border);
                    border-radius:8px;padding:10px 14px;margin-bottom:12px;">
          <div style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;
                      color:var(--text-muted);margin-bottom:6px;">Shared across all sweeps</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">${metaItems}</div>
        </div>

        ${isContinuous
          ? `<div style="position:relative;height:180px;margin-bottom:10px;">
               <canvas id="${chartId}"></canvas>
             </div>
             <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;font-style:italic;">
               Line = mean · Shaded band = min–max (5th–95th percentile)
             </div>`
          : ''}

        <div style="border:0.5px solid var(--border);border-radius:8px;overflow:hidden;">
          <table class="dtable">
            <thead><tr>${theadCols}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
        ${valLabelHtml}
      `;

      // Chart for continuous variables
      if (isContinuous) {
        const validSweeps = sweepData.filter(s => s.mean !== null);
        if (chartRegistry[fid]) {
          try { chartRegistry[fid].destroy(); } catch (e) {}
        }
        chartRegistry[fid] = new Chart(document.getElementById(chartId), {
          type: 'line',
          data: {
            labels: validSweeps.map(s => s.year),
            datasets: [
              {
                label:           'Mean',
                data:            validSweeps.map(s => parseFloat(s.mean.toFixed(2))),
                borderColor:     '#1D9E75',
                backgroundColor: '#1D9E75',
                pointRadius:     4,
                pointHoverRadius: 6,
                borderWidth:     2,
                tension:         0.3,
                order:           1
              },
              {
                label:           'Max',
                data:            validSweeps.map(s => s.max !== null ? parseFloat(s.max.toFixed(2)) : null),
                borderColor:     'rgba(29,158,117,0.2)',
                backgroundColor: 'rgba(29,158,117,0.08)',
                pointRadius:     0,
                borderWidth:     1,
                borderDash:      [4, 3],
                fill:            '+1',
                tension:         0.3,
                order:           2
              },
              {
                label:           'Min',
                data:            validSweeps.map(s => s.min !== null ? parseFloat(s.min.toFixed(2)) : null),
                borderColor:     'rgba(29,158,117,0.2)',
                pointRadius:     0,
                borderWidth:     1,
                borderDash:      [4, 3],
                fill:            false,
                tension:         0.3,
                order:           2
              }
            ]
          },
          options: {
            responsive:          true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                filter:    i  => i.datasetIndex === 0,
                callbacks: { label: c => ` Mean ${c.raw}${units ? ' ' + units : ''}` }
              }
            },
            scales: {
              x: {
                ticks: { font: { size: 10 }, color: '#888', maxRotation: 45 },
                grid:  { color: 'rgba(0,0,0,0.05)' }
              },
              y: {
                ticks: { font: { size: 10 }, color: '#888',
                         callback: v => v + (units ? ' ' + units : '') },
                grid:  { color: 'rgba(0,0,0,0.05)' }
              }
            }
          }
        });
      }
    });
  }

  // ── Global helpers called from inline onclick ──────────────────────────────

  window.addAllFromPanel = function(fid) {
    const field = allFields.find(f => f.fieldId === fid);
    if (!field) return;
    field.varnames.forEach(n => { if (n) addToBasket(n, field.label); });
    updateBasketCountUI();
  };

  // ── Pagination ─────────────────────────────────────────────────────────────

  function renderPagination(totalPages) {
    const html = `
      <button ${currentPage === 1          ? 'disabled' : ''} data-dir="-1">← Prev</button>
      <span style="font-size:12px;color:var(--text-muted);">
        Page ${currentPage} of ${totalPages}
      </span>
      <button ${currentPage === totalPages ? 'disabled' : ''} data-dir="1">Next →</button>`;

    [paginationTop, paginationBottom].forEach(el => {
      el.innerHTML = html;
      el.querySelectorAll('button').forEach(btn => {
        btn.onclick = () => {
          currentPage += parseInt(btn.dataset.dir);
          renderTable();
          window.scrollTo(0, 0);
        };
      });
    });
  }

  // ── Download CSV ───────────────────────────────────────────────────────────

  document.getElementById('downloadCsvBtn').addEventListener('click', () => {
    const rows = filteredFields.map(f => [
      f.fieldId,
      `"${f.label.replace(/"/g, '""')}"`,
      `"${f.topic}"`,
      f.sweeps.length,
      f.sweeps[0]?.year || '',
      f.sweeps[f.sweeps.length - 1]?.year || '',
      `"${f.varnames.join(', ')}"`
    ].join(','));
    const csv = [
      'Field ID,Label,Topic,Sweep count,First year,Last year,Variable names',
      ...rows
    ].join('\n');
    const url  = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'NSHD_Longitudinal_Variables.csv';
    link.click();
    URL.revokeObjectURL(url);
  });

  // ── Add selected to basket ─────────────────────────────────────────────────

  document.getElementById('addSelectedBtn').addEventListener('click', () => {
    tbody.querySelectorAll('.row-check:checked').forEach(cb => {
      const label = cb.dataset.label;
      cb.dataset.varnames.split(',').forEach(n => { if (n) addToBasket(n, label); });
    });
    updateBasketCountUI();
  });

});