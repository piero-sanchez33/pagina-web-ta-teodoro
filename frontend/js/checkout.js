// frontend/js/checkout.js

const CART_KEY = "goodish_cart";
const ORDERS_KEY = "goodish_orders";
const CURRENT_ORDER_KEY = "goodish_current_order";

document.addEventListener("DOMContentLoaded", () => {
  const checkoutForm = document.getElementById("checkoutForm");
  const checkoutItems = document.getElementById("checkoutItems");
  const checkoutTotalItems = document.getElementById("checkoutTotalItems");
  const checkoutSubtotal = document.getElementById("checkoutSubtotal");
  const checkoutTotal = document.getElementById("checkoutTotal");
  const createOrderBtn = document.getElementById("createOrderBtn");

  const checkoutToast = document.getElementById("checkoutToast");
  const checkoutUserName = document.getElementById("checkoutUserName");
  const checkoutUserEmail = document.getElementById("checkoutUserEmail");
  const checkoutToastTitle = document.getElementById("checkoutToastTitle");
  const checkoutToastText = document.getElementById("checkoutToastText");

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  }

  function getOrders() {
    try {
      return JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveOrders(orders) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
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

  function showToast(title, text) {
    if (!checkoutToast || !checkoutToastTitle || !checkoutToastText) return;

    checkoutToastTitle.textContent = title;
    checkoutToastText.textContent = text;

    checkoutToast.classList.add("show");

    setTimeout(() => {
      checkoutToast.classList.remove("show");
    }, 2800);
  }

  function generateOrderCode() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);

    return `GOODISH-${year}${month}${day}-${random}`;
  }

  function renderCheckoutSummary() {
    const cart = getCart();

    checkoutItems.innerHTML = "";

    const totalItems = getCartTotalItems(cart);
    const subtotal = getCartSubtotal(cart);

    checkoutTotalItems.textContent = totalItems;
    checkoutSubtotal.textContent = formatPrice(subtotal);
    checkoutTotal.textContent = formatPrice(subtotal);

    if (window.updateNavbarCartCount) {
      window.updateNavbarCartCount();
    }

    if (cart.length === 0) {
      checkoutItems.innerHTML = `
        <div class="checkout-empty">
          <span>🛍️</span>
          <p>No hay productos en el carrito.</p>
          <a href="products.html" class="back-cart-btn">Ver productos</a>
        </div>
      `;

      createOrderBtn.disabled = true;
      return;
    }

    createOrderBtn.disabled = false;

    cart.forEach(item => {
      const checkoutItem = document.createElement("article");
      checkoutItem.className = "checkout-item";

      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const itemSubtotal = price * quantity;

      checkoutItem.innerHTML = `
        <img src="${item.image || "images/logo.png"}" alt="${item.name || "Producto GOODISH"}">

        <div>
          <h3>${item.name || "Producto GOODISH"}</h3>
          <p>
            ${item.size || "Talla única"} · ${item.category || "GOODISH"} · Cantidad: ${quantity}
          </p>
          <strong>${formatPrice(itemSubtotal)}</strong>
        </div>
      `;

      checkoutItems.appendChild(checkoutItem);
    });
  }

  function getCurrentUserData() {
  let userData = {
    name: "Cliente GOODISH",
    email: "correo-no-disponible@goodish.pe"
  };

  try {
    const supabaseSession = JSON.parse(localStorage.getItem("sb-auth-token"));

    if (supabaseSession?.user?.email) {
      userData.email = supabaseSession.user.email;
    }

    if (supabaseSession?.user?.user_metadata?.nombre) {
      userData.name = `${supabaseSession.user.user_metadata.nombre || ""} ${supabaseSession.user.user_metadata.apellido || ""}`.trim();
    }
  } catch {}

  const possibleUserKeys = [
    "goodish_user",
    "goodish_current_user",
    "usuario_goodish"
  ];

  possibleUserKeys.forEach(key => {
    try {
      const savedUser = JSON.parse(localStorage.getItem(key));

      if (savedUser?.email || savedUser?.correo) {
        userData.email = savedUser.email || savedUser.correo;
      }

      if (savedUser?.nombre || savedUser?.apellido) {
        userData.name = `${savedUser.nombre || ""} ${savedUser.apellido || ""}`.trim();
      }
    } catch {}
  });

  return userData;
}

function renderCurrentUserBox() {
  const user = getCurrentUserData();

  checkoutUserName.textContent = user.name || "Cliente GOODISH";
  checkoutUserEmail.textContent = user.email || "Correo registrado";

  return user;
}

  function getFormData() {
  const formData = new FormData(checkoutForm);
  const user = getCurrentUserData();

  return {
    customerName: user.name,
    customerEmail: user.email,
    customerPhone: formData.get("customerPhone")?.trim(),
    customerDistrict: formData.get("customerDistrict")?.trim(),
    customerAddress: formData.get("customerAddress")?.trim() || "",
    customerReference: formData.get("customerReference")?.trim() || "",
    paymentMethod: formData.get("paymentMethod")
  };
}

  function validateCheckout(data, cart) {
    if (cart.length === 0) {
      showToast("Carrito vacío", "Agrega productos antes de crear un pedido.");
      return false;
    }

    if (!data.customerPhone) {
      showToast("Falta celular", "Escribe tu número de celular o WhatsApp.");
      return false;
    }

    if (!data.customerDistrict) {
      showToast("Falta distrito", "Escribe el distrito de entrega.");
      return false;
    }

    if (!data.customerAddress) {
      showToast("Falta dirección", "Escribe la dirección de entrega.");
      return false;
    }

    if (!data.paymentMethod) {
      showToast("Falta método de pago", "Elige Yape, Plin, transferencia o contraentrega.");
      return false;
    }

    return true;
  }

  function createOrder(data, cart) {
    const subtotal = getCartSubtotal(cart);
    const totalItems = getCartTotalItems(cart);
    const orderCode = generateOrderCode();

    const order = {
      id: orderCode,
      code: orderCode,
      createdAt: new Date().toISOString(),
      status: "PENDIENTE_PAGO",
      paymentStatus: "PENDIENTE",
      paymentMethod: data.paymentMethod,
      customer: {
        name: data.customerName,
        email: data.customerEmail,
        phone: data.customerPhone,
        district: data.customerDistrict,
        address: data.customerAddress,
        reference: data.customerReference
      },
      items: cart,
      totalItems,
      subtotal,
      delivery: null,
      total: subtotal
    };

    const orders = getOrders();
    orders.unshift(order);

    saveOrders(orders);
    localStorage.setItem(CURRENT_ORDER_KEY, JSON.stringify(order));
    localStorage.removeItem(CART_KEY);

    if (window.updateNavbarCartCount) {
      window.updateNavbarCartCount();
    }

    return order;
  }

  checkoutForm.addEventListener("submit", event => {
    event.preventDefault();

    const cart = getCart();
    const data = getFormData();

    const isValid = validateCheckout(data, cart);

    if (!isValid) return;

    createOrderBtn.disabled = true;
    createOrderBtn.textContent = "Creando pedido...";

    const order = createOrder(data, cart);

    showToast("Pedido creado", `Tu código es ${order.code}`);

    setTimeout(() => {
      window.location.href = `order-success.html?order=${encodeURIComponent(order.code)}`;
    }, 900);
  });

  renderCurrentUserBox();
  renderCheckoutSummary();
});