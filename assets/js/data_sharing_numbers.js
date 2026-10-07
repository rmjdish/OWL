/* data_sharing_numbers.js
 * Metrics and Trends page: a dashboard of data sharing figures from 2021 onwards.
 *
 * Fully client-side. On page load this fetches:
 *   1. metrics.json            (written by DataSharing_Metrics.py)  - required
 *   2. popular_vars_yr.json    (same script)                        - optional, for "most requested variables"
 *   3. variable_requests.json  (same script)                        - optional, which variables each project had sent, by year
 *   4. the NSHD data dictionary JSON                                - optional, for variable labels, topics and years of collection
 * and fills the (empty) sections already in the page's HTML. Topics and collection years are worked out
 * HERE, in the browser, by joining (3) to (4), so the Python script never needs the dictionary.
 *
 * The three paths are data-attributes on the page's wrapper element:
 *   <div class="page-topics page-data-sharing-numbers"
 *        data-metrics-url="..." data-popular-url="..." data-requests-url="..." data-dictionary-url="...">
 *
 * Preview pages with no web server can set these globals instead (they take priority):
 *   window.DSN_METRICS_INLINE, window.DSN_POPULAR_INLINE, window.DSN_REQUESTS_INLINE, window.DSN_DICTIONARY_INLINE
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
  let dict = new Map(); // lower-case variable name -> { name, label, topic, years }
  let requests = null; // variable_requests.json projects: [{ pid, by_year: { "2022": ["bmi"] } }]
  const requestStatsCache = {}; // topic / collection-year counts, worked out once per chosen year
  let sel = []; // the years chosen: [] means every year; otherwise a sorted list of one or more years
  let visibleLines = new Set(); // years shown on the trajectory chart
  const openFolds = new Set(); // which collapsible blocks are open (they start closed, and stay as the person left them when the page redraws)
  const fold = (key, title, inner) => '<details class="dsn-fold" data-fold="' + key + '"' + (openFolds.has(key) ? " open" : "") + '><summary>' + title + "</summary>" + inner + "</details>";
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
  const days = (n) => (isNum(n) ? (Number.isInteger(n) ? nf.format(n) : Number(n).toFixed(1)) + (n === 1 ? " day" : " days") : "–");
  const sum = (list, fn) => list.reduce((t, x) => t + (fn(x) || 0), 0);
  const byYear = (list, y) => (list || []).find((r) => r.year === y);

  // ---------- the chosen years ----------
  // sel is [] for "All years" (choosing every year one by one also counts as all years), else a sorted list of one or more years.
  const isAll = () => sel.length === 0 || (!!M && sel.length >= M.years.length);
  const picked = () => (isAll() ? (M ? M.years.slice() : []) : sel.slice());   // the years in play
  const chosen = (y) => !isAll() && sel.includes(y);                             // is this year highlighted?
  const selKey = () => sel.join(",");
  // Planner (the request process) started in planner_first_year; with manual dates some requests are earlier (first_year is the earliest of any)
  const plannerYear = (B) => (B && B.source && (B.source.planner_first_year || B.source.first_year)) || null;
  const manualDates = (B) => !!(B && B.source && B.source.manual_dates);                                            // "2021,2023": how metrics.json names a combination
  function selLabel() {
    if (isAll()) return "all years";
    if (sel.length === 1) return String(sel[0]);
    return sel.slice(0, -1).join(", ") + " and " + sel[sel.length - 1];
  }

  function formatDate(text) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(text || ""));
    if (!m) return "";
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  }

  // The row of figures for the chosen years: the overall row for "All years", the year's row for one year, and for several years
  // the combination worked out by the script (a median over several years cannot be built from each year's median)
  function rowFor(block) {
    if (!block) return null;
    if (isAll()) return block.overall;
    if (sel.length === 1) return byYear(block.by_year, sel[0]);
    return (block.by_set || {})[selKey()] || null;
  }

  // A row from a {name, total, by_year:{year: n}} list, for the chosen year
  function valueOf(row) {
    return isAll() ? row.total : sum(sel, (y) => row.by_year[String(y)] || 0);
  }

  function prepared() {
    const rows = M.data_prepared.by_year;
    const use = rows.filter((r) => picked().includes(r.year));
    const apps = sum(use, (r) => r.applications);
    const withData = sum(use, (r) => r.with_data);
    return { applications: apps, with_data: withData, percent: apps ? (withData / apps) * 100 : null };
  }

  function ukLabel(name) {
    const n = String(name).trim().toLowerCase();
    if (["yes", "y", "true", "uk", "inside the uk", "inside uk"].includes(n)) return "UK";
    if (["no", "n", "false", "non-uk", "outside uk", "outside the uk"].includes(n)) return "Outside the UK";
    return String(name);
  }

  // "Anthropometry [12]" -> "Anthropometry" (the dictionary's trailing [code] is dropped)
  function cleanTopic(raw) {
    return String(raw || "").replace(/\s*\[\d+\]\s*$/, "").trim();
  }

  // "1999, 2006" -> [1999, 2006]; anything that is not a plain year stays as text
  function yearTokens(raw) {
    return String(raw || "").split(/[;,\/|&]/).map((x) => x.trim()).filter((x) => x && x.toLowerCase() !== "nan")
      .map((x) => (/^\d+$/.test(x) ? parseInt(x, 10) : x));
  }

  // Join each project's requested variables to the dictionary, in the browser.
  // A project counts ONCE per topic / year of collection however many of its variables fall in it.
  function requestStats() {
    const key = isAll() ? "all" : selKey();
    if (requestStatsCache[key]) return requestStatsCache[key];
    const topics = new Map();
    const collection = new Map();
    const notInDictionary = new Set();
    const withVars = new Set();   // projects with at least one requested variable in the chosen years
    const add = (map, name, pid, variable) => {
      if (!map.has(name)) map.set(name, { projects: new Set(), variables: new Set() });
      const entry = map.get(name);
      entry.projects.add(pid);
      entry.variables.add(variable);
    };
    requests.forEach((p) => {
      const vars = new Set();
      if (isAll()) Object.keys(p.by_year).forEach((y) => p.by_year[y].forEach((v) => vars.add(v)));
      else sel.forEach((y) => (p.by_year[String(y)] || []).forEach((v) => vars.add(v)));
      if (vars.size) withVars.add(p.pid);
      vars.forEach((v) => {
        const info = dict.get(v);
        if (!info) { notInDictionary.add(v); return; }
        if (info.topic) add(topics, info.topic, p.pid, v);
        info.years.forEach((y) => add(collection, y, p.pid, v));
      });
    });
    const toList = (map) => Array.from(map, ([name, e]) => ({ name, projects: e.projects.size, variables: e.variables.size }));
    const result = {
      topics: toList(topics).sort((a, b) => b.projects - a.projects || String(a.name).localeCompare(String(b.name))),
      collection: toList(collection).sort((a, b) =>
        typeof a.name === typeof b.name ? (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) : typeof a.name === "number" ? -1 : 1),
      notInDictionary: notInDictionary.size,
      projectCount: withVars.size,
    };
    requestStatsCache[key] = result;
    return result;
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
  // "12 (8.5%)" and, for hovering, "12 out of 141 projects"
  const withPct = (n, total) => num(n) + (total > 0 ? " (" + pct((n / total) * 100) + ")" : "");
  const outOf = (n, total, what) => (total > 0 ? num(n) + " out of " + num(total) + " " + what : "");

  function barRows(items) {
    if (!items.length) return '<p class="dsn-note">Nothing to show for this selection.</p>';
    const max = Math.max(1, ...items.map((i) => i.value || 0));
    return '<div class="dsn-bars">' + items.map((i) =>
      '<div class="dsn-bar-row"' + (i.title ? ' title="' + esc(i.title) + '"' : "") + '><span class="dsn-bar-label">' + i.label + '</span>' +
      '<span class="dsn-bar-track"><i style="width:' + Math.round(((i.value || 0) / max) * 100) + '%"></i></span>' +
      '<span class="dsn-bar-val">' + (i.text !== undefined ? i.text : num(i.value)) + "</span></div>").join("") + "</div>";
  }

  // Vertical columns, one per year. items: [{ label, value, text, selected, partial }]
  function columnChart(items, caption) {
    const max = Math.max(1, ...items.map((i) => i.value || 0));
    const anySelected = items.some((i) => i.selected);
    return '<div class="dsn-cols' + (anySelected ? " has-selection" : "") + '" role="img" aria-label="' + esc(caption) + '">' +
      items.map((i) =>
        '<div class="dsn-col' + (i.selected ? " is-selected" : "") + (i.partial ? " is-partial" : "") + (i.empty ? " is-empty" : "") + '"' + (i.title ? ' title="' + esc(i.title) + '"' : "") + '>' +
        '<span class="dsn-col-val">' + (i.text !== undefined ? i.text : num(i.value)) + "</span>" +
        (i.empty ? '<i class="dsn-col-none" title="No figure for this year"></i>'
                 : '<i style="height:' + Math.max(2, Math.round(((i.value || 0) / max) * 150)) + 'px"></i>') +
        '<span class="dsn-col-lab">' + esc(i.label) + "</span></div>").join("") + "</div>";
  }

  // The approval process changed just before this year (set in the YAML, passed in metrics.json)
  const changeYear = () => (M && M.process_change_year) || 2023;

  // A dagger marks time figures the process change affects: "All years", or a year from the change onwards
  const dagger = () => (isAll() || sel.some((y) => y >= changeYear()) ? " †" : "");

  function processNote() {
    return '<p class="dsn-note">† The data sharing process changed just before ' + changeYear() +
      ", allowing a quicker turnaround, so times from " + changeYear() + " onwards are not directly comparable with earlier years. " +
      "The process will be explained in more detail later.</p>";
  }

  function unavailable() {
    return '<p class="dsn-note">These figures are not available right now.</p>';
  }

  // ---------- sections ----------

  // The year filter: at the very top of the page, because it controls everything below it
  function renderFilter() {
    const chips = ['<button type="button" class="dsn-chip' + (isAll() ? " on" : "") + '" data-year="all" aria-pressed="' + isAll() + '">All years</button>']
      .concat(M.years.map((y) => '<button type="button" class="dsn-chip' + (chosen(y) ? " on" : "") + '" data-year="' + y + '" aria-pressed="' + chosen(y) + '">' + y + "</button>")).join("");
    return '<div class="dsn-filter"><span class="dsn-filter-label">Show figures for</span>' + chips +
      '<span class="dsn-filter-hint">Choose one or more years</span>' +
      '<span class="dsn-pdf"><span class="dsn-filter-label">Download PDF</span>' +
      '<button type="button" class="dsn-chip" data-pdf="landscape" title="One A4 landscape page">Landscape</button>' +
      '<button type="button" class="dsn-chip" data-pdf="portrait" title="One A4 portrait page">Portrait</button>' +
      '<span id="dsn-pdf-msg" class="dsn-pdf-msg" role="status"></span></span></div>';
  }

  // How many are behind each figure: two ladders (applications, baskets), and why some figures rest on fewer
  function renderNumbers() {
    const apps = M.applications.by_year;
    const nApps = sum(apps.filter((a) => picked().includes(a.year)), (a) => a.applications);
    const prep = prepared();
    const S = M.basket_stats && M.basket_stats.available ? M.basket_stats : null;
    const B = M.basket_turnaround && M.basket_turnaround.available ? M.basket_turnaround : null;
    const sRow = S ? rowFor(S) || {} : null;
    const bRow = B ? rowFor(B) || {} : null;
    const which = selLabel();

    const step = (n, label, sub) => '<div class="dsn-step"><div class="dsn-step-n">' + num(n) + '</div><div class="dsn-step-l">' + esc(label) + "</div>" +
      (sub ? '<div class="dsn-step-s">' + esc(sub) + "</div>" : "") + "</div>";
    const arrow = '<div class="dsn-step-arrow" aria-hidden="true">&rarr;</div>';
    const ladder = (title, sub, steps, foot) => '<div class="dsn-ladder"><div class="dsn-ladder-title">' + esc(title) + "<span>" + esc(sub) + '</span></div><div class="dsn-ladder-steps">' + steps + "</div>" +
      (foot ? '<div class="dsn-ladder-foot">' + foot + "</div>" : "") + "</div>";
    const notAsked = Math.max((nApps || 0) - (prep.with_data || 0), 0);

    const appLadder = ladder("Applications", "counted by the year they applied",
      step(nApps, "Approved applications") + arrow +
      step(prep.with_data, "Asked for data", nApps ? pct(prep.percent) + " of approved applications. Each had at least one basket sent." : "There are no approved applications for this period."),
      notAsked ? "<strong>" + num(notAsked) + " approved " + (notAsked === 1 ? "application has" : "applications have") + " not asked for data.</strong> " + (notAsked === 1
        ? "It either has not yet finalised its variables request, or it already held the data it needed and did not need to request it."
        : "They either have not yet finalised their variables request, or they already held the data they needed and did not need to request it.") : "");

    let basketLadder;
    if (sRow) {
      const sent = sRow.baskets || 0;
      const withTurn = sRow.with_turnaround || 0;
      const noTurn = Math.max(sent - withTurn, 0);
      basketLadder = ladder("Baskets", "counted by the year they were sent",
        step(sent, "Baskets sent") + arrow +
        (B ? step(withTurn, "With a turnaround time", pct(sent ? (withTurn / sent) * 100 : null) + " of baskets sent" +
              (bRow && bRow.in_turnaround ? ". Measured from " + num(bRow.in_turnaround) + " requests, for " + num(bRow.projects) + " projects." : "."))
           : step(null, "With a turnaround time", "Not available right now.")),
        B && noTurn ? "<strong>" + num(noTurn) + " " + (noTurn === 1 ? "basket sent has" : "baskets sent have") + " no turnaround time.</strong> " +
          (manualDates(B)
            ? "A basket has a turnaround time if it was requested through the current request process, which records when a request comes in and when it is completed (it started in " + plannerYear(B) +
              "), or if the request date was found in emails. The other baskets have no request time to measure from."
            : "A basket has a turnaround time only if it was requested through the current request process, which records when a request comes in and when it is completed. " +
              "That process started in " + plannerYear(B) + ", so baskets sent before then, or outside it, have no request time to measure from.") : "");
    } else {
      basketLadder = ladder("Baskets", "counted by the year they were sent", '<div class="dsn-step"><div class="dsn-step-l">Basket figures are not available right now.</div></div>');
    }

    const intro = '<p class="dsn-note">Not every figure on this page is based on every application. Some things are only known for part of the picture, so the number behind each figure changes. ' +
      "These are the numbers at each step for <strong>" + esc(which) + "</strong>, so you can see how much each figure rests on.</p>";
    const explain = '<p class="dsn-note"><strong>Applications</strong> are counted by the year they applied and <strong>baskets</strong> by the year they were sent, so the two ladders cover different sets. ' +
      "An application <em>asked for data</em> if it had at least one basket sent.</p>";

    return intro + '<div class="dsn-ladders">' + appLadder + basketLadder + "</div>" + explain;
  }

  function renderOverview() {
    const apps = M.applications.by_year;
    const nApps = sum(apps.filter((a) => picked().includes(a.year)), (a) => a.applications);
    const distinct = (rows) => rows.filter((r) => valueOf(r) > 0).length;
    const ap = rowFor(M.approval_times) || {};
    const th = M.approval_times.thresholds[0];
    const prep = prepared();

    const partial = M.end_year === new Date().getFullYear() ? " " + M.end_year + " is the year to date." : "";
    const notInJay = sum(apps.filter((a) => picked().includes(a.year)), (a) => a.not_in_jay);
    const notInJayNote = notInJay
      ? " " + num(notInJay) + (notInJay === 1 ? " approved application is" : " approved applications are") +
        " not in Jay yet (no basket built). " + (notInJay === 1 ? "It counts" : "They count") + " in the applications and approval figures, but have no institution, country or data."
      : "";
    return '<div class="dsn-tiles">' +
      tile("Applications", num(nApps)) +
      tile("Institutions", num(distinct(M.where.institutions))) +
      tile("Countries", num(distinct(M.where.countries))) +
      tile("Median time to approve" + dagger(), days(ap.median_days)) +
      tile("Approved within " + th + " days" + dagger(), pct(ap["percent_within_" + th]), num(ap["within_" + th]) + " of " + num(ap.approved) + " approved") +
      tile("Applications with data prepared", pct(prep.percent), num(prep.with_data) + " of " + num(prep.applications)) +
      "</div>" +
      '<p class="dsn-note">Applications from ' + M.start_year + " onwards, counted by year of application." + partial + notInJayNote +
      (M.generated ? " Updated " + esc(formatDate(M.generated)) + "." : "") + "</p>" + processNote();
  }

  // The y axis tops out at 60 so the lines fill the chart. It only goes higher if a line would
  // otherwise be cut off, in which case it rounds up to the next sensible step.
  const AXIS_DEFAULT_MAX = 60;
  function axisScale(v) {
    if (v <= AXIS_DEFAULT_MAX) return { max: AXIS_DEFAULT_MAX, step: 10 };
    const step = v <= 120 ? 20 : v <= 300 ? 50 : 100;
    return { max: Math.ceil(v / step) * step, step };
  }

  function trajectorySvg() {
    const bm = M.applications.by_month;
    if (!bm) return '<p class="dsn-note">The month-by-month view is not available right now.</p>';
    const W = 700, H = 300, m = { l: 46, r: 40, t: 16, b: 34 };
    const shown = M.years.filter((y) => visibleLines.has(y) && bm[String(y)]);
    let dataMax = 0;
    shown.forEach((yr) => bm[String(yr)].cumulative.forEach((v) => { if (isNum(v) && v > dataMax) dataMax = v; }));
    const axis = axisScale(dataMax);
    const maxY = axis.max;
    const x = (i) => m.l + ((W - m.l - m.r) * i) / 11;
    const y = (v) => H - m.b - ((H - m.t - m.b) * v) / maxY;

    let svg = '<svg class="dsn-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Cumulative applications by month, one line per year">';
    for (let v = 0; v <= maxY; v += axis.step) {
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
      const width = isAll() ? 2.5 : chosen(yr) ? 4 : 1.8;
      const faded = !isAll() && !chosen(yr) ? ' opacity="0.55"' : "";
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
      selected: chosen(r.year), partial: r.year === nowYear,
    }));
    return "<h3>Applications each year</h3>" +
      columnChart(cols, "Applications per year: " + M.applications.by_year.map((r) => r.year + " " + r.applications).join(", ")) +
      (cols.some((c) => c.partial) ? '<p class="dsn-note">* Year to date.</p>' : "") +
      "<h3>Building up through the year</h3><p class=\"dsn-sub\">Cumulative applications by month. Choose which years to compare.</p>" +
      lineLegend() + trajectorySvg();
  }

  function topList(rows, nameFn, n, extraFn, total) {
    const items = rows.map((r) => ({ r, value: valueOf(r) })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
    const shown = items.slice(0, n).map((x) => ({
      label: esc(nameFn(x.r)) + (extraFn && extraFn(x.r) ? '<span class="dsn-var-label">' + esc(extraFn(x.r)) + "</span>" : ""),
      value: x.value, text: total > 0 ? withPct(x.value, total) : undefined, title: outOf(x.value, total, "applications"),
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
      "<h3>Top countries</h3>" + topList(w.countries, (r) => r.name, 10, null, total) +
      "<h3>Top institutions</h3>" + topList(w.institutions, (r) => r.name, 10, (r) => r.country, total);
  }

  // A year with no figure is drawn as a hatched "none" placeholder, not a bar of nothing, and (when emptyNote is given) explained underneath
  function trendColumns(values, caption, format, marked, emptyNote, hover) {
    const empties = [];
    const html = columnChart(M.years.map((y) => {
      const v = values(y);
      if (!isNum(v)) empties.push(y);
      return { label: String(y) + (marked && y >= changeYear() ? "†" : ""), value: isNum(v) ? v : 0,
        text: isNum(v) ? format(v) : "none", empty: !isNum(v), selected: chosen(y), title: hover ? hover(y, v) : "" };
    }), caption);
    return html + (empties.length && emptyNote ? '<p class="dsn-note dsn-empty-note">' + emptyNote(empties) + "</p>" : "");
  }

  // Baskets per year (Jay + SharePoint), then the turnaround of every basket requested through Planner
  function basketBlock() {
    const S = M.basket_stats;
    const B = M.basket_turnaround;
    let html = "<h3>Baskets</h3>";

    // ---- baskets per year ----
    if (S && S.available) {
      const per = S.period;
      const row = rowFor(S) || {};
      const tiles = tile("Baskets", num(row.baskets), isAll() ? per.baskets_from + " to " + per.baskets_to : "in " + selLabel()) +
        (isNum(row.projects) ? tile("Projects with baskets", num(row.projects)) : "");
      html += '<p class="dsn-note"><strong>Baskets per year.</strong> Every basket is sent through Jay, which holds the record of it. Each basket counts once, in the year its data was sent, from ' +
        per.baskets_from + "." + (per.projects_in_metrics_only ? " Only baskets of projects counted in these figures are included." : "") + "</p>" +
        '<div class="dsn-tiles">' + tiles + "</div>" +
        (S.totals && S.totals.left_out_project_not_in_metrics
          ? '<p class="dsn-note">' + num(S.totals.left_out_project_not_in_metrics) + " baskets were left out because their project is not counted in these figures.</p>" : "");
    } else {
      html += '<p class="dsn-note">Baskets per year are not available right now.</p>';
    }

    // ---- turnaround, for every basket requested through Planner ----
    html += "<h3>Basket turnaround</h3>";
    if (!B || !B.available) return html + '<p class="dsn-note">Turnaround figures are not available right now.</p>';
    const src = B.source;
    const manualOn = manualDates(B);
    html += '<p class="dsn-note"><strong>' + (manualOn ? "Where turnaround comes from." : "Why turnaround is only for baskets requested through Planner.") + "</strong> " +
      "Basket requests flow through Power Automate, which allows the request and completion times to be logged in SharePoint and Planner. That is what lets turnaround be measured, so it covers baskets requested this way, from " +
      plannerYear(B) + " (the first request is " + esc(formatDate(src.first_request)) + ")" +
      (manualOn ? ". For some baskets sent before then, or made outside the process, the request date was found in emails and entered by hand, and turnaround for those runs from that date to the date the data was sent. "
                : ", and not earlier baskets or baskets made outside the process. ") +
      "Turnaround is the time from a basket request coming in to the request being completed. " +
      "Only baskets that are matched to a basket in Jay, and linked to a project that is counted in these figures, are included.</p>";
    if (!isAll() && sel.every((y) => y < src.first_year)) {
      return html + '<p class="dsn-note">' + (manualOn ? "No basket request dates are recorded for " : "Planner has no basket requests for ") + selLabel() + ".</p>";
    }
    const row = rowFor(B) || {};
    const tileList = [tile("Basket requests", num(row.in_turnaround), "naming " + num(row.baskets) + " baskets, for " + num(row.projects) + " projects"),
      tile("Median turnaround", days(row.median_days), "from the request coming in to completion"),
      tile("Turned around on the same day", pct(row.same_day_percent))]
      .concat(B.thresholds.map((n) => tile("Within " + n + " days", pct(row["percent_within_" + n]), num(row["within_" + n]) + " of " + num(row.in_turnaround))));
    const lo = row.left_out || {};
    const projectOut = (lo.project_not_in_the_metrics || 0) + (lo.project_conflict_planner_vs_jay || 0) + (lo.not_linked_to_a_project || 0);
    const leftOut = projectOut
      ? " " + num(projectOut) + " completed " + (projectOut === 1 ? "request" : "requests") + " for baskets in Jay " + (projectOut === 1 ? "was" : "were") + " left out because the project is not counted in these figures or could not be confirmed (" +
        [lo.project_not_in_the_metrics ? num(lo.project_not_in_the_metrics) + " linked to a project outside these figures" : "",
         lo.project_conflict_planner_vs_jay ? num(lo.project_conflict_planner_vs_jay) + " where Planner and Jay disagree on the project" : "",
         lo.not_linked_to_a_project ? num(lo.not_linked_to_a_project) + " not linked to any project" : ""].filter(Boolean).join(", ") + ")."
      : "";

    // when the first basket request came in, compared with the application (Planner requests linked to applications)
    const tm = rowFor(B.request_timing) || {};
    const total = (tm.with_application || 0) + (tm.days_2_7 || 0) + (tm.days_8_30 || 0) + (tm.over_30 || 0);
    const bands = [["with_application", "With the application (same or next day)"], ["days_2_7", "2 to 7 days later"],
      ["days_8_30", "8 to 30 days later"], ["over_30", "More than 30 days later"]];
    const timing = total
      ? '<p class="dsn-sub">When the first basket request came in, after the application</p>' +
        '<div class="dsn-tiles">' + tile("Median time from application to first basket request", days(tm.median_days_after_application), "across " + num(tm.applications) + " applications") + "</div>" +
        barRows(bands.map((x) => ({ label: x[1], value: tm[x[0]] || 0, text: withPct(tm[x[0]] || 0, total), title: outOf(tm[x[0]] || 0, total, "applications with a linked first basket request") })))
      : "";
    const notes = '<p class="dsn-note">Each request counts once, however many baskets it names. ' +
      (row.manual_requests ? num(row.manual_requests) + (row.manual_requests === 1 ? " request uses" : " requests use") + " a request date found in emails (" + num(row.manual_baskets) + (row.manual_baskets === 1 ? " basket" : " baskets") + "). " : "") +
      (row.open ? num(row.open) + " requests are still open and are not in the turnaround. " : "") + leftOut.trim() +
      " All times are medians, because a few very slow requests would skew an average.</p>";
    return html + '<div class="dsn-tiles dsn-tiles-one-line" style="--dsn-cols:' + tileList.length + '">' + tileList.join("") + "</div>" + notes + timing;
  }

  function renderService() {
    const ap = rowFor(M.approval_times) || {};
    const rp = rowFor(M.repeat_requests) || {};
    const ths = M.approval_times.thresholds;
    const S = M.basket_stats;
    const B = M.basket_turnaround;

    const approvalTiles = tile("Median time to approve" + dagger(), days(ap.median_days), "across " + num(ap.approved) + " approved") +
      ths.map((n) => tile("Approved within " + n + " days" + dagger(), pct(ap["percent_within_" + n]), num(ap["within_" + n]) + " of " + num(ap.approved))).join("");
    const repeatTiles = tile("Projects that came back for more", pct(rp.percent_returned), num(rp.returned) + " of " + num(rp.projects_with_data)) +
      tile("Median time until they came back", days(rp.median_days_to_return)) +
      tile("Projects with more than one basket", num(rp.with_multiple_baskets));

    return "<h3>Approval</h3><div class=\"dsn-tiles\">" + approvalTiles + "</div>" +
      '<p class="dsn-note">Time to approve runs from the application to the decision. All times are medians.</p>' +
      basketBlock() +
      "<h3>Trends by year</h3>" +
      '<p class="dsn-sub dsn-chart-title">Median days to approve an application</p>' +
      trendColumns((y) => (byYear(M.approval_times.by_year, y) || {}).median_days, "Median days to approve by year", (v) => String(Math.round(v)), true) + processNote() +
      (S && S.available
        ? '<p class="dsn-sub dsn-chart-title">Baskets per year (date sent in Jay, from ' + S.period.baskets_from + ")</p>" +
          trendColumns((y) => (byYear(S.by_year, y) || {}).baskets, "Baskets per year", (v) => num(v))
        : "") +
      (B && B.available
        ? '<p class="dsn-sub dsn-chart-title">Median days from basket request to completion (' + (manualDates(B)
            ? "every basket requested through Planner, from " + plannerYear(B) + ", and baskets whose request date was found in emails"
            : "every basket requested through Planner, from " + plannerYear(B)) + ")</p>" +
          trendColumns((y) => (byYear(B.by_year, y) || {}).median_days, "Median turnaround by year of the request", (v) => String(Math.round(v)), false, (ys) => {
            const early = ys.filter((y) => y < plannerYear(B)), later = ys.filter((y) => y >= plannerYear(B));
            return (early.length ? "<strong>" + early.join(", ") + ":</strong> no baskets have a turnaround time, because the request process started in " + plannerYear(B) +
              (manualDates(B) ? " and no request dates from emails are recorded for " + (early.length === 1 ? "it" : "them") : "") + ". " : "") +
              (later.length ? "<strong>" + later.join(", ") + ":</strong> no completed requests yet. " : "");
          }, (y, v) => {
            const r = byYear(B.by_year, y) || {};
            if (!isNum(v)) return "No baskets with a turnaround time for requests made in " + y;
            return num(r.baskets) + (r.baskets === 1 ? " basket" : " baskets") + " in this median (requests made in " + y + ")" +
              (r.manual_baskets ? ", " + num(r.manual_baskets) + " with a request date found in emails" : "");
          }) +
          '<p class="dsn-note">Hover over a bar to see how many baskets its median is based on. These numbers are smaller than the Baskets per year chart above. That chart counts every basket sent through Jay, by the year its data was sent. A turnaround time can only be worked out for a basket whose request came in through the request process (from ' + plannerYear(B) + ')' + (manualDates(B) ? " or whose request date was found in emails" : "") + " and has been completed, and this chart groups those baskets by the year the request came in, not the year the data was sent.</p>"
        : "") +
      '<p class="dsn-sub dsn-chart-title">Applications with data prepared (%)</p>' +
      trendColumns((y) => (byYear(M.data_prepared.by_year, y) || {}).percent_with_data, "Percentage of applications with data prepared by year", (v) => Math.round(v) + "%") +
      "<h3>Repeat requests</h3><div class=\"dsn-tiles\">" + repeatTiles + "</div>" +
      '<p class="dsn-note">' + esc(M.repeat_requests.definition || "") + "</p>" +
      "<h3>New Condor accounts</h3>" +
      trendColumns((y) => (byYear(M.condor_accounts.by_year, y) || {}).new_accounts, "New Condor accounts by year", (v) => num(v));
  }

  function renderRequests() {
    const types = (M.data_types && M.data_types.types) || [];
    // projects in the chosen years that are in Jay (the data types are only known for those): applications less those not in Jay yet
    const jayApps = sum(M.applications.by_year.filter((a) => picked().includes(a.year)), (a) => a.applications - (a.not_in_jay || 0));
    const typeItems = types.map((t) => {
      const n = isAll() ? t.projects : sum(sel, (y) => (t.by_year[String(y)] || {}).projects || 0);
      const cell = isAll() ? { projects: t.projects, percent: t.percent } : { projects: n, percent: jayApps ? Math.round((n / jayApps) * 1000) / 10 : null };
      return { label: esc(t.type), value: cell.percent || 0, text: pct(cell.percent) + " (" + num(cell.projects) + ")", title: outOf(cell.projects, jayApps, "applications in Jay") };
    });

    let topicsHtml = '<p class="dsn-note">Topic figures need the data dictionary and the variable request file, which are not available right now.</p>';
    let yearsHtml = "";
    let unmatchedNote = "";
    if (requests && dict.size) {
      const st = requestStats();
      topicsHtml = barRows(st.topics.slice(0, 12).map((x) => ({ label: esc(x.name), value: x.projects, text: withPct(x.projects, st.projectCount), title: outOf(x.projects, st.projectCount, "projects that requested variables") })));
      yearsHtml = fold("years", "Years of data collection", "<p class=\"dsn-sub\">Projects asking for at least one variable from each year of collection</p>" +
        barRows(st.collection.map((x) => ({ label: esc(x.name), value: x.projects, text: withPct(x.projects, st.projectCount), title: outOf(x.projects, st.projectCount, "projects that requested variables") }))));
      if (st.notInDictionary) unmatchedNote = '<p class="dsn-note">' + num(st.notInDictionary) + (st.notInDictionary === 1 ? " requested variable is" : " requested variables are") + " not in the data dictionary yet, so are not counted in topics or years of collection.</p>";
    }
    return "<h3>Types of special data requested</h3><p class=\"dsn-sub\">Share of applications asking for each type (number of projects in brackets)</p>" + barRows(typeItems) +
      fold("topics", "Topics", "<p class=\"dsn-sub\">Projects asking for at least one variable in each topic</p>" + topicsHtml) + yearsHtml + unmatchedNote +
      '<p class="dsn-note">Topics and years of collection are counted by the year the data was sent.</p>';
  }

  function renderVariables() {
    // Most requested variables (popular_vars_yr.json)
    let popHtml = '<p class="dsn-note">The most requested variables are not available right now.</p>';
    // a project counts once for each year it requested variables in, which is how the popular list is counted too
    const popBase = requests ? sum(requests, (p) => (isAll() ? Object.keys(p.by_year) : sel.map(String)).filter((y) => (p.by_year[y] || []).length).length) : 0;
    if (popular && popular.length) {
      const items = popular.map((p) => ({ name: p.name, value: isAll() ? p.total : sum(sel, (y) => (p.counts || {})[String(y)] || 0) }))
        .filter((p) => p.value > 0).sort((a, b) => b.value - a.value).slice(0, 10)
        .map((p) => ({ label: varLink(p.name), value: p.value, text: withPct(p.value, popBase), title: outOf(p.value, popBase, "project-years with variables requested") }));
      popHtml = barRows(items);
    }

    // Size of requests
    const vp = rowFor(M.variables_per_project) || {};
    const bandTotal = sum(M.variables_per_project.size_band_names, (n) => (vp.size_bands || {})[n] || 0);
    const bands = M.variables_per_project.size_band_names.map((n) => ({ label: esc(n + " variables"), value: (vp.size_bands || {})[n] || 0, text: withPct((vp.size_bands || {})[n] || 0, bandTotal), title: outOf((vp.size_bands || {})[n] || 0, bandTotal, "projects") }));
    const sizeHtml = '<div class="dsn-tiles">' + tile("Median per project", isNum(vp.median) ? Number(vp.median).toFixed(0) : "–") + tile("Largest request", num(vp.max)) + "</div>" + barRows(bands);

    // Requested together
    const b = M.bundles;
    let togetherHtml = '<p class="dsn-note">Variable pairs are not available right now.</p>';
    if (b) {
      const pairs = b.top_pairs.slice(0, 10).map((p) => ({
        label: varLink(p.a) + '<span class="dsn-plus"> + </span>' + varLink(p.b), value: p.projects,
        text: withPct(p.projects, b.projects) + " projects", title: outOf(p.projects, b.projects, "projects (all years)"),
      }));
      const names = Object.keys(b.also_requested || {}).sort((x, y) => x.localeCompare(y));
      const options = '<option value="">Choose a variable...</option>' + names.map((n) => {
        const info = dict.get(String(n).toLowerCase());
        return '<option value="' + esc(n) + '"' + (n === pickedVariable ? " selected" : "") + ">" + esc(n) + (info && info.label ? " \u2013 " + esc(info.label) : "") + "</option>";
      }).join("");
      let partners = "";
      if (pickedVariable && b.also_requested[pickedVariable]) {
        partners = '<div class="dsn-bars">' + b.also_requested[pickedVariable].map((p) =>
          '<div class="dsn-bar-row"' + (isNum(p.projects_with_variable) ? ' title="' + esc(outOf(p.projects_together, p.projects_with_variable, "projects that asked for " + pickedVariable + " also asked for " + p.name)) + '"' : "") + '><span class="dsn-bar-label">' + varLink(p.name) + '</span><span class="dsn-bar-track"><i style="width:' + Math.min(100, p.percent_of_projects_with_variable) + '%"></i></span>' +
          '<span class="dsn-bar-val">' + (isNum(p.projects_together) ? num(p.projects_together) + " (" + pct(p.percent_of_projects_with_variable) + ")" : pct(p.percent_of_projects_with_variable)) + "</span></div>").join("") + "</div>" +
          '<p class="dsn-note">Share of projects asking for ' + esc(pickedVariable) + " that also asked for each variable.</p>";
      }
      togetherHtml = '<p class="dsn-sub">Pairs of variables requested together most often, across all years</p>' + barRows(pairs) +
        '<p class="dsn-sub" style="margin-top:18px;">What else do projects ask for with a variable?</p>' +
        '<select id="dsn-pick" class="dsn-select" aria-label="Choose a variable">' + options + "</select>" + partners +
        '<p class="dsn-note">Each pair is counted once for every project that asked for both variables, however many baskets it sent. Very popular variables will often appear together simply because each is popular. Pairs requested by fewer than ' + num(b.min_projects) + " projects are not shown.</p>";
    }

    return "<h3>Most requested variables</h3><p class=\"dsn-sub\">Number of projects requesting each variable" + (isAll() || sel.length > 1 ? ", added up across years" : "") + "</p>" + popHtml +
      "<h3>How many variables projects ask for</h3>" + sizeHtml +
      fold("together", "Variables requested together", togetherHtml);
  }

  function renderAbout() {
    return "<p>These figures come from the data sharing records and are updated whenever the data is refreshed. They cover applications from " + M.start_year + " onwards.</p>" +
      "<ul>" +
      "<li><strong>Approved but not in Jay yet:</strong> an application can be approved before any basket is built, so it is not in Jay. It still counts in the application and approval figures, using its SharePoint request and decision times. It has no institution, country or UK flag, and no data figures.</li>" +
      "<li><strong>Year of application</strong> is when the application was submitted. Most figures use it. Topics, collection years and variables use the year the data was sent.</li>" +
      "<li><strong>Medians:</strong> every time is a median (the middle value), not an average, because a few very slow cases would pull an average up.</li>" +
      "<li><strong>Time to approve</strong> is the number of days from submission to approval. Applications not yet approved are left out.</li>" +
      "<li><strong>Baskets per year</strong> counts every basket once, in the year its data was sent, from 2021. Every basket is sent through Jay, which holds the record of it, so a basket that is only named on an application and was never sent is not counted. Only baskets of projects counted in these figures are included.</li>" +
      "<li><strong>Basket turnaround</strong> is the number of days from a basket request coming in to the request being completed. Requests flow through Power Automate, which allows the times to be logged in SharePoint and Planner, so it covers baskets requested this way, from 2022." + (manualDates(M.basket_turnaround) ? " For some baskets sent before then, or made outside the process, the request date was found in emails and entered by hand; turnaround for those runs from that date to the date the data was sent." : "") + " Only baskets that are matched to a basket in Jay are included, and each must be linked to a project that is counted in these figures: the project comes from the Planner request and from Jay, and the two must agree. Requests still open are not included.</li>" +
      "<li><strong>Asked for data</strong> means an application had at least one basket sent. An approved application that has not asked for data either has not yet finalised its variables request, or already held the data it needed and did not need to request it.</li>" +
      "<li><strong>When the first basket request comes in</strong> uses the Planner requests that can be linked to an application (by its Form ID or share name), and measures from the application.</li>" +
      "<li><strong>Applications with data prepared</strong> are those that have had at least one basket of variables prepared. Recent applications may not have asked for data yet.</li>" +
      "<li><strong>Projects that came back for more</strong> are projects that were sent more data more than " + ((M.repeat_requests && M.repeat_requests.gap_days) || 7) + " days after their first.</li>" +
      "<li><strong>Dates:</strong> where a project is logged in the SharePoint request log, its request and decision times are used for the time to approve. Otherwise the dates held in Jay are used.</li>" +
      "<li><strong>†</strong> The data sharing process changed just before " + changeYear() + ", allowing a quicker turnaround, so times from " + changeYear() + " onwards are not directly comparable with earlier years. The process will be explained in more detail later.</li>" +
      "<li>Variables added to every basket automatically are not counted.</li>" +
      "</ul>";
  }

  // ---------- PDF export (client side) ----------
  // "Download PDF" builds a one-page report of the figures for the CHOSEN years inside a hidden iframe (so the site's own styles cannot
  // touch it), turns it into an image with html2canvas and saves it as an A4 PDF with jsPDF. Nothing is sent anywhere. The two libraries
  // are loaded from cdnjs the first time a PDF is asked for (window.DSN_PDF_LIBS can point somewhere else).
  const PDF_LIBS = window.DSN_PDF_LIBS || [
    "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  ];
  const PDF_CSS = "*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#333}" +
    ".pg{background:#f1ebf8;position:relative;overflow:hidden;display:flex;flex-direction:column}" +
    ".hd{background:linear-gradient(90deg,#4a0a7a,#6a0dad);color:#fff;padding:14px 26px;display:flex;justify-content:space-between;align-items:center;flex:none}" +
    ".hd h1{margin:0;font-size:22px}.hd small{display:block;font-size:10.5px;opacity:.9;margin-top:3px}.hd .r{text-align:right;font-size:10px;opacity:.9}.hd .r b{font-size:16px}" +
    ".body{flex:1;padding:14px 26px 10px;display:grid;gap:10px;min-height:0}" +
    ".w{display:flex;min-width:0;min-height:0}" +
    ".box{flex:1;min-width:0;background:#fff;border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;min-height:0;box-shadow:0 1px 2px rgba(0,0,0,.12)}" +
    "h2{font-size:11px;margin:0 0 7px;color:#4a0a7a;text-transform:uppercase;letter-spacing:.04em;flex:none}" +
    ".tiles{display:grid;gap:8px}.t{background:#fff;border-radius:8px;border-left:5px solid #8e44c9;padding:8px 10px;box-shadow:0 1px 2px rgba(0,0,0,.12);display:flex;flex-direction:column;justify-content:center}" +
    ".t b{font-size:23px;color:#4a0a7a;line-height:1.1}.t span{font-size:9px;color:#555;margin-top:2px}.t.g{border-color:#2a9d8f}.t.g b{color:#1a6b61}.t.o{border-color:#e08a2e}.t.o b{color:#9a5a10}" +
    ".cols{flex:1;display:flex;align-items:flex-end;gap:5px;border-bottom:1px solid #bbb;min-height:60px}" +
    ".c{flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%;text-align:center;font-size:8px}.c em{font-style:normal;color:#555;margin-bottom:1px}" +
    ".c i{display:block;background:#8e44c9;border-radius:2px 2px 0 0}.c.g i{background:#2a9d8f}.c.dim i{opacity:.35}" +
    ".yr{display:flex;gap:5px;font-size:8px;text-align:center;color:#555;margin-top:2px;flex:none}.yr div{flex:1}" +
    ".cap{font-size:8px;color:#777;margin-top:4px;line-height:1.3;flex:none}" +
    ".bars{flex:1;display:flex;flex-direction:column;justify-content:space-around}" +
    ".bar{display:flex;align-items:center;font-size:9px}.bar .l{width:34%;flex:none;line-height:1.25;padding-right:4px}.bar .b{flex:1;background:#eee;height:9px;border-radius:2px;margin:0 6px}" +
    ".bar .b i{display:block;height:9px;background:#8e44c9;border-radius:2px}.bar .v{width:74px;flex:none;text-align:right;color:#555}" +
    ".split{display:flex;height:18px;border-radius:3px;overflow:hidden;margin:2px 0 8px;font-size:8.5px;color:#fff;flex:none}.split div{display:flex;align-items:center;justify-content:center;white-space:nowrap}" +
    ".big{flex:1;display:flex;align-items:center;justify-content:space-around;text-align:center}.big b{display:block;font-size:26px;color:#4a0a7a}.big span{font-size:8.5px;color:#555}" +
    ".none{font-size:9px;color:#777}.ft{flex:none;background:#4a0a7a;color:#e8d8f6;font-size:8px;padding:7px 26px;line-height:1.4}";

  function pdfData() {
    const ap = rowFor(M.approval_times) || {};
    const rp = rowFor(M.repeat_requests) || {};
    const S = M.basket_stats, B = M.basket_turnaround;
    const sRow = S && S.available ? rowFor(S) || {} : {};
    const tRow = B && B.available ? rowFor(B) || {} : {};
    const vp = rowFor(M.variables_per_project) || {};
    const apps = M.applications.by_year;
    const nApps = sum(apps.filter((a) => picked().includes(a.year)), (a) => a.applications);
    const prep = prepared();
    const top = (rows, n) => rows.map((r) => ({ name: r.name, value: valueOf(r) })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value).slice(0, n);
    const uk = M.where.uk.map((r) => ({ name: ukLabel(r.name), value: valueOf(r) })).filter((x) => x.value > 0);
    const ukTotal = sum(uk, (x) => x.value);
    const jayApps = sum(apps.filter((a) => picked().includes(a.year)), (a) => a.applications - (a.not_in_jay || 0));
    const types = ((M.data_types && M.data_types.types) || []).map((t) => {
      const n = isAll() ? t.projects : sum(sel, (y) => (t.by_year[String(y)] || {}).projects || 0);
      return { name: t.type, value: n, text: pct(jayApps ? (n / jayApps) * 100 : null) + " (" + num(n) + ")" };
    }).filter((x) => x.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
    let topics = [], topicBase = 0;
    if (requests && dict.size) { const st = requestStats(); topics = st.topics.slice(0, 8).map((x) => ({ name: x.name, value: x.projects })); topicBase = st.projectCount; }
    let vars = [], varBase = 0;
    if (popular && popular.length) {
      varBase = requests ? sum(requests, (p) => (isAll() ? Object.keys(p.by_year) : sel.map(String)).filter((y) => (p.by_year[y] || []).length).length) : 0;
      vars = popular.map((p) => ({ name: (dict.get(String(p.name).toLowerCase()) || {}).name || p.name, value: isAll() ? p.total : sum(sel, (y) => (p.counts || {})[String(y)] || 0) }))
        .filter((p) => p.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);
    }
    const pairs = M.bundles && M.bundles.top_pairs ? M.bundles.top_pairs.slice(0, 3).map((p) => ({ name: p.a + " + " + p.b, value: p.projects, text: withPct(p.projects, M.bundles.projects) })) : [];
    const ths = (M.approval_times.thresholds || []).map((n) => ({ name: "Within " + n + " days", value: ap["percent_within_" + n] || 0, text: pct(ap["percent_within_" + n]) }));
    const distinct = (rows) => rows.filter((r) => valueOf(r) > 0).length;
    const th0 = (M.approval_times.thresholds || [])[0];
    return {
      th0, within: th0 ? ap["percent_within_" + th0] : null, institutionCount: distinct(M.where.institutions), countryCount: distinct(M.where.countries),
      ap, rp, nApps, prep, vp, uk, ukTotal, types, topics, topicBase, vars, varBase, pairs, ths,
      baskets: sRow.baskets, turnaround: tRow.median_days,
      condor: sum(M.condor_accounts.by_year.filter((r) => picked().includes(r.year)), (r) => r.new_accounts),
      countries: top(M.where.countries, 5), institutions: top(M.where.institutions, 7), countryTotal: ukTotal,
      appCols: apps.map((a) => ({ label: String(a.year).slice(-2), value: a.applications, text: num(a.applications), dim: !isAll() && !chosen(a.year) })),
      basketCols: S && S.available ? M.years.map((y) => ({ label: String(y).slice(-2), value: (byYear(S.by_year, y) || {}).baskets || 0, text: num((byYear(S.by_year, y) || {}).baskets || 0), dim: !isAll() && !chosen(y) })).filter((c) => c.value > 0) : [],
      turnCols: B && B.available ? M.years.map((y) => ({ y, r: byYear(B.by_year, y) || {} })).filter((x) => isNum(x.r.median_days)).map((x) => ({
        label: String(x.y).slice(-2), value: x.r.median_days, text: String(Math.round(x.r.median_days)), sub: x.r.baskets, dim: !isAll() && !chosen(x.y) })) : [],
    };
  }

  const rBars = (items, base, fmt) => items.length
    ? '<div class="bars">' + (function () { const max = Math.max(1, ...items.map((i) => i.value)); return items.map((i) =>
        '<div class="bar"><span class="l">' + esc(String(i.name).length > 30 ? String(i.name).slice(0, 29) + "…" : i.name) + '</span><span class="b"><i style="width:' + Math.round((i.value / max) * 100) + '%"></i></span><span class="v">' +
        (i.text !== undefined ? i.text : (fmt ? fmt(i) : withPct(i.value, base))) + "</span></div>").join(""); })() + "</div>"
    : '<div class="bars"><div class="none">Nothing to show for this selection.</div></div>';
  const rCols = (cols, cls, sub) => {
    if (!cols.length) return '<div class="cols"><div class="none">Nothing to show for this selection.</div></div>';
    const max = Math.max(1, ...cols.map((c) => c.value));
    return '<div class="cols">' + cols.map((c) => '<div class="c ' + (cls || "") + (c.dim ? " dim" : "") + '"><em>' + c.text + '</em><i style="height:' + Math.max(2, Math.round((c.value / max) * 100)) + '%"></i></div>').join("") + "</div>" +
      '<div class="yr">' + cols.map((c) => "<div>" + c.label + "</div>").join("") + "</div>" +
      (sub ? '<div class="yr" style="color:#2a9d8f">' + cols.map((c) => "<div>n=" + num(c.sub) + "</div>").join("") + "</div>" : "");
  };
  const rBox = (title, inner, area) => '<div class="w"' + (area ? ' style="' + area + '"' : "") + '><section class="box"><h2>' + title + "</h2>" + inner + "</section></div>";
  const rTile = (v, l, cls) => '<div class="t ' + (cls || "") + '"><b>' + v + "</b><span>" + l + "</span></div>";
  const rSplit = (d) => d.ukTotal ? '<div class="split">' + d.uk.map((x, i) => '<div style="width:' + (x.value / d.ukTotal) * 100 + '%;background:' + (i ? "#2a9d8f" : "#6a0dad") + '">' + esc(x.name) + " " + pct((x.value / d.ukTotal) * 100) + "</div>").join("") + "</div>" : "";
  const turnCap = '<div class="cap">Median days from basket request to completion, with the number of baskets behind each bar (n). Smaller than the baskets chart, because only baskets with a matched request have a turnaround time.</div>';

  function pdfHtml(orientation) {
    const d = pdfData();
    const land = orientation === "landscape";
    const W = land ? 1123 : 794, H = land ? 794 : 1123;
    const when = M.generated ? formatDate(M.generated) : "";
    const hd = "<div><h1>NSHD Data Sharing: Metrics and Trends</h1><small>Applications for NSHD data, basket requests and turnaround · Applications " + M.start_year + " to " + M.end_year +
      " · Years shown: " + esc(selLabel()) + '</small></div><div class="r"><b>OWL</b><br>Generated ' + new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + (when ? " · Data updated " + esc(when) : "") + "</div>";
    const ft = "<b>How to read this report.</b> All times are medians, not averages. Basket dates come from Jay (date sent); turnaround runs from the request coming in to its completion, for baskets with a matched request. " +
      "Percentages use the applications (or projects) shown. Figures are for " + esc(selLabel()) + ". Interactive version with year filters: rmjdish.github.io/OWL/docs/data_sharing/metrics";
    const medApprove = days(d.ap.median_days), medTurn = days(d.turnaround);
    let body;
    if (land) {
      const rail = [rTile(num(d.nApps), "Approved projects"), rTile(pct(d.within), "Approved within " + (d.th0 || "–") + " days"), rTile(medApprove, "Median time to approve"),
        rTile(num(d.baskets), "Baskets requested", "g"), rTile(medTurn, "Median basket turnaround", "g"), rTile(pct(d.rp.percent_returned), "Projects that came back for more", "o")].join("");
      body = '<div class="body" style="grid-template-columns:170px 1fr 1fr 1fr;grid-template-rows:1fr 1fr 0.8fr">' +
        '<div class="tiles" style="grid-row:1/4;grid-template-rows:repeat(6,1fr)">' + rail + "</div>" +
        rBox("Applications each year", rCols(d.appCols) + '<div class="cap">Applications received per year (by year of application)</div>', "grid-column:2/4") +
        rBox("Median basket turnaround by year (days)", rCols(d.turnCols, "g", true) + turnCap) +
        rBox("How quickly applications are approved", '<div class="big"><div><b>' + (isNum(d.ap.median_days) ? Math.round(d.ap.median_days) : "–") + "</b><span>median days<br>to approve</span></div><div><b>" + pct(d.prep.percent) + "</b><span>projects with<br>data prepared</span></div></div>" + rBars(d.ths.slice(0, 2), 0)) +
        rBox("Where applicants are based", rSplit(d) + rBars(d.countries.slice(0, 4), d.countryTotal) + '<div class="cap" style="font-size:9px;color:#4a0a7a"><b>' + num(d.institutionCount) + "</b> institutions · <b>" + num(d.countryCount) + "</b> countries</div>") +
        rBox("Most requested variables", rBars(d.vars.slice(0, 5), d.varBase)) +
        rBox("Topics requested", rBars(d.topics.slice(0, 4), d.topicBase)) +
        rBox("Special data requested", rBars(d.types.slice(0, 4))) +
        rBox("Size of requests", '<div class="big"><div><b>' + (isNum(d.vp.median) ? Number(d.vp.median).toFixed(0) : "–") + "</b><span>median variables<br>per project</span></div><div><b>" + num(d.vp.max) + "</b><span>largest request<br>(variables)</span></div></div>") +
        "</div>";
    } else {
      const tiles = [rTile(num(d.nApps), "Approved projects"), rTile(num(d.institutionCount), "Institutions"), rTile(num(d.countryCount), "Countries"), rTile(medApprove, "Median time to approve"),
        rTile(pct(d.within), "Approved within " + (d.th0 || "–") + " days"), rTile(num(d.baskets), "Baskets requested", "g"), rTile(medTurn, "Median basket turnaround", "g"), rTile(pct(d.rp.percent_returned), "Projects that came back for more", "o")].join("");
      body = '<div class="body" style="grid-template-columns:1fr 1fr;grid-template-rows:auto 1.1fr 1fr 1.2fr 1fr 0.8fr">' +
        '<div class="tiles" style="grid-column:1/3;grid-template-columns:repeat(4,1fr)">' + tiles + "</div>" +
        rBox("Applications each year", rCols(d.appCols)) +
        rBox("Median basket turnaround by year (days)", rCols(d.turnCols, "g", true) + turnCap) +
        rBox("Where applicants are based", rSplit(d) + rBars(d.countries, d.countryTotal)) +
        rBox("Top institutions", rBars(d.institutions.slice(0, 5), d.countryTotal)) +
        rBox("Most requested variables", rBars(d.vars, d.varBase)) +
        rBox("Topics requested", rBars(d.topics, d.topicBase)) +
        rBox("Special data requested", rBars(d.types.slice(0, 4))) +
        rBox("Approval and requests", '<div class="big"><div><b>' + (isNum(d.ap.median_days) ? Math.round(d.ap.median_days) : "–") + "</b><span>median days<br>to approve</span></div><div><b>" + pct(d.prep.percent) + "</b><span>projects with<br>data prepared</span></div><div><b>" + (isNum(d.vp.median) ? Number(d.vp.median).toFixed(0) : "–") + "</b><span>median variables<br>per project</span></div><div><b>" + num(d.condor) + "</b><span>new Condor<br>accounts</span></div></div>" + rBars(d.ths.slice(0, 2), 0)) +
        rBox("Pairs of variables requested together most often", rBars(d.pairs), "grid-column:1/3") + "</div>";
    }
    return { W, H, html: "<!doctype html><meta charset=utf-8><style>" + PDF_CSS + ".pg{width:" + W + "px;height:" + H + "px}</style><div class=pg><div class=hd>" + hd + "</div>" + body + "<div class=ft>" + ft + "</div></div>" };
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src; s.onload = resolve; s.onerror = () => reject(new Error("could not load " + src));
      document.head.appendChild(s);
    });
  }
  function pdfLibs() {
    if (window.html2canvas && window.jspdf) return Promise.resolve();
    return Promise.all(PDF_LIBS.map(loadScript)).then(() => { if (!(window.html2canvas && window.jspdf)) throw new Error("the PDF tools did not load"); });
  }

  function exportPdf(orientation, button) {
    const msg = $("dsn-pdf-msg");
    const say = (t, bad) => { if (msg) { msg.textContent = t; msg.className = "dsn-pdf-msg" + (bad ? " is-error" : ""); } };
    const buttons = Array.from(document.querySelectorAll("[data-pdf]"));
    buttons.forEach((b) => (b.disabled = true));
    say("Preparing the " + orientation + " PDF...");
    let frame;
    return pdfLibs().then(() => {
      const page = pdfHtml(orientation);
      frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.style.cssText = "position:fixed;left:-20000px;top:0;border:0;width:" + page.W + "px;height:" + page.H + "px;";
      document.body.appendChild(frame);
      frame.contentDocument.open(); frame.contentDocument.write(page.html); frame.contentDocument.close();
      return new Promise((r) => setTimeout(r, 150)).then(() => window.html2canvas(frame.contentDocument.body, {
        scale: 3, width: page.W, height: page.H, windowWidth: page.W, windowHeight: page.H, backgroundColor: "#f1ebf8", useCORS: true,
      })).then((canvas) => {
        const land = orientation === "landscape";
        const pdf = new window.jspdf.jsPDF({ orientation: land ? "landscape" : "portrait", unit: "mm", format: "a4" });
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, land ? 297 : 210, land ? 210 : 297);
        pdf.setProperties({ title: "NSHD Data Sharing: Metrics and Trends (" + selLabel() + ")" });
        pdf.save("NSHD_Data_Sharing_Metrics_" + orientation + "_" + (isAll() ? "all_years" : sel.join("-")) + ".pdf");
        say("Downloaded.");
      });
    }).catch((err) => {
      console.error("[Metrics and Trends] PDF export failed:", err);
      say("The PDF could not be made (" + err.message + "). Please try again, or print the page instead.", true);
    }).then(() => {
      if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
      buttons.forEach((b) => (b.disabled = false));
    });
  }

  // ---------- render and events ----------

  function safely(id, fn) {
    const target = $(id);
    if (!target) return;
    try {
      target.innerHTML = fn();
    } catch (err) {
      console.error("[Metrics and Trends] Section " + id + " failed:", err);
      target.innerHTML = unavailable();
    }
  }

  function renderAll() {
    safely("dsn-filter", renderFilter);
    safely("dsn-numbers", renderNumbers);
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
        if (yearBtn.dataset.year === "all") sel = [];
        else {
          const y = parseInt(yearBtn.dataset.year, 10);
          sel = sel.includes(y) ? sel.filter((x) => x !== y) : sel.concat(y).sort((a, b) => a - b);   // click a year to add it, click again to remove it
          if (sel.length >= M.years.length) sel = [];                                                 // every year chosen = all years
          if (sel.includes(y)) visibleLines.add(y); // make sure a year just chosen is on the chart
        }
        renderAll();
        return;
      }
      const pdfBtn = e.target.closest("[data-pdf]");
      if (pdfBtn) { exportPdf(pdfBtn.dataset.pdf, pdfBtn); return; }
      const lineBtn = e.target.closest("[data-line]");
      if (lineBtn) {
        const y = parseInt(lineBtn.dataset.line, 10);
        if (visibleLines.has(y)) visibleLines.delete(y);
        else visibleLines.add(y);
        safely("dsn-applications", renderApplications);
      }
    });
    root().addEventListener("toggle", (e) => {        // 'toggle' does not bubble, so listen in the capture phase
      const d = e.target;
      if (d && d.classList && d.classList.contains("dsn-fold")) { if (d.open) openFolds.add(d.dataset.fold); else openFolds.delete(d.dataset.fold); }
    }, true);
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
      console.warn("[Metrics and Trends] " + label + " not loaded; carrying on without it.", err);
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
      optional(window.DSN_REQUESTS_INLINE, "requestsUrl", "data-requests-url", "variable requests JSON"),
    ]).then(([metrics, pop, dictionary, reqs]) => {
      if (!metrics || !Array.isArray(metrics.years) || !metrics.applications) throw new Error("the metrics file is missing its main sections");
      M = metrics;
      popular = Array.isArray(pop) ? pop : [];
      requests = reqs && Array.isArray(reqs.projects) ? reqs.projects : null;
      (Array.isArray(dictionary) ? dictionary : []).forEach((rec) => {
        const name = rec && rec["NSHD Variable Name"];
        if (name && !dict.has(String(name).toLowerCase())) {
          dict.set(String(name).toLowerCase(), {
            name: String(name), label: rec["Variable Label"] || "",
            topic: cleanTopic(rec["Topic"]), years: yearTokens(rec["Year of collection"]),
          });
        }
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
