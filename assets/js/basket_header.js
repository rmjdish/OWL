// ============================================================
// GLOBAL basket logic — loads on ALL pages
// ============================================================
const BASKET_KEY = "nshd_variable_basket";

function loadBasket() {
  try {
    return JSON.parse(localStorage.getItem(BASKET_KEY)) || [];
  } catch {
    return [];
  }
}

function saveBasket(basket) {
  localStorage.setItem(BASKET_KEY, JSON.stringify(basket));
}

function updateBasketCountUI() {
  const basket = loadBasket();
  const elMain = document.getElementById("basketCount");
  const basketTop = document.getElementById("basketTop");
  if (elMain) elMain.textContent = basket.length;

  // ⭐ Glow when basket is non-empty
  if (basketTop) {
    if (basket.length > 0) {
      basketTop.classList.add("basket-glow");
    } else {
      basketTop.classList.remove("basket-glow");
    }
  }
}

function isInBasket(varName) {
  return loadBasket().some(item => item.varName === varName);
}

// ── Longitudinal sibling lookup ─────────────────────────────────────────────
// Lazily fetches the full dictionary once (any page, first time it's needed),
// groups by Showcase Field ID exactly like the longitudinal page does, and
// keeps only groups with 2+ sweeps. This is the single source of truth for
// "which variables are sweeps of the same longitudinal Field ID" — the
// longitudinal page does NOT duplicate this logic; it just calls addToBasket
// per variable, and expansion happens here.
const DATA_DICTIONARY_URL = "/OWL/assets/data/NSHD_Data_Dictionary_Public.json";
let longitudinalSiblingsPromise = null;

function loadLongitudinalSiblings() {
  if (!longitudinalSiblingsPromise) {
    longitudinalSiblingsPromise = fetch(DATA_DICTIONARY_URL)
      .then(r => r.json())
      .then(data => {
        const groups = {};
        data.forEach(row => {
          const fid = row["Showcase Field ID"];
          const varName = row["NSHD Variable Name"];
          if (!fid || !varName) return;
          if (!groups[fid]) groups[fid] = [];
          groups[fid].push({ varName, label: row["Variable Label"] || "" });
        });
        const map = new Map();
        Object.values(groups).forEach(members => {
          if (members.length < 2) return; // not truly longitudinal
          members.forEach(m => map.set(m.varName, members.filter(x => x.varName !== m.varName)));
        });
        return map;
      })
      .catch(() => new Map());
  }
  return longitudinalSiblingsPromise;
}

// Given a list of variable names being added, returns (via Promise) the
// sibling variables — from the same longitudinal Field ID(s) — that aren't
// already among those names. Exposed globally so baskets.js can use it to
// preview counts before the user confirms an upload.
function expandBasketItemsWithSiblings(items) {
  const varNames = (items || []).map(i => i.varName || i).filter(Boolean);
  return loadLongitudinalSiblings().then(map => {
    const seen = new Set(varNames);
    const result = [];
    varNames.forEach(vn => {
      const siblings = map.get(vn);
      if (!siblings) return;
      siblings.forEach(s => {
        if (!seen.has(s.varName)) {
          seen.add(s.varName);
          result.push(s);
        }
      });
    });
    return result;
  });
}

const AUTO_ADD_SIBLINGS_KEY = "nshd_auto_add_linked_sweeps";

function getAutoAddSiblings() {
  const v = localStorage.getItem(AUTO_ADD_SIBLINGS_KEY);
  return v === null ? true : v === "true"; // default ON
}

function setAutoAddSiblings(val) {
  localStorage.setItem(AUTO_ADD_SIBLINGS_KEY, val ? "true" : "false");
}

// ── Toast shown after siblings get auto-added ───────────────────────────────
function showLinkedSweepsToast(count, varNames) {
  if (!count) return;
  let toast = document.getElementById("linkedSweepsToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "linkedSweepsToast";
    Object.assign(toast.style, {
      position: "fixed", bottom: "20px", right: "20px", zIndex: "999999",
      background: "#E1F5EE", color: "#085041", padding: "10px 14px",
      borderRadius: "6px", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      display: "flex", alignItems: "center", gap: "10px"
    });
    document.body.appendChild(toast);
  }
  toast.innerHTML = "";
  const msg = document.createElement("span");
  msg.textContent = `Also added ${count} related sweep${count === 1 ? "" : "s"} to your basket`;
  const undo = document.createElement("a");
  undo.href = "#";
  undo.textContent = "Undo";
  Object.assign(undo.style, { color: "#085041", textDecoration: "underline" });
  undo.addEventListener("click", e => {
    e.preventDefault();
    batchRemoveFromBasket(varNames);
    toast.style.display = "none";
  });
  toast.appendChild(msg);
  toast.appendChild(undo);
  toast.style.display = "flex";
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => { toast.style.display = "none"; }, 6000);
}

