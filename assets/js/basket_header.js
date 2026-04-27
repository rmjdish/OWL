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
    // Fallback: insert at end of navbar (rare cases)
    const navbar = document.querySelector(".navbar");
    if (navbar) navbar.appendChild(basket);
  }

  updateBasketCountUI();

  basket.addEventListener("click", () => {
    window.location = "/OWL/docs/baskets/";
  });
});