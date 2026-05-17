// frontend/js/cart.js

const CART_KEY = "goodish_cart";

document.addEventListener("DOMContentLoaded", () => {
  const cartList = document.getElementById("cartList");
  const cartEmpty = document.getElementById("cartEmpty");
  const cartTotalItems = document.getElementById("cartTotalItems");
  const subtotalText = document.getElementById("subtotalText");
  const totalText = document.getElementById("totalText");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const clearCartBtn = document.getElementById("clearCartBtn");

  const cartToast = document.getElementById("cartToast");
  const cartToastTitle = document.getElementById("cartToastTitle");
  const cartToastText = document.getElementById("cartToastText");

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));

    if (window.updateNavbarCartCount) {
      window.updateNavbarCartCount();
    }
  }

  function formatPrice(value) {
    return `S/ ${Number(value || 0).toFixed(2)}`;
  }

  function getCartTotalItems(cart) {
    return cart.reduce((total, item) => {
      return total + Number(item.quantity || 0);
    }, 0);
  }

  function getCartSubtotal(cart) {
    return cart.reduce((total, item) => {
      return total + Number(item.price || 0) * Number(item.quantity || 0);
    }, 0);
  }

  function showCartToast(title, text) {
    if (!cartToast || !cartToastTitle || !cartToastText) return;

    cartToastTitle.textContent = title;
    cartToastText.textContent = text;

    cartToast.classList.add("show");

    setTimeout(() => {
      cartToast.classList.remove("show");
    }, 2600);
  }

  function renderCart() {
    const cart = getCart();

    console.log("CARRITO ACTUAL:", cart);

    cartList.innerHTML = "";

    const totalItems = getCartTotalItems(cart);
    const subtotal = getCartSubtotal(cart);

    cartTotalItems.textContent = totalItems;
    subtotalText.textContent = formatPrice(subtotal);
    totalText.textContent = formatPrice(subtotal);

    checkoutBtn.disabled = cart.length === 0;
    clearCartBtn.style.display = cart.length === 0 ? "none" : "inline-flex";

    if (cart.length === 0) {
      cartEmpty.classList.add("show");
      return;
    }

    cartEmpty.classList.remove("show");

    cart.forEach(item => {
      const cartItem = document.createElement("article");
      cartItem.className = "cart-item";

      cartItem.innerHTML = `
        <img src="${item.image || "images/logo.png"}" alt="${item.name || "Producto GOODISH"}" class="cart-item-img">

        <div class="cart-item-info">
          <h3>${item.name || "Producto GOODISH"}</h3>
          <p>${item.description || "Prenda GOODISH seleccionada para tu outfit."}</p>

          <div class="cart-item-tags">
            <span class="cart-tag">${item.category || "GOODISH"}</span>
            <span class="cart-tag">${item.size || "Talla única"}</span>
          </div>
        </div>

        <div class="cart-item-actions">
          <div class="cart-price">${formatPrice(Number(item.price || 0) * Number(item.quantity || 0))}</div>

          <div class="qty-control">
            <button class="qty-btn" data-action="decrease" data-id="${item.id}">−</button>
            <span class="qty-number">${item.quantity}</span>
            <button class="qty-btn" data-action="increase" data-id="${item.id}">+</button>
          </div>

          <button class="remove-btn" data-action="remove" data-id="${item.id}">
            Eliminar
          </button>
        </div>
      `;

      cartList.appendChild(cartItem);
    });
  }

  function increaseQuantity(productId) {
    const cart = getCart();

    const updatedCart = cart.map(item => {
      if (item.id === productId) {
        return {
          ...item,
          quantity: Number(item.quantity || 0) + 1
        };
      }

      return item;
    });

    saveCart(updatedCart);
    renderCart();
  }

  function decreaseQuantity(productId) {
    const cart = getCart();

    const updatedCart = cart
      .map(item => {
        if (item.id === productId) {
          return {
            ...item,
            quantity: Number(item.quantity || 0) - 1
          };
        }

        return item;
      })
      .filter(item => Number(item.quantity || 0) > 0);

    saveCart(updatedCart);
    renderCart();
  }

  function removeItem(productId) {
    const cart = getCart();
    const updatedCart = cart.filter(item => item.id !== productId);

    saveCart(updatedCart);
    renderCart();
    showCartToast("Producto eliminado", "La prenda fue retirada del carrito.");
  }

  function clearCart() {
    localStorage.removeItem(CART_KEY);

    if (window.updateNavbarCartCount) {
      window.updateNavbarCartCount();
    }

    renderCart();
    showCartToast("Carrito vacío", "Se eliminaron todas las prendas.");
  }

  cartList.addEventListener("click", event => {
    const button = event.target.closest("button");

    if (!button) return;

    const action = button.dataset.action;
    const productId = button.dataset.id;

    if (action === "increase") {
      increaseQuantity(productId);
    }

    if (action === "decrease") {
      decreaseQuantity(productId);
    }

    if (action === "remove") {
      removeItem(productId);
    }
  });

  clearCartBtn.addEventListener("click", clearCart);

  checkoutBtn.addEventListener("click", () => {
    const cart = getCart();

    if (cart.length === 0) {
      showCartToast("Carrito vacío", "Agrega una prenda antes de pagar.");
      return;
    }

    window.location.href = "checkout.html";
  });

  renderCart();

  if (window.updateNavbarCartCount) {
    window.updateNavbarCartCount();
  }
});