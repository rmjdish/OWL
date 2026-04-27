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

function addToBasket(varName, label) {
  const basket = loadBasket();
  if (!basket.some(item => item.varName === varName)) {
    basket.push({ varName, label });
    saveBasket(basket);
  }

  updateBasketCountUI();

  // ⭐ Pulse animation
  const badge = document.getElementById("basketCount");
  if (badge) {
    badge.classList.add("added");
    setTimeout(() => badge.classList.remove("added"), 400);
  }
}

function removeFromBasket(varName) {
  let basket = loadBasket();
  basket = basket.filter(item => item.varName !== varName);
  saveBasket(basket);

  updateBasketCountUI();

  // ⭐ Shake animation
  const basketTop = document.getElementById("basketTop");
  if (basketTop) {
    basketTop.classList.add("shake");
    setTimeout(() => basketTop.classList.remove("shake"), 400);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const basket = document.getElementById("basketTop");
  const dropdown = document.getElementById("basketDropdown");
  if (!basket || !dropdown) return;

  // Move basket icon next to search bar
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

  // ⭐ Dropdown preview on hover
	const wrapper = document.getElementById("basketWrapper");
	const dropdown = document.getElementById("basketDropdown");

	wrapper.addEventListener("mouseenter", () => {
	  const items = loadBasket();
	  const lastFive = items.slice(-5).reverse();

	  if (lastFive.length === 0) {
		dropdown.style.display = "none";
		return;
	  }

	  dropdown.innerHTML = `
		<div class="preview-header">Last items added were:</div>
		${lastFive
		  .map(i => `<div class="basket-preview-item">${i.varName}</div>`)
		  .join("")}
		<div class="view-full" onclick="window.location='/OWL/docs/baskets/'">
		  View full basket →
		</div>
	  `;

	  dropdown.style.display = "block";
	});

	wrapper.addEventListener("mouseleave", () => {
	  dropdown.style.display = "none";
	});
});