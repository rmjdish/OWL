/**
 * jargon-terms.js
 * ================
 * Single source of truth for the Cohort Study Jargon glossary.
 *
 * Loaded via a normal <script> tag BEFORE getting-started.js and
 * jargon-linker.js on every page (see footer include instructions).
 * Exposes window.NSHD_JARGON_TERMS — both the glossary page and the
 * sitewide auto-linker read from this one array, so a term only ever
 * needs to be added/edited in one place.
 *
 * ── IMPORTANT ────────────────────────────────────────────────────────
 * This file currently contains only the terms already confirmed in
 * getting-started.js (Sweep, Cohort, Birth cohort study, Variable name /
 * variable label, Derived variable, Attrition) as a starting seed.
 * Paste the REST of your existing glossary entries from
 * getting-started.js into the `terms` array below, in the same
 * { term, cat, icon, def } shape — the `slug` field is auto-generated
 * at the bottom of this file so you don't need to write it by hand.
 * ────────────────────────────────────────────────────────────────────
 */

(function () {

  const terms = [
    {
      term: "Sweep",
      cat: "Study design",
      icon: "ti-repeat",
      def: "A single round of data collection from study members at a particular age or year. For example, the 1989 sweep collected data when study members were 43. The NSHD has had 36 sweeps spanning birth to age 76\u201377, each with its own questionnaire and set of variables."
    },
    {
      term: "Cohort",
      cat: "Study design",
      icon: "ti-users",
      def: "The group of individuals followed by the study, in this case everyone born in England, Scotland, and Wales during one week of March 1946. A birth cohort study follows the same people from birth, distinguishing it from studies that recruit at a later age."
    },
    {
      term: "Birth cohort study",
      cat: "Study design",
      icon: "ti-baby-carriage",
      def: "A study design that follows the same group of people from birth onward, rather than recruiting participants at a later age or following different people at each time point."
    },
    {
      term: "Variable name / variable label",
      cat: "Data structure",
      icon: "ti-tag",
      def: "The variable name is the short, coded identifier used in the dataset, e.g. WIC82, usually combining an abbreviation with the sweep year. The variable label is the plain-English description of what the variable measures."
    },
    {
      term: "Derived variable",
      cat: "Data structure",
      icon: "ti-calculator",
      def: "A variable calculated from one or more raw measurements rather than collected directly, for example Body Mass Index derived from separately measured height and weight, or a summary score combining several questionnaire items."
    },
    {
      term: "Attrition",
      cat: "Study design",
      icon: "ti-trending-down",
      def: "The loss of study members from the cohort over time, whether through death, withdrawal, or loss of contact. Attrition is common in long-running studies and is one reason sample sizes shrink in later sweeps."
    },

    // ── PASTE THE REMAINING TERMS FROM getting-started.js HERE ──────────
    // e.g. Wave, Study member, Field ID, Instance, Truly Longitudinal,
    // Value labels, Topic / Subtopic, Sensitive variable, etc.
    // Same shape: { term, cat, icon, def }
  ];

  // Slugify each term once, up front, so both consumers use an identical
  // anchor id (e.g. "Variable name / variable label" -> "variable-name-variable-label")
  function slugify(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  terms.forEach(t => { t.slug = slugify(t.term); });

  window.NSHD_JARGON_TERMS = terms;

})();