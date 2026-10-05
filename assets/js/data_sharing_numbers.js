/* data_sharing_numbers.js
 * Data Sharing in Numbers page: a dashboard of data sharing figures from 2021 onwards.
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
  const days = (n) => (isNum(n) ? (Number.isInteger(n) ? nf.format(n) : Number(n).toFixed(1)) + (n === 1 ? " day" : " days") : "–");
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
    const key = String(sel);
    if (requestStatsCache[key]) return requestStatsCache[key];
    const topics = new Map();
    const collection = new Map();
    const notInDictionary = new Set();
    const add = (map, name, pid, variable) => {
      if (!map.has(name)) map.set(name, { projects: new Set(), variables: new Set() });
      const entry = map.get(name);
      entry.projects.add(pid);
      entry.variables.add(variable);
    };
    requests.forEach((p) => {
      const vars = new Set();
      if (sel === "all") Object.keys(p.by_year).forEach((y) => p.by_year[y].forEach((v) => vars.add(v)));
      else (p.by_year[key] || []).forEach((v) => vars.add(v));
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

  // The approval process changed just before this year (set in the YAML, passed in metrics.json)
  const changeYear = () => (M && M.process_change_year) || 2023;

  // A dagger marks time figures the process change affects: "All years", or a year from the change onwards
  const dagger = () => (sel === "all" || sel >= changeYear() ? " †" : "");

  function processNote() {
    return '<p class="dsn-note">† The data sharing process changed just before ' + changeYear() +
      ", allowing a quicker turnaround, so times from " + changeYear() + " onwards are not directly comparable with earlier years. " +
      "The process will be explained in more detail later.</p>";
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
    const notInJay = sel === "all" ? sum(apps, (a) => a.not_in_jay) : (byYear(apps, sel) || {}).not_in_jay;
    const notInJayNote = notInJay
      ? " " + num(notInJay) + (notInJay === 1 ? " approved application is" : " approved applications are") +
        " not in Jay yet (no basket built). " + (notInJay === 1 ? "It counts" : "They count") + " in the applications and approval figures, but have no institution, country or data."
      : "";
    return '<div class="dsn-filter"><span class="dsn-filter-label">Show figures for</span>' + chips + "</div>" +
      '<div class="dsn-tiles">' +
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

  function trendColumns(values, caption, format, marked) {
    return columnChart(M.years.map((y) => {
      const v = values(y);
      return { label: String(y) + (marked && y >= changeYear() ? "†" : ""), value: isNum(v) ? v : 0,
        text: isNum(v) ? format(v) : "–", selected: sel !== "all" && y === sel };
    }), caption);
  }

  // Baskets built (Jay datasets) and their turnaround (the baskets matched to a Planner request)
  function basketBlock() {
    const S = M.basket_stats;
    const B = M.basket_turnaround;
    const heading = "<h3>Baskets and data turnaround</h3>";
    if (!S || !S.available) return heading + '<p class="dsn-note">Basket figures are not available right now.</p>';
    const per = S.period;
    const tot = S.totals;
    const hasPlanner = !!S.planner_available;
    const row = sel === "all" ? S.overall : byYear(S.by_year, sel) || {};
    const periodNote = '<p class="dsn-note"><strong>Periods.</strong> Baskets built are counted from ' + per.baskets_from +
      " using the Jay datasets, by the year the data was sent. " +
      (hasPlanner
        ? "Turnaround is the time from a basket request coming in to the request being completed. The request dates come from Planner, which started in 2022 (the first request is " +
          esc(formatDate(per.turnaround_from)) + "), so turnaround only covers baskets that were requested through Planner: it is available from then on, and for fewer baskets than are built."
        : "Turnaround is not available because there is no Planner export.") + "</p>";

    let tiles = tile("Baskets built", num(row.built), sel === "all" ? per.baskets_from + " to " + per.baskets_to : "in " + sel) +
      tile("Projects with baskets", num(row.projects));
    if (hasPlanner) {
      tiles += tile("Baskets requested through Planner", num(row.matched), pct(row.percent_matched) + " of those built") +
        tile("Median turnaround", days(row.median_days), "across " + num(row.in_turnaround) + " baskets") +
        tile("Turned around on the same day", pct(row.same_day_percent)) +
        S.thresholds.map((n) => tile("Within " + n + " days", pct(row["percent_within_" + n]), num(row["within_" + n]) + " of " + num(row.in_turnaround))).join("");
    }
    if (sel === "all" && S.per_project && isNum(S.per_project.median_baskets_per_project)) {
      tiles += tile("Median baskets per project", num(S.per_project.median_baskets_per_project), "the most is " + num(S.per_project.max_baskets_per_project));
    }
    const noTurn = hasPlanner && sel !== "all" && !row.in_turnaround
      ? '<p class="dsn-note">None of the baskets built in ' + sel + " has a Planner request with usable dates, so there is no turnaround figure for this year.</p>" : "";

    // when the first basket request came in, compared with the application (Planner requests linked to applications)
    let timing = "";
    if (B && B.available) {
      const tm = sel === "all" ? B.request_timing.overall : byYear(B.request_timing.by_year, sel) || {};
      const total = (tm.with_application || 0) + (tm.days_2_7 || 0) + (tm.days_8_30 || 0) + (tm.over_30 || 0);
      const bands = [["with_application", "With the application (same or next day)"], ["days_2_7", "2 to 7 days later"],
        ["days_8_30", "8 to 30 days later"], ["over_30", "More than 30 days later"]];
      if (total) {
        timing = '<p class="dsn-sub">When the first basket request came in, after the application (Planner requests)</p>' +
          '<div class="dsn-tiles">' + tile("Median time from application to first basket request", days(tm.median_days_after_application), "across " + num(tm.applications) + " applications") + "</div>" +
          barRows(bands.map((x) => ({ label: x[1], value: tm[x[0]] || 0, text: num(tm[x[0]] || 0) + " (" + pct(((tm[x[0]] || 0) / total) * 100) + ")" })));
      }
    }

    const notBuilt = tot.jay_baskets_dated - tot.matched;
    const lag = S.lag_vs_date_sent || {};
    const notes = '<p class="dsn-note">' +
      (hasPlanner
        ? num(tot.matched) + " of the " + num(tot.jay_baskets_dated) + " baskets built have a basket request in Planner; " + num(notBuilt) +
          " do not (older baskets, or the request did not list the basket id). " +
          (tot.planner_only ? num(tot.planner_only) + " basket ids named in Planner are not in the Jay datasets. " : "") +
          (isNum(lag.median_days) ? "The date Planner shows a request completed is a median of " + days(Math.abs(lag.median_days)) + " from the date the data was sent in Jay (" + pct(lag.percent_within_1_day) + " within a day). " : "")
        : "") +
      (tot.jay_baskets_no_date ? num(tot.jay_baskets_no_date) + " baskets have no date sent, so are not in the yearly counts. " : "") +
      "Each basket counts once; a basket named in more than one request uses the completed request closest to the date it was sent. All times are medians, because a few very slow requests would skew an average.</p>";
    return heading + periodNote + '<div class="dsn-tiles">' + tiles + "</div>" + noTurn + timing + notes;
  }

  function renderService() {
    const ap = rowFor(M.approval_times) || {};
    const rp = rowFor(M.repeat_requests) || {};
    const ths = M.approval_times.thresholds;
    const S = M.basket_stats;

    const approvalTiles = tile("Median time to approve" + dagger(), days(ap.median_days), "across " + num(ap.approved) + " approved") +
      ths.map((n) => tile("Approved within " + n + " days" + dagger(), pct(ap["percent_within_" + n]), num(ap["within_" + n]) + " of " + num(ap.approved))).join("");
    const repeatTiles = tile("Projects that came back for more", pct(rp.percent_returned), num(rp.returned) + " of " + num(rp.projects_with_data)) +
      tile("Median time until they came back", days(rp.median_days_to_return)) +
      tile("Projects with more than one basket", num(rp.with_multiple_baskets));

    return "<h3>Approval</h3><div class=\"dsn-tiles\">" + approvalTiles + "</div>" +
      '<p class="dsn-note">Time to approve runs from the application to the decision. All times are medians.</p>' +
      basketBlock() +
      "<h3>Trends by year</h3>" +
      '<p class="dsn-sub">Median days to approve an application</p>' +
      trendColumns((y) => (byYear(M.approval_times.by_year, y) || {}).median_days, "Median days to approve by year", (v) => String(Math.round(v)), true) + processNote() +
      (S && S.available
        ? '<p class="dsn-sub">Baskets built each year (Jay datasets, from ' + S.period.baskets_from + ")</p>" +
          trendColumns((y) => (byYear(S.by_year, y) || {}).built, "Baskets built by year", (v) => num(v))
        : "") +
      (S && S.planner_available
        ? '<p class="dsn-sub">Median days from basket request to completion (baskets requested through Planner, from ' + String(S.period.turnaround_from).slice(0, 4) + ")</p>" +
          trendColumns((y) => (byYear(S.by_year, y) || {}).median_days, "Median turnaround by year of the basket", (v) => String(Math.round(v)))
        : "") +
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

    let topicsHtml = '<p class="dsn-note">Topic figures need the data dictionary and the variable request file, which are not available right now.</p>';
    let yearsHtml = "";
    let unmatchedNote = "";
    if (requests && dict.size) {
      const st = requestStats();
      topicsHtml = barRows(st.topics.slice(0, 12).map((x) => ({ label: esc(x.name), value: x.projects })));
      yearsHtml = "<h3>Years of data collection</h3><p class=\"dsn-sub\">Projects asking for at least one variable from each year of collection</p>" +
        barRows(st.collection.map((x) => ({ label: esc(x.name), value: x.projects })));
      if (st.notInDictionary) unmatchedNote = '<p class="dsn-note">' + num(st.notInDictionary) + (st.notInDictionary === 1 ? " requested variable is" : " requested variables are") + " not in the data dictionary yet, so are not counted in topics or years of collection.</p>";
    }
    return "<h3>Types of data requested</h3><p class=\"dsn-sub\">Share of applications asking for each type (number of projects in brackets)</p>" + barRows(typeItems) +
      "<h3>Topics</h3><p class=\"dsn-sub\">Projects asking for at least one variable in each topic</p>" + topicsHtml + yearsHtml + unmatchedNote +
      '<p class="dsn-note">Topics and years of collection are counted by the year the data was sent.</p>';
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
    const sizeHtml = '<div class="dsn-tiles">' + tile("Median per project", isNum(vp.median) ? Number(vp.median).toFixed(0) : "–") + tile("Largest request", num(vp.max)) + "</div>" + barRows(bands);

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
      "<li><strong>Approved but not in Jay yet:</strong> an application can be approved before any basket is built, so it is not in Jay. It still counts in the application and approval figures, using its SharePoint request and decision times. It has no institution, country or UK flag, and no data figures.</li>" +
      "<li><strong>Year of application</strong> is when the application was submitted. Most figures use it. Topics, collection years and variables use the year the data was sent.</li>" +
      "<li><strong>Medians:</strong> every time is a median (the middle value), not an average, because a few very slow cases would pull an average up.</li>" +
      "<li><strong>Time to approve</strong> is the number of days from submission to approval. Applications not yet approved are left out.</li>" +
      "<li><strong>Baskets built</strong> are the baskets in the Jay datasets, counted by the year the data was sent, from 2021. A basket counts once.</li>" +
      "<li><strong>Basket turnaround</strong> is the number of days from a basket request coming in to the request being completed. The request dates come from Planner, so it only covers baskets whose id is named in a Planner request: that is from 2022, and fewer baskets than are built. Baskets are matched to Planner by basket id. A basket named in more than one request uses the completed request closest to the date it was sent.</li>" +
      "<li><strong>When the first basket request comes in</strong> uses the Planner requests that can be linked to an application (by its Form ID or share name), and measures from the application.</li>" +
      "<li><strong>Applications with data prepared</strong> are those that have had at least one basket of variables prepared. Recent applications may not have asked for data yet.</li>" +
      "<li><strong>Projects that came back for more</strong> are projects that were sent more data more than " + ((M.repeat_requests && M.repeat_requests.gap_days) || 7) + " days after their first.</li>" +
      "<li><strong>Dates:</strong> where a project is logged in the SharePoint request log, its request and decision times are used for the time to approve. Otherwise the dates held in Jay are used.</li>" +
      "<li><strong>†</strong> The data sharing process changed just before " + changeYear() + ", allowing a quicker turnaround, so times from " + changeYear() + " onwards are not directly comparable with earlier years. The process will be explained in more detail later.</li>" +
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