// ── Shared upsert core — used by both addToBasket and batchAddToBasket ─────
// Adds new items, refreshes the label on ones already present. Returns the
// varNames that were genuinely new (for accurate toast counts / new-item UI).
function _upsertBasketItems(items) {
  if (!items || items.length === 0) return [];
  const basket = loadBasket();
  const indexByName = new Map();
  basket.forEach((item, i) => indexByName.set(item.varName, i));
  const addedNames = [];
  items.forEach(({ varName, label }) => {
    if (!varName) return;
    if (indexByName.has(varName)) {
      const i = indexByName.get(varName);
      if (label && basket[i].label !== label) basket[i].label = label;
    } else {
      basket.push({ varName, label });
      indexByName.set(varName, basket.length - 1);
      addedNames.push(varName);
    }
  });
  saveBasket(basket);
  return addedNames;
}

function _pulseBasketUI() {
  updateBasketCountUI();
  const badge = document.getElementById("basketCount");
  if (badge) {
    badge.classList.add("added");
    setTimeout(() => badge.classList.remove("added"), 400);
  }
  const basketTop = document.getElementById("basketTop");
  if (basketTop) {
    basketTop.classList.add("basket-glow-pulse");
    setTimeout(() => basketTop.classList.remove("basket-glow-pulse"), 600);
  }
}

function addToBasket(varName, label, opts) {
  opts = opts || {};
  _upsertBasketItems([{ varName, label }]);
  _pulseBasketUI();

  if (opts.expandSiblings !== false && getAutoAddSiblings()) {
    expandBasketItemsWithSiblings([varName]).then(siblingItems => {
      if (siblingItems.length === 0) return;
      const addedNames = _upsertBasketItems(siblingItems);
      if (addedNames.length > 0) {
        _pulseBasketUI();
        showLinkedSweepsToast(addedNames.length, addedNames);
      }
    });
  }
}

function removeFromBasket(varName) {
  let basket = loadBasket();
  basket = basket.filter(item => item.varName !== varName);
  saveBasket(basket);
  updateBasketCountUI();

  // ⭐ Shake animation on removal
  const basketTop = document.getElementById("basketTop");
  if (basketTop) {
    basketTop.classList.add("shake");
    setTimeout(() => basketTop.classList.remove("shake"), 400);
  }
}

// ── Batch basket operations ─────────────────────────────────────────────────
// For adding/removing many variables at once (e.g. "Add all visible").
// Reads localStorage ONCE, modifies the full array in memory, writes ONCE,
// then updates the UI once. Avoids N reads + N writes + N animations.
// Use these in any "add all" / "remove all" handler instead of looping
// addToBasket() / removeFromBasket().

function batchAddToBasket(items, opts) {
  // items = [{ varName, label }, ...]
  opts = opts || {};
  if (!items || items.length === 0) return [];
  const addedNames = _upsertBasketItems(items);
  _pulseBasketUI();

  if (opts.expandSiblings !== false && getAutoAddSiblings()) {
    const varNames = items.map(i => i.varName).filter(Boolean);
    expandBasketItemsWithSiblings(varNames).then(siblingItems => {
      if (siblingItems.length === 0) return;
      const siblingAdded = _upsertBasketItems(siblingItems);
      if (siblingAdded.length > 0) {
        _pulseBasketUI();
        showLinkedSweepsToast(siblingAdded.length, siblingAdded);
      }
    });
  }

  return addedNames;
}

function batchRemoveFromBasket(varNames) {
  // varNames = ["ht82", "wt82", ...]
  if (!varNames || varNames.length === 0) return;
  const removeSet = new Set(varNames);
  let basket = loadBasket();
  basket = basket.filter(item => !removeSet.has(item.varName));
  saveBasket(basket);
  updateBasketCountUI();

  const basketTop = document.getElementById("basketTop");
  if (basketTop) {
    basketTop.classList.add("shake");
    setTimeout(() => basketTop.classList.remove("shake"), 400);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.getElementById("basketWrapper");
  const basket = document.getElementById("basketTop");
  const dropdown = document.getElementById("basketDropdown");
  if (!wrapper || !basket || !dropdown) return;

  // ── Move basket icon into the site header, next to the OWL title ──────────
  // Inserts into .site-header after .site-title so the basket sits at the
  // same vertical level as the site logo/title and is always visible since
  // the header is sticky/fixed in Just-the-Docs. The dropdown opens
  // downward-right so it stays on screen.
  const siteHeader = document.querySelector(".site-header");
  const siteTitle  = document.querySelector(".site-title");

  if (siteHeader && siteTitle) {
    // Place basket immediately after OWL title
    // marginRight gives the right-edge glow breathing room
    wrapper.style.display = "inline-flex";
    wrapper.style.marginRight = "8px";
    wrapper.classList.add("basket-sidebar-pinned");
    siteTitle.insertAdjacentElement("afterend", wrapper);
  } else if (siteHeader) {
    wrapper.style.display = "inline-flex";
    wrapper.style.marginRight = "8px";
    wrapper.classList.add("basket-sidebar-pinned");
    siteHeader.insertAdjacentElement("beforeend", wrapper);
  } else {
    // Fallback: next to search bar
    let searchBox = document.querySelector(".search");
    if (!searchBox) {
      const searchInput = document.querySelector("input[type='search']");
      if (searchInput) searchBox = searchInput.parentElement;
    }
    if (searchBox) {
      wrapper.style.display = "inline-block";
      searchBox.insertAdjacentElement("afterend", wrapper);
    }
  }

  updateBasketCountUI();

  // ── Auto-add linked sweeps toggle, placed right next to the basket icon ──
  const autoAddToggle = document.createElement("label");
  autoAddToggle.id = "autoAddSiblingsToggle";
  autoAddToggle.title = "When on, adding one sweep of a longitudinal variable also adds its other sweeps.";
  Object.assign(autoAddToggle.style, {
    display: "inline-flex", alignItems: "center", gap: "6px",
    fontSize: "11px", color: "#555", marginRight: "10px", cursor: "pointer", userSelect: "none"
  });
  const autoAddInput = document.createElement("input");
  autoAddInput.type = "checkbox";
  autoAddInput.checked = getAutoAddSiblings();
  autoAddInput.style.cursor = "pointer";
  autoAddInput.addEventListener("change", () => setAutoAddSiblings(autoAddInput.checked));
  const autoAddText = document.createElement("span");
  autoAddText.textContent = "Auto-add linked sweeps";
  autoAddToggle.appendChild(autoAddInput);
  autoAddToggle.appendChild(autoAddText);
  wrapper.insertAdjacentElement("afterend", autoAddToggle);

  // ⭐ Dropdown preview on hover
  // Uses a hide-delay so the dropdown stays open long enough for the
  // user to move the cursor from the basket icon into the dropdown and
  // click links — without a delay, mouseleave fires immediately and
  // hides the dropdown before any click can register.
  let hideTimer = null;

  // ── Move dropdown to <body> so it escapes the header's stacking context ──
  // The sidebar header creates its own stacking context, so any child
  // z-index is capped within it — the nav always wins. Moving the dropdown
  // to document.body lets it sit above everything on the page.
  document.body.appendChild(dropdown);

  function positionDropdown() {
    const rect = wrapper.getBoundingClientRect();
    dropdown.style.position   = "fixed";
    dropdown.style.top        = rect.bottom + "px";
    dropdown.style.right      = (window.innerWidth - rect.right) + "px";
    dropdown.style.left       = "auto";
    dropdown.style.zIndex     = "999999";
    dropdown.style.minWidth   = "240px";
    dropdown.style.background = "#ffffff";
    dropdown.style.border     = "1px solid #ddd";
    dropdown.style.borderRadius = "6px";
    dropdown.style.boxShadow  = "0 4px 12px rgba(0,0,0,0.18)";
  }

  function showDropdown() {
    clearTimeout(hideTimer);
    const items = loadBasket();
    const lastFive = items.slice(-5).reverse();
    if (lastFive.length === 0) {
      dropdown.style.display = "none";
      return;
    }
    dropdown.innerHTML = `
      <div style="background:#ffffff;padding:6px 12px;font-size:12px;font-weight:600;color:#4b067a;border-bottom:1px solid #e0d0f0;">Last 5 variables added:</div>
      ${lastFive.map(i => `
        <div style="background:#ffffff;padding:5px 12px;font-size:12px;">
          <a href="https://rmjdish.github.io/OWL/assets/variable_metadata/${i.varName}"
             target="_blank"
             style="color:#4b067a;text-decoration:underline;">
            ${i.varName}
          </a>
        </div>
      `).join("")}
      <a href="/OWL/docs/baskets/basket.html"
         style="display:block;background:#f3e8ff;padding:7px 12px;font-size:12px;font-weight:500;color:#4b067a;border-top:1px solid #e0d0f0;text-decoration:none;">
        View full basket →
      </a>
    `;
    positionDropdown();
    dropdown.style.display = "block";
  }

  function hideDropdown() {
    hideTimer = setTimeout(() => {
      dropdown.style.display = "none";
    }, 500);
  }

  wrapper.addEventListener("mouseenter", showDropdown);
  wrapper.addEventListener("mouseleave", hideDropdown);

  // Keep dropdown open when cursor moves into it
  dropdown.addEventListener("mouseenter", () => clearTimeout(hideTimer));
  dropdown.addEventListener("mouseleave", hideDropdown);

  basket.addEventListener("click", () => {
    window.location = "/OWL/docs/baskets/basket.html";
  });
});