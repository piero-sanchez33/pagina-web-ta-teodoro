// frontend/js/checkout.js

const CART_KEY = "goodish_cart";
const ORDERS_KEY = "goodish_orders";
const CURRENT_ORDER_KEY = "goodish_current_order";

const SUPABASE_URL = "https://oqojlcgkmvbxmmwoexih.supabase.co";
const SUPABASE_KEY = "sb_publishable_FJvX6aKfJO-f-SAzx2vu0Q_F4ex4L0T";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", async () => {
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

  let currentUserData = {
    id: null,
    name: "Cliente GOODISH",
    email: "correo-no-disponible@goodish.pe"
  };

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

  async function getCurrentUserData() {
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !authData?.user) {
      showToast("Inicia sesión", "Debes iniciar sesión antes de crear un pedido.");

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);

      return null;
    }

    const user = authData.user;

    let userData = {
      id: user.id,
      name: "Cliente GOODISH",
      email: user.email || "Correo registrado"
    };

    const metaNombre =
      user.user_metadata?.nombre ||
      user.user_metadata?.nombre_cli ||
      user.user_metadata?.name ||
      "";

    const metaApellido =
      user.user_metadata?.apellido ||
      user.user_metadata?.apellido_cli ||
      "";

    const metaFullName = `${metaNombre} ${metaApellido}`.trim();

    if (metaFullName) {
      userData.name = metaFullName;
    }

    const { data: perfil, error: perfilError } = await supabaseClient
      .from("usuarios")
      .select("nombre_cli, apellido_cli, correo_cli")
      .eq("id", user.id)
      .maybeSingle();

    if (!perfilError && perfil) {
      const nombre = perfil.nombre_cli || "";
      const apellido = perfil.apellido_cli || "";
      const fullName = `${nombre} ${apellido}`.trim();

      if (fullName) {
        userData.name = fullName;
      }

      if (perfil.correo_cli) {
        userData.email = perfil.correo_cli;
      }
    }

    return userData;
  }

  async function renderCurrentUserBox() {
    const user = await getCurrentUserData();

    if (!user) return null;

    currentUserData = user;

    if (checkoutUserName) {
      checkoutUserName.textContent = user.name;
    }

    if (checkoutUserEmail) {
      checkoutUserEmail.textContent = user.email;
    }

    return user;
  }

  function renderCheckoutSummary() {
    const cart = getCart();

    console.log("CHECKOUT CART:", cart);

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

  function getFormData() {
    const formData = new FormData(checkoutForm);

    return {
      customerId: currentUserData.id,
      customerName: currentUserData.name,
      customerEmail: currentUserData.email,
      customerPhone: formData.get("customerPhone")?.trim(),
      customerDistrict: formData.get("customerDistrict")?.trim(),
      customerAddress: formData.get("customerAddress")?.trim(),
      customerReference: formData.get("customerReference")?.trim() || "",
      paymentMethod: formData.get("paymentMethod")
    };
  }

  function validateCheckout(data, cart) {
    if (!currentUserData.id) {
      showToast("Sesión requerida", "Inicia sesión para crear tu pedido.");
      return false;
    }

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
      userId: data.customerId,
      status: "PENDIENTE_PAGO",
      paymentStatus: "PENDIENTE",
      paymentMethod: data.paymentMethod,
      customer: {
        id: data.customerId,
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

  await renderCurrentUserBox();
  renderCheckoutSummary();
});