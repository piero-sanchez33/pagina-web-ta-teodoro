// frontend/js/checkout.js

const CART_KEY = "goodish_cart";
const ORDERS_KEY = "goodish_orders";
const CURRENT_ORDER_KEY = "goodish_current_order";

const SUPABASE_URL = "https://oqojlcgkmvbxmmwoexih.supabase.co";
const SUPABASE_KEY = "sb_publishable_FJvX6aKfJO-f-SAzx2vu0Q_F4ex4L0T";

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

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

  function saveLocalOrder(order) {
    const orders = getOrders().filter(savedOrder => savedOrder.code !== order.code);

    orders.unshift(order);
    saveOrders(orders);
    localStorage.setItem(CURRENT_ORDER_KEY, JSON.stringify(order));
  }

  function formatPrice(value) {
    return `S/ ${Number(value || 0).toFixed(2)}`;
  }

  function getCartTotalItems(cart) {
    return cart.reduce((total, item) => total + Number(item.quantity || 0), 0);
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
    }, 3000);
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
    if (!supabaseClient) {
      showToast("Conexion no disponible", "No se pudo cargar Supabase. Recarga la pagina.");
      return null;
    }

    const { data: authData, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !authData?.user) {
      showToast("Inicia sesion", "Debes iniciar sesion antes de crear un pedido.");

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
          <span>!</span>
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
            ${item.size || "Talla unica"} - ${item.category || "GOODISH"} - Cantidad: ${quantity}
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
      showToast("Sesion requerida", "Inicia sesion para crear tu pedido.");
      return false;
    }

    if (cart.length === 0) {
      showToast("Carrito vacio", "Agrega productos antes de crear un pedido.");
      return false;
    }

    if (!data.customerPhone) {
      showToast("Falta celular", "Escribe tu numero de celular o WhatsApp.");
      return false;
    }

    if (!data.customerDistrict) {
      showToast("Falta distrito", "Escribe el distrito de entrega.");
      return false;
    }

    if (!data.customerAddress) {
      showToast("Falta direccion", "Escribe la direccion de entrega.");
      return false;
    }

    if (!data.paymentMethod) {
      showToast("Falta metodo de pago", "Elige Yape, Plin, transferencia o contraentrega.");
      return false;
    }

    return true;
  }

  async function findCodeByText(table, codeColumn, textColumn, value) {
    if (!value) return null;

    const { data, error } = await supabaseClient
      .from(table)
      .select(codeColumn)
      .ilike(textColumn, `%${value}%`)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`No se pudo leer ${table}: ${error.message}`);
    }

    return data?.[codeColumn] || null;
  }

  async function getPaymentCode(paymentMethod) {
    const paymentAliases = {
      Yape: ["Yape"],
      Plin: ["Plin"],
      Transferencia: ["Transferencia", "Banco"],
      Contraentrega: ["Contraentrega", "Contra entrega", "Efectivo"]
    };

    const aliases = paymentAliases[paymentMethod] || [paymentMethod];

    for (const alias of aliases) {
      const code = await findCodeByText("metodo_pago", "codigo_pago", "descripcion_pago", alias);

      if (code) return code;
    }

    throw new Error(`No existe el metodo de pago "${paymentMethod}" en Supabase.`);
  }

  async function getDeliveryTypeCode() {
    const aliases = ["delivery", "envio", "entrega", "domicilio"];

    for (const alias of aliases) {
      const code = await findCodeByText("tipo_entrega", "codigo_tipo_ent", "nombre_tipo_ent", alias);

      if (code) return code;
    }

    const { data, error } = await supabaseClient
      .from("tipo_entrega")
      .select("codigo_tipo_ent")
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`No se pudo leer tipo_entrega: ${error.message}`);
    }

    if (!data?.codigo_tipo_ent) {
      throw new Error("No hay tipos de entrega registrados en Supabase.");
    }

    return data.codigo_tipo_ent;
  }

  async function getProductCode(item) {
    const directCode = Number(item.codigo_pre || item.productCode || item.product_code);

    if (Number.isInteger(directCode) && directCode > 0) {
      return directCode;
    }

    const productName = item.name || item.nombre_pre;

    if (!productName) {
      throw new Error("Un producto del carrito no tiene nombre para buscarlo en Supabase.");
    }

    const { data, error } = await supabaseClient
      .from("prenda")
      .select("codigo_pre, nombre_pre")
      .ilike("nombre_pre", `%${productName}%`)
      .eq("activo", true)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`No se pudo buscar "${productName}" en prenda: ${error.message}`);
    }

    if (!data?.codigo_pre) {
      throw new Error(`No encontre "${productName}" en la tabla prenda.`);
    }

    return data.codigo_pre;
  }

  async function getProductStockRecord(item) {
    const directCode = Number(item.codigo_pre || item.productCode || item.product_code);

    let query = supabaseClient
      .from("prenda")
      .select("codigo_pre, nombre_pre, stock_actual")
      .eq("activo", true);

    if (Number.isInteger(directCode) && directCode > 0) {
      query = query.eq("codigo_pre", directCode);
    } else {
      const productName = item.name || item.nombre_pre;

      if (!productName) {
        throw new Error("Un producto del carrito no tiene nombre para validar stock.");
      }

      query = query.ilike("nombre_pre", `%${productName}%`);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) {
      throw new Error(`No se pudo validar stock de "${item.name || "producto"}": ${error.message}`);
    }

    if (!data?.codigo_pre) {
      throw new Error(`No encontre "${item.name || "producto"}" en la tabla prenda.`);
    }

    return data;
  }

  async function validateStockAvailability(cart) {
    if (!supabaseClient) {
      throw new Error("Supabase no esta disponible para validar stock.");
    }

    const checkedItems = [];
    const requestedByProduct = new Map();

    for (const item of cart) {
      const product = await getProductStockRecord(item);
      const quantity = Number(item.quantity || 0);

      if (quantity <= 0) {
        throw new Error(`La cantidad de "${item.name || product.nombre_pre}" no es valida.`);
      }

      const current = requestedByProduct.get(product.codigo_pre) || {
        product,
        quantity: 0,
        names: []
      };

      current.quantity += quantity;
      current.names.push(item.name || product.nombre_pre);
      requestedByProduct.set(product.codigo_pre, current);

      checkedItems.push({
        ...item,
        codigo_pre: product.codigo_pre,
        stock_actual: Number(product.stock_actual || 0)
      });
    }

    const insufficient = Array.from(requestedByProduct.values()).filter(item => {
      return item.quantity > Number(item.product.stock_actual || 0);
    });

    if (insufficient.length > 0) {
      const first = insufficient[0];
      const productName = first.product.nombre_pre || first.names[0] || "Producto";
      const available = Number(first.product.stock_actual || 0);

      throw new Error(`${productName}: pediste ${first.quantity}, pero solo hay ${available} disponibles.`);
    }

    return checkedItems;
  }

  async function syncOrderToSupabase(order) {
    if (!supabaseClient) {
      throw new Error("Supabase no esta disponible.");
    }

    const [codigoPago, codigoTipoEntrega] = await Promise.all([
      getPaymentCode(order.paymentMethod),
      getDeliveryTypeCode()
    ]);

    const detalleItems = [];

    for (const item of order.items) {
      const codigoPre = await getProductCode(item);

      detalleItems.push({
        codigo_pre: codigoPre,
        cantidad: Number(item.quantity || 0),
        precio_venta_final: Number(item.price || 0)
      });
    }

    const ventaPayload = {
      usuario_id: order.userId,
      codigo_pago: codigoPago,
      codigo_tipo_ent: codigoTipoEntrega,
      fecha_venta: order.createdAt,
      fecha_entrega_programada: null,
      total_pagar: order.total,
      codigo_prom: null,
      estado_venta: "pendiente_pago",
      direccion_entrega: order.customer.address,
      distrito_entrega: order.customer.district,
      referencia_entrega: order.customer.reference,
      telefono_contacto: order.customer.phone,
      codigo_pedido: order.code
    };

    const { data: venta, error: ventaError } = await supabaseClient
      .from("venta")
      .insert(ventaPayload)
      .select("codigo_ven, codigo_pedido")
      .single();

    if (ventaError) {
      throw new Error(`No se pudo registrar la venta: ${ventaError.message}`);
    }

    const detallePayload = detalleItems.map(item => ({
      ...item,
      codigo_ven: venta.codigo_ven
    }));

    const { error: detalleError } = await supabaseClient
      .from("detalle_venta")
      .insert(detallePayload);

    if (detalleError) {
      throw new Error(`La venta se creo, pero fallo el detalle: ${detalleError.message}`);
    }

    return {
      codigoVenta: venta.codigo_ven,
      codigoPedido: venta.codigo_pedido
    };
  }

  function createOrder(data, cart) {
    const subtotal = getCartSubtotal(cart);
    const totalItems = getCartTotalItems(cart);
    const orderCode = generateOrderCode();

    return {
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
      total: subtotal,
      syncStatus: "local",
      syncMessage: "Pedido creado localmente."
    };
  }

  checkoutForm.addEventListener("submit", async event => {
    event.preventDefault();

    const cart = getCart();
    const data = getFormData();
    const isValid = validateCheckout(data, cart);

    if (!isValid) return;

    createOrderBtn.disabled = true;
    createOrderBtn.textContent = "Creando pedido...";

    let checkedCart = [];

    try {
      checkedCart = await validateStockAvailability(cart);
    } catch (error) {
      console.error("No se pudo validar stock:", error);

      showToast(
        "Stock no disponible",
        error.message || "No se pudo confirmar el stock de tus productos."
      );

      createOrderBtn.disabled = false;
      createOrderBtn.textContent = "Crear pedido";
      return;
    }

    const order = createOrder(data, checkedCart);

    try {
      const syncResult = await syncOrderToSupabase(order);

      order.syncStatus = "synced";
      order.syncMessage = "Pedido registrado correctamente en la base de datos.";
      order.database = syncResult;

      showToast("Pedido registrado", `Tu codigo es ${order.code}`);
    } catch (error) {
      console.error("No se pudo sincronizar el pedido:", error);

      order.syncStatus = "pending";
      order.syncMessage = error.message || "No se pudo registrar en la base de datos.";

      showToast(
        "Pedido guardado localmente",
        "No se pudo registrar en la base. Envia tu codigo por WhatsApp."
      );
    }

    saveLocalOrder(order);
    localStorage.removeItem(CART_KEY);

    if (window.updateNavbarCartCount) {
      window.updateNavbarCartCount();
    }

    setTimeout(() => {
      window.location.href = `order-success.html?order=${encodeURIComponent(order.code)}`;
    }, 1300);
  });

  renderCheckoutSummary();

  try {
    await renderCurrentUserBox();
  } catch (error) {
    console.error("No se pudo cargar el usuario en checkout:", error);
  }
});
