/* data_sharing_numbers.js
 * Data Sharing in Numbers page: a dashboard of data sharing figures from 2021 onwards.
 *
 * Fully client-side. On page load this fetches:
 *   1. metrics.json            (written by DataSharing_Metrics.py)  - required
 *   2. popular_vars_yr.json    (same script)                        - optional, for "most requested variables"
 *   3. the NSHD data dictionary JSON                                - optional, for variable labels
 * and fills the (empty) sections already in the page's HTML.
 *
 * The three paths are data-attributes on the page's wrapper element:
 *   <div class="page-topics page-data-sharing-numbers"
 *        data-metrics-url="..." data-popular-url="..." data-dictionary-url="...">
 *
 * Preview pages with no web server can set these globals instead (they take priority):
 *   window.DSN_METRICS_INLINE, window.DSN_POPULAR_INLINE, window.DSN_DICTIONARY_INLINE
 *
 * Year filter: "All years" or one year. Every figure comes straight from the JSON for that
 * year (nothing is added up from other years), so each number is exact.
 * Sections get their colours from topics.js; the bars pick that colour up through CSS.
 */
(function () {
  "use strict";

  const VARIABLE_METADATA_BASE_URL = "https://rmjdish.github.io/OWL/assets/variable_metadata/";
  // One colour and dash pattern per year on the "through the year" chart
  const LINE_COLOURS = ["#6a0dad", "#1a5c50", "#1f3f70", "#8a4a1a", "#7a1f4a", "#705518"];
  const LINE_DASHES = ["", "7 4", "2 3", "10 4 2 4", "4 4", "1 4"];

  let M = null; // metrics.json
  let popular = []; // popular_vars_yr.json
  let dict = new Map(); // lower-case variable name -> { name, label }
  let sel = "all"; // "all", or a year (number)
  let visibleLines = new Set(); // years shown on the trajectory chart
  let pickedVariable = ""; // variable chosen in the "requested together" picker

  const nf = new Intl.NumberFormat("en-GB");
  const root = () => document.querySelector(".page-data-sharing-numbers");
  const $ = (id) => document.getElementById(id);

  // ---------- small helpers ----------

  function esc(str) {
    return String(str === null || str === undefined ? "" : str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const isNum = (n) => n !== null && n !== undefined && !isNaN(n);
  const num = (n) => (isNum(n) ? nf.format(n) : "–");
  const pct = (n) => (isNum(n) ? Number(n).toFixed(1).replace(/\.0$/, "") + "%" : "–");
  const days = (n) => (isNum(n) ? (Number.isInteger(n) ? nf.format(n) : Number(n).toFixed(1)) + " days" : "–");
  const sum = (list, fn) => list.reduce((t, x) => t + (fn(x) || 0), 0);
  const byYear = (list, y) => (list || []).find((r) => r.year === y);

  function formatDate(text) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(text || ""));
    if (!m) return "";
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  }

  // The row of figures for the chosen year (or the overall row for "All years")
  function rowFor(block) {
    if (!block) return null;
    return sel === "all" ? block.overall : byYear(block.by_year, sel);
  }

  // A row from a {name, total, by_year:{year: n}} list, for the chosen year
  function valueOf(row) {
    return sel === "all" ? row.total : row.by_year[String(sel)] || 0;
  }

  function prepared() {
    const rows = M.data_prepared.by_year;
    const use = sel === "all" ? rows : rows.filter((r) => r.year === sel);
    const apps = sum(use, (r) => r.applications);
    const withData = sum(use, (r) => r.with_data);
    return { applications: apps, with_data: withData, percent: apps ? (withData / apps) * 100 : null };
  }

  function ukLabel(name) {
    const n = String(name).trim().toLowerCase();
    if (["yes", "y", "true", "uk"].includes(n)) return "UK";
    if (["no", "n", "false", "non-uk", "outside uk", "outside the uk"].includes(n)) return "Outside the UK";
    return String(name);
  }

  function varLink(name) {
    const info = dict.get(String(name).toLowerCase());
    const shown = info ? info.name : name;
    const label = info && info.label ? '<span class="dsn-var-label">' + esc(info.label) + "</span>" : "";
    return '<a href="' + esc(VARIABLE_METADATA_BASE_URL + encodeURIComponent(String(name).toLowerCase())) +
      '" target="_blank" rel="noopener">' + esc(shown) + "</a>" + label;
  }

  // ---------- building blocks ----------

  function tile(label, value, note) {
    return '<div class="dsn-tile"><div class="dsn-tile-value">' + value + '</div><div class="dsn-tile-label">' + esc(label) + "</div>" +
      (note ? '<div class="dsn-tile-note">' + esc(note) + "</div>" : "") + "</div>";
  }

  // Horizontal bars. items: [{ label (HTML), value, text (optional display text) }]
  function barRows(items) {
    if (!items.length) return '<p class="dsn-note">Nothing to show for this selection.</p>';
    const max = Math.max(1, ...items.map((i) => i.value || 0));
    return '<div class="dsn-bars">' + items.map((i) =>
      '<div class="dsn-bar-row"><span class="dsn-bar-label">' + i.label + '</span>' +
      '<span class="dsn-bar-track"><i style="width:' + Math.round(((i.value || 0) / max) * 100) + '%"></i></span>' +
      '<span class="dsn-bar-val">' + (i.text !== undefined ? i.text : num(i.value)) + "</span></div>").join("") + "</div>";
  }

  // Vertical columns, one per year. items: [{ label, value, text, selected, partial }]
  function columnChart(items, caption) {
    const max = Math.max(1, ...items.map((i) => i.value || 0));
    const anySelected = items.some((i) => i.selected);
    return '<div class="dsn-cols' + (anySelected ? " has-selection" : "") + '" role="img" aria-label="' + esc(caption) + '">' +
      items.map((i) =>
        '<div class="dsn-col' + (i.selected ? " is-selected" : "") + (i.partial ? " is-partial" : "") + '">' +
        '<span class="dsn-col-val">' + (i.text !== undefined ? i.text : num(i.value)) + "</span>" +
        '<i style="height:' + Math.max(2, Math.round(((i.value || 0) / max) * 150)) + 'px"></i>' +
        '<span class="dsn-col-lab">' + esc(i.label) + "</span></div>").join("") + "</div>";
  }

  function unavailable() {
    return '<p class="dsn-note">These figures are not available right now.</p>';
  }

  // ---------- sections ----------

  function renderOverview() {
    const apps = M.applications.by_year;
    const nApps = sel === "all" ? sum(apps, (a) => a.applications) : (byYear(apps, sel) || {}).applications;
    const distinct = (rows) => rows.filter((r) => valueOf(r) > 0).length;
    const ap = rowFor(M.approval_times) || {};
    const th = M.approval_times.thresholds[0];
    const prep = prepared();

    const chips = ['<button class="dsn-chip' + (sel === "all" ? " on" : "") + '" data-year="all">All years</button>']
      .concat(M.years.map((y) => '<button class="dsn-chip' + (sel === y ? " on" : "") + '" data-year="' + y + '">' + y + "</button>")).join("");

    const partial = M.end_year === new Date().getFullYear() ? " " + M.end_year + " is the year to date." : "";
    return '<div class="dsn-filter"><span class="dsn-filter-label">Show figures for</span>' + chips + "</div>" +
      '<div class="dsn-tiles">' +
      tile("Applications", num(nApps)) +
      tile("Institutions", num(distinct(M.where.institutions))) +
      tile("Countries", num(distinct(M.where.countries))) +
      tile("Average time to approve", days(ap.average_days)) +
      tile("Approved within " + th + " days", pct(ap["percent_within_" + th]), num(ap["within_" + th]) + " of " + num(ap.approved) + " approved") +
      tile("Applications with data prepared", pct(prep.percent), num(prep.with_data) + " of " + num(prep.applications)) +
      "</div>" +
      '<p class="dsn-note">Applications from ' + M.start_year + " onwards, counted by year of application." + partial +
      (M.generated ? " Updated " + esc(formatDate(M.generated)) + "." : "") + "</p>";
  }

  function niceMax(v) {
    if (v <= 5) return 5;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  }

  function trajectorySvg() {
    const bm = M.applications.by_month;
    if (!bm) return '<p class="dsn-note">The month-by-month view is not available right now.</p>';
    const W = 700, H = 300, m = { l: 46, r: 40, t: 16, b: 34 };
    const shown = M.years.filter((y) => visibleLines.has(y) && bm[String(y)]);
    let maxY = 1;
    shown.forEach((y) => bm[String(y)].cumulative.forEach((v) => { if (isNum(v) && v > maxY) maxY = v; }));
    maxY = niceMax(maxY);
    const x = (i) => m.l + ((W - m.l - m.r) * i) / 11;
    const y = (v) => H - m.b - ((H - m.t - m.b) * v) / maxY;

    let svg = '<svg class="dsn-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Cumulative applications by month, one line per year">';
    for (let g = 0; g <= 4; g++) {
      const v = (maxY * g) / 4;
      svg += '<line class="grid" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>' +
        '<text class="tick" x="' + (m.l - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + num(Math.round(v)) + "</text>";
    }
    M.applications.months.forEach((label, i) => {
      svg += '<text class="tick" x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle">' + esc(label) + "</text>";
    });
    shown.forEach((yr) => {
      const idx = M.years.indexOf(yr);
      const pts = [];
      bm[String(yr)].cumulative.forEach((v, i) => { if (isNum(v)) pts.push([x(i), y(v), v]); });
      if (!pts.length) return;
      const width = sel === "all" ? 2.5 : yr === sel ? 4 : 1.8;
      const faded = sel !== "all" && yr !== sel ? ' opacity="0.55"' : "";
      svg += '<path d="' + pts.map((p, k) => (k ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ") + '" fill="none" stroke="' +
        LINE_COLOURS[idx % LINE_COLOURS.length] + '" stroke-width="' + width + '" stroke-dasharray="' + LINE_DASHES[idx % LINE_DASHES.length] +
        '" stroke-linejoin="round" stroke-linecap="round"' + faded + "/>";
      const last = pts[pts.length - 1];
      svg += '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="4" fill="' + LINE_COLOURS[idx % LINE_COLOURS.length] + '"/>' +
        '<text class="endlabel" x="' + (last[0] + 8).toFixed(1) + '" y="' + (last[1] + 4).toFixed(1) + '">' + num(last[2]) + "</text>";
    });
    return svg + "</svg>";
  }

  function lineLegend() {
    return '<div class="dsn-legend">' + M.years.filter((y) => M.applications.by_month && M.applications.by_month[String(y)]).map((y) => {
      const idx = M.years.indexOf(y);
      const on = visibleLines.has(y);
      return '<button class="dsn-chip' + (on ? " on" : "") + '" data-line="' + y + '" aria-pressed="' + on + '">' +
        '<svg width="26" height="8" aria-hidden="true"><line x1="1" x2="25" y1="4" y2="4" stroke="' + LINE_COLOURS[idx % LINE_COLOURS.length] +
        '" stroke-width="2.5" stroke-dasharray="' + LINE_DASHES[idx % LINE_DASHES.length] + '"/></svg> ' + y + "</button>";
    }).join("") + "</div>";
  }

  function renderApplications() {
    const nowYear = new Date().getFullYear();
    const cols = M.applications.by_year.map((r) => ({
      label: r.year + (r.year === nowYear ? "*" : ""), value: r.applications,
      selected: sel !== "all" && r.year === sel, partial: r.year === nowYear,
    }));
    return "<h3>Applications each year</h3>" +
      columnChart(cols, "Applications per year: " + M.applications.by_year.map((r) => r.year + " " + r.applications).join(", ")) +
      (cols.some((c) => c.partial) ? '<p class="dsn-note">* Year to date.</p>' : "") +
      "<h3>Building up through the year</h3><p class=\"dsn-sub\">Cumulative applications by month. Choose which years to compare.</p>" +
      lineLegend() + trajectorySvg();
  }

  function topList(rows, nameFn, n, extraFn) {
    const items = rows.map((r) => ({ r, value: valueOf(r) })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
    const shown = items.slice(0, n).map((x) => ({
      label: esc(nameFn(x.r)) + (extraFn && extraFn(x.r) ? '<span class="dsn-var-label">' + esc(extraFn(x.r)) + "</span>" : ""),
      value: x.value,
    }));
    const rest = items.length - shown.length;
    return barRows(shown) + (rest > 0 ? '<p class="dsn-note">and ' + num(rest) + " more.</p>" : "");
  }

  function renderWho() {
    const w = M.where;
    const uk = w.uk.map((r) => ({ name: ukLabel(r.name), value: valueOf(r) })).filter((x) => x.value > 0);
    const total = sum(uk, (x) => x.value);
    const split = total
      ? '<div class="dsn-split" role="img" aria-label="Share of applications from inside and outside the UK">' +
        uk.map((x, i) => '<i class="seg' + i + '" style="width:' + (x.value / total) * 100 + '%"></i>').join("") + "</div>" +
        '<div class="dsn-split-legend">' + uk.map((x, i) => '<span><u class="seg' + i + '"></u>' + esc(x.name) + " " + pct((x.value / total) * 100) + " (" + num(x.value) + ")</span>").join("") + "</div>"
      : '<p class="dsn-note">Nothing to show for this selection.</p>';
    return "<h3>Inside and outside the UK</h3>" + split +
      "<h3>Top countries</h3>" + topList(w.countries, (r) => r.name, 10) +
      "<h3>Top institutions</h3>" + topList(w.institutions, (r) => r.name, 10, (r) => r.country);
  }

  function trendColumns(values, caption, format) {
    return columnChart(M.years.map((y) => {
      const v = values(y);
      return { label: String(y), value: isNum(v) ? v : 0, text: isNum(v) ? format(v) : "–", selected: sel !== "all" && y === sel };
    }), caption);
  }

  function renderService() {
    const ap = rowFor(M.approval_times) || {};
    const td = rowFor(M.time_to_data) || {};
    const fromApproval = td.from_approval || {};
    const rp = rowFor(M.repeat_requests) || {};
    const prep = prepared();
    const ths = M.approval_times.thresholds;

    const approvalTiles = tile("Average time to approve", days(ap.average_days)) + tile("Median time to approve", days(ap.median_days)) +
      ths.map((t) => tile("Approved within " + t + " days", pct(ap["percent_within_" + t]), num(ap["within_" + t]) + " of " + num(ap.approved))).join("");
    const dataTiles = tile("Applications with data prepared", pct(prep.percent), num(prep.with_data) + " of " + num(prep.applications)) +
      tile("Median time from approval to first data", days(fromApproval.median), "across " + num(fromApproval.n) + " projects") +
      tile("Average time from approval to first data", days(fromApproval.average)) +
      ths.slice(0, 1).map((t) => tile("Data within " + t + " days of approval", pct(fromApproval["percent_within_" + t]), num(fromApproval["within_" + t]) + " of " + num(fromApproval.n))).join("");
    const repeatTiles = tile("Projects that came back for more", pct(rp.percent_returned), num(rp.returned) + " of " + num(rp.projects_with_data)) +
      tile("Median time until they came back", days(rp.median_days_to_return)) +
      tile("Projects with more than one basket", num(rp.with_multiple_baskets));

    return "<h3>Approval</h3><div class=\"dsn-tiles\">" + approvalTiles + "</div>" +
      "<h3>From approval to data</h3><div class=\"dsn-tiles\">" + dataTiles + "</div>" +
      '<p class="dsn-note">' + esc(M.time_to_data.note || "") + "</p>" +
      "<h3>Trends by year</h3>" +
      '<p class="dsn-sub">Average days to approve an application</p>' +
      trendColumns((y) => (byYear(M.approval_times.by_year, y) || {}).average_days, "Average days to approve by year", (v) => String(Math.round(v))) +
      '<p class="dsn-sub">Median days from approval to first data</p>' +
      trendColumns((y) => ((byYear(M.time_to_data.by_year, y) || {}).from_approval || {}).median, "Median days from approval to first data by year", (v) => String(Math.round(v))) +
      '<p class="dsn-sub">Applications with data prepared (%)</p>' +
      trendColumns((y) => (byYear(M.data_prepared.by_year, y) || {}).percent_with_data, "Percentage of applications with data prepared by year", (v) => Math.round(v) + "%") +
      "<h3>Repeat requests</h3><div class=\"dsn-tiles\">" + repeatTiles + "</div>" +
      '<p class="dsn-note">' + esc(M.repeat_requests.definition || "") + "</p>" +
      "<h3>New Condor accounts</h3>" +
      trendColumns((y) => (byYear(M.condor_accounts.by_year, y) || {}).new_accounts, "New Condor accounts by year", (v) => num(v));
  }

  function renderRequests() {
    const key = String(sel);
    const types = (M.data_types && M.data_types.types) || [];
    const typeItems = types.map((t) => {
      const cell = sel === "all" ? { projects: t.projects, percent: t.percent } : t.by_year[key] || { projects: 0, percent: null };
      return { label: esc(t.type), value: cell.percent || 0, text: pct(cell.percent) + " (" + num(cell.projects) + ")" };
    });

    let topicsHtml = '<p class="dsn-note">Topic figures are not available right now.</p>';
    let yearsHtml = "";
    const ty = M.topics_and_years;
    if (ty) {
      const topics = ty.topics.map((t) => ({ label: esc(t.topic), value: sel === "all" ? t.projects : t.by_year[key] || 0 }))
        .filter((t) => t.value > 0).sort((a, b) => b.value - a.value).slice(0, 12);
      topicsHtml = barRows(topics);
      const years = ty.collection_years.map((c) => ({ label: esc(c.collection_year), value: sel === "all" ? c.projects : c.by_year[key] || 0 }))
        .filter((c) => c.value > 0);
      yearsHtml = "<h3>Years of data collection</h3><p class=\"dsn-sub\">Projects asking for at least one variable from each year of collection</p>" + barRows(years);
    }
    return "<h3>Types of data requested</h3><p class=\"dsn-sub\">Share of applications asking for each type (number of projects in brackets)</p>" + barRows(typeItems) +
      "<h3>Topics</h3><p class=\"dsn-sub\">Projects asking for at least one variable in each topic</p>" + topicsHtml + yearsHtml +
      '<p class="dsn-note">Topics and years of collection are counted by the year each basket was created.</p>';
  }

  function renderVariables() {
    // Most requested variables (popular_vars_yr.json)
    let popHtml = '<p class="dsn-note">The most requested variables are not available right now.</p>';
    if (popular && popular.length) {
      const items = popular.map((p) => ({ name: p.name, value: sel === "all" ? p.total : (p.counts || {})[String(sel)] || 0 }))
        .filter((p) => p.value > 0).sort((a, b) => b.value - a.value).slice(0, 10)
        .map((p) => ({ label: varLink(p.name), value: p.value }));
      popHtml = barRows(items);
    }

    // Size of requests
    const vp = rowFor(M.variables_per_project) || {};
    const bands = M.variables_per_project.size_band_names.map((n) => ({ label: esc(n + " variables"), value: (vp.size_bands || {})[n] || 0 }));
    const sizeHtml = '<div class="dsn-tiles">' + tile("Average per project", isNum(vp.average) ? Number(vp.average).toFixed(0) : "–") +
      tile("Median per project", isNum(vp.median) ? Number(vp.median).toFixed(0) : "–") + tile("Largest request", num(vp.max)) + "</div>" + barRows(bands);

    // Requested together
    const b = M.bundles;
    let togetherHtml = '<p class="dsn-note">Variable pairs are not available right now.</p>';
    if (b) {
      const pairs = b.top_pairs.slice(0, 10).map((p) => ({
        label: varLink(p.a) + '<span class="dsn-plus"> + </span>' + varLink(p.b), value: p.projects,
        text: num(p.projects) + " projects",
      }));
      const names = Object.keys(b.also_requested || {}).sort((x, y) => x.localeCompare(y));
      const options = '<option value="">Choose a variable...</option>' + names.map((n) => '<option value="' + esc(n) + '"' + (n === pickedVariable ? " selected" : "") + ">" + esc(n) + "</option>").join("");
      let partners = "";
      if (pickedVariable && b.also_requested[pickedVariable]) {
        partners = '<div class="dsn-bars">' + b.also_requested[pickedVariable].map((p) =>
          '<div class="dsn-bar-row"><span class="dsn-bar-label">' + varLink(p.name) + '</span><span class="dsn-bar-track"><i style="width:' + Math.min(100, p.percent_of_projects_with_variable) + '%"></i></span>' +
          '<span class="dsn-bar-val">' + pct(p.percent_of_projects_with_variable) + "</span></div>").join("") + "</div>" +
          '<p class="dsn-note">Share of projects asking for ' + esc(pickedVariable) + " that also asked for each variable.</p>";
      }
      togetherHtml = '<p class="dsn-sub">Pairs of variables requested together most often, across all years</p>' + barRows(pairs) +
        '<p class="dsn-sub" style="margin-top:18px;">What else do projects ask for with a variable?</p>' +
        '<select id="dsn-pick" class="dsn-select" aria-label="Choose a variable">' + options + "</select>" + partners +
        '<p class="dsn-note">' + esc(b.note || "") + " Pairs requested by fewer than " + num(b.min_projects) + " projects are not shown.</p>";
    }

    return "<h3>Most requested variables</h3><p class=\"dsn-sub\">Number of projects requesting each variable" + (sel === "all" ? ", added up across years" : "") + "</p>" + popHtml +
      "<h3>How many variables projects ask for</h3>" + sizeHtml +
      "<h3>Variables requested together</h3>" + togetherHtml;
  }

  function renderAbout() {
    return "<p>These figures come from the data sharing records and are updated whenever the data is refreshed. They cover applications from " + M.start_year + " onwards.</p>" +
      "<ul>" +
      "<li><strong>Year of application</strong> is when the application was submitted. Most figures use it. Topics, collection years and variables use the year each basket was created.</li>" +
      "<li><strong>Time to approve</strong> is the number of days from submission to approval. Applications not yet approved are left out.</li>" +
      "<li><strong>Applications with data prepared</strong> are those that have had at least one basket of variables prepared. Recent applications may not have asked for data yet.</li>" +
      "<li><strong>Time from approval to first data</strong> is the number of days between a project being approved and its first basket being created.</li>" +
      "<li><strong>Projects that came back for more</strong> are projects that created another basket well after their first (see the definition above).</li>" +
      "<li>Variables added to every basket automatically are not counted.</li>" +
      "</ul>";
  }

  // ---------- render and events ----------

  function safely(id, fn) {
    const target = $(id);
    if (!target) return;
    try {
      target.innerHTML = fn();
    } catch (err) {
      console.error("[Data Sharing in Numbers] Section " + id + " failed:", err);
      target.innerHTML = unavailable();
    }
  }

  function renderAll() {
    safely("dsn-overview", renderOverview);
    safely("dsn-applications", renderApplications);
    safely("dsn-who", renderWho);
    safely("dsn-service", renderService);
    safely("dsn-requests", renderRequests);
    safely("dsn-variables", renderVariables);
    safely("dsn-about", renderAbout);
  }

  function bindEvents() {
    root().addEventListener("click", (e) => {
      const yearBtn = e.target.closest("[data-year]");
      if (yearBtn) {
        sel = yearBtn.dataset.year === "all" ? "all" : parseInt(yearBtn.dataset.year, 10);
        if (sel !== "all") visibleLines.add(sel); // make sure the chosen year is on the chart
        renderAll();
        return;
      }
      const lineBtn = e.target.closest("[data-line]");
      if (lineBtn) {
        const y = parseInt(lineBtn.dataset.line, 10);
        if (visibleLines.has(y)) visibleLines.delete(y);
        else visibleLines.add(y);
        safely("dsn-applications", renderApplications);
      }
    });
    root().addEventListener("change", (e) => {
      if (e.target.id === "dsn-pick") {
        pickedVariable = e.target.value;
        safely("dsn-variables", renderVariables);
        const again = $("dsn-pick");
        if (again) again.focus();
      }
    });
  }

  // ---------- loading ----------

  function resolveUrl(datasetKey, attrName) {
    const raw = root() && root().dataset[datasetKey];
    if (!raw || !raw.trim()) throw new Error(attrName + " is not set on .page-data-sharing-numbers");
    return new URL(raw, window.location.origin).href;
  }

  function fetchJson(url, label) {
    return fetch(url).then((r) => {
      if (!r.ok) throw new Error("Could not fetch " + label + " (HTTP " + r.status + ")");
      return r.json();
    });
  }

  // An optional file: if it can not be loaded the page carries on without it
  function optional(inline, datasetKey, attrName, label) {
    if (inline) return Promise.resolve(inline);
    let url;
    try { url = resolveUrl(datasetKey, attrName); } catch (e) { return Promise.resolve(null); }
    return fetchJson(url, label).catch((err) => {
      console.warn("[Data Sharing in Numbers] " + label + " not loaded; carrying on without it.", err);
      return null;
    });
  }

  function showError(err) {
    const status = $("dsn-status");
    if (status) {
      status.className = "dsn-status is-error";
      status.textContent = "The figures could not be loaded (" + err.message + "). Please try again later.";
    }
    console.error(err);
  }

  let started = false;

  function init() {
    if (started || !root()) return; // never start twice (it would attach every click handler twice)
    started = true;
    let metricsP;
    try {
      metricsP = window.DSN_METRICS_INLINE ? Promise.resolve(window.DSN_METRICS_INLINE)
        : fetchJson(resolveUrl("metricsUrl", "data-metrics-url"), "metrics JSON");
    } catch (err) { showError(err); return; }

    Promise.all([
      metricsP,
      optional(window.DSN_POPULAR_INLINE, "popularUrl", "data-popular-url", "popular variables JSON"),
      optional(window.DSN_DICTIONARY_INLINE, "dictionaryUrl", "data-dictionary-url", "dictionary JSON"),
    ]).then(([metrics, pop, dictionary]) => {
      if (!metrics || !Array.isArray(metrics.years) || !metrics.applications) throw new Error("the metrics file is missing its main sections");
      M = metrics;
      popular = Array.isArray(pop) ? pop : [];
      (Array.isArray(dictionary) ? dictionary : []).forEach((rec) => {
        const name = rec && rec["NSHD Variable Name"];
        if (name && !dict.has(String(name).toLowerCase())) dict.set(String(name).toLowerCase(), { name: String(name), label: rec["Variable Label"] || "" });
      });
      // Start with the most recent three years on the "through the year" chart
      M.years.filter((y) => M.applications.by_year.some((r) => r.year === y && r.applications > 0)).slice(-3).forEach((y) => visibleLines.add(y));
      $("dsn-status").style.display = "none";
      bindEvents();
      renderAll();
    }).catch(showError);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
