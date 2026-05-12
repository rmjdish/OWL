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

  // ⭐ Pulse animation on count
  const badge = document.getElementById("basketCount");
  if (badge) {
    badge.classList.add("added");
    setTimeout(() => badge.classList.remove("added"), 400);
  }

  // ⭐ Glow pulse on basket icon
  const basketTop = document.getElementById("basketTop");
  if (basketTop) {
    basketTop.classList.add("basket-glow-pulse");
    setTimeout(() => basketTop.classList.remove("basket-glow-pulse"), 600);
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

document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.getElementById("basketWrapper");
  const basket = document.getElementById("basketTop");
  const dropdown = document.getElementById("basketDropdown");

  if (!wrapper || !basket || !dropdown) return;

  // Move basket icon next to search bar
  let searchBox = document.querySelector(".search");
  if (!searchBox) {
    const searchInput = document.querySelector("input[type='search']");
    if (searchInput) searchBox = searchInput.parentElement;
  }

  if (searchBox) {
    wrapper.style.display = "inline-block";
    searchBox.insertAdjacentElement("afterend", wrapper);
  }

  updateBasketCountUI();

  // ⭐ Dropdown preview on hover (wrapper, not icon)
  wrapper.addEventListener("mouseenter", () => {
    const items = loadBasket();
    const lastFive = items.slice(-5).reverse(); // last 5 added

    if (lastFive.length === 0) {
      dropdown.style.display = "none";
      return;
    }

    dropdown.innerHTML = `
      <div class="preview-header">Last 5 variables added were:</div>
      ${lastFive
        .map(i => `
          <div class="basket-preview-item">
            <a href="https://rmjdish.github.io/OWL/docs/variable_metadata/${i.varName}"
               target="_blank"
               class="field-link">
               ${i.varName}
            </a>
          </div>
        `)
        .join("")}
      <div class="view-full" onclick="window.location='/OWL/docs/baskets/basket.html'">
        View full basket →
      </div>
    `;

    dropdown.style.display = "block";
  });

  wrapper.addEventListener("mouseleave", () => {
    dropdown.style.display = "none";
  });

  basket.addEventListener("click", () => {
    window.location = "/OWL/docs/baskets/basket.html";
  });
});