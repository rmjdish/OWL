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
  if (elMain) elMain.textContent = basket.length;
}

function isInBasket(varName) {
  return loadBasket().some(item => item.varName === varName);
}

function addToBasket(varName, label) {
  const basket = loadBasket();
  if (!basket.some(item => item.varName === varName)) {
    basket.push({ varName, label });
    saveBasket(basket);
  }
  updateBasketCountUI();
}

function removeFromBasket(varName) {
  let basket = loadBasket();
  basket = basket.filter(item => item.varName !== varName);
  saveBasket(basket);
  updateBasketCountUI();
}

document.addEventListener("DOMContentLoaded", () => {
  const basket = document.getElementById("basketTop");
  if (!basket) return;

  // Always insert next to the built-in Just-the-Docs search bar
  const searchWrap = document.querySelector(".search-input-wrap");

  if (searchWrap) {
    searchWrap.insertAdjacentElement("afterend", basket);
  } else {
    // Fallback: append to header
    const header = document.querySelector(".site-header");
    if (header) header.appendChild(basket);
  }

  updateBasketCountUI();

  basket.addEventListener("click", () => {
    window.location = "/OWL/docs/baskets/";
  });
});

/* Force basket icon to align with Just-the-Docs header layout */
.site-header #basketTop {
  display: inline-flex !important;
  align-items: center !important;
  background: #f3e5f5 !important;
  padding: 6px 12px !important;
  border-radius: 6px !important;
  font-weight: bold !important;
  color: #4b067a !important;
  cursor: pointer !important;
  font-size: 16px !important;
  line-height: 1 !important;
  white-space: nowrap !important;
  margin-left: 12px !important;
}