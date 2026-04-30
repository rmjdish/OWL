/* GLOBAL basket helpers used by ALL pages */
function getBasket() {
    return JSON.parse(localStorage.getItem("basket")) || [];
}

function isInBasket(id) {
    const basket = getBasket();
    return basket.some(item => item.id === id);
}

function addToBasket(id, label) {
    const basket = getBasket();
    basket.push({ id, label });
    localStorage.setItem("basket", JSON.stringify(basket));
}

function removeFromBasket(id) {
    let basket = getBasket();
    basket = basket.filter(item => item.id !== id);
    localStorage.setItem("basket", JSON.stringify(basket));
}