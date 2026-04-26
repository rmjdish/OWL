const BASKET_KEY = "nshd_variable_basket";

function loadBasket() {
  try {
    return JSON.parse(localStorage.getItem(BASKET_KEY)) || [];
  } catch {
    return [];
  }
}

function updateBasketCountUI() {
  const basket = loadBasket();
  const elMain = document.getElementById("basketCount");
  if (elMain) elMain.textContent = basket.length;
}

document.addEventListener("DOMContentLoaded", () => {
  const basket = document.getElementById("basketTop");
  if (!basket) return;

  // Find the main Just‑the‑Docs search bar
  let searchBox = document.querySelector(".search");
  if (!searchBox) {
    const searchInput = document.querySelector("input[type='search']");
    if (searchInput) searchBox = searchInput.parentElement;
  }

  if (searchBox) {
    basket.style.display = "flex";
    searchBox.insertAdjacentElement("afterend", basket);
  }

  updateBasketCountUI();

  basket.addEventListener("click", () => {
    window.location = "/OWL/docs/baskets/"; // correct URL
  });
});