// frontend/js/mis-pedidos.js

const SUPABASE_URL = "https://oqojlcgkmvbxmmwoexih.supabase.co";
const SUPABASE_KEY = "sb_publishable_FJvX6aKfJO-f-SAzx2vu0Q_F4ex4L0T";
const BUSINESS_WHATSAPP = "51977890648";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", async () => {
  const ordersList = document.getElementById("ordersList");
  const ordersEmpty = document.getElementById("ordersEmpty");
  const ordersTotal = document.getElementById("ordersTotal");
  const ordersSubtitle = document.getElementById("ordersSubtitle");

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatPrice(value) {
    return `S/ ${Number(value || 0).toFixed(2)}`;
  }

  function formatDate(value) {
    if (!value) return "Fecha no disponible";

    return new Intl.DateTimeFormat("es-PE", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  }

  function normalizeStatus(status) {
    const value = String(status || "PENDIENTE_PAGO").toUpperCase();

    const labels = {
      PENDIENTE_PAGO: "Pendiente de pago",
      PENDIENTE: "Pendiente",
      PAGADO: "Pagado",
      EN_PREPARACION: "En preparacion",
      ENVIADO: "Enviado",
      ENTREGADO: "Entregado",
      CANCELADO: "Cancelado"
    };

    return {
      value,
      label: labels[value] || value.replaceAll("_", " ").toLowerCase(),
      className: value.toLowerCase()
    };
  }

  function getProfileName(profile, user) {
    const fullName = [
      profile?.nombre_cli || user.user_metadata?.nombre_cli || user.user_metadata?.nombre || user.user_metadata?.name || "",
      profile?.apellido_cli || user.user_metadata?.apellido_cli || user.user_metadata?.apellido || ""
    ].join(" ").trim();

    return fullName || user.email?.split("@")[0] || "Cliente GOODISH";
  }

  function getWhatsAppMessage(order) {
    const lines = [
      `Hola GOODISH, quiero consultar sobre mi pedido ${order.code}.`,
      `Cliente: ${order.customer.name}`,
      `Total: ${formatPrice(order.total)}`,
      "Gracias."
    ];

    return encodeURIComponent(lines.join("\n"));
  }

  function renderError(message) {
    ordersList.innerHTML = `
      <article class="orders-loading">
        <strong>No se pudieron cargar tus pedidos</strong>
        <p>${escapeHtml(message)}</p>
      </article>
    `;

    if (ordersSubtitle) {
      ordersSubtitle.textContent = "Hubo un problema al consultar Supabase.";
    }
  }

  async function getCurrentUser() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data?.user) {
      window.location.href = "login.html";
      return null;
    }

    return data.user;
  }

  async function getProfile(user) {
    const { data } = await supabaseClient
      .from("usuarios")
      .select("nombre_cli, apellido_cli, correo_cli, celular_cli, ciudad_cli")
      .eq("id", user.id)
      .maybeSingle();

    return data || null;
  }

  async function getSales(userId) {
    const { data, error } = await supabaseClient
      .from("venta")
      .select(`
        codigo_ven,
        codigo_pedido,
        fecha_venta,
        creado_en,
        total_pagar,
        estado_venta,
        direccion_entrega,
        distrito_entrega,
        referencia_entrega,
        telefono_contacto,
        codigo_pago,
        codigo_tipo_ent,
        usuario_id
      `)
      .eq("usuario_id", userId)
      .order("creado_en", { ascending: false });

    if (error) throw error;

    return data || [];
  }

  async function getDetails(sales) {
    const saleIds = sales.map(sale => sale.codigo_ven).filter(Boolean);

    if (saleIds.length === 0) return [];

    const { data, error } = await supabaseClient
      .from("detalle_venta")
      .select("codigo_ven, codigo_pre, cantidad, precio_venta_final")
      .in("codigo_ven", saleIds);

    if (error) throw error;

    return data || [];
  }

  async function getProducts(details) {
    const productIds = [...new Set(details.map(detail => detail.codigo_pre).filter(Boolean))];

    if (productIds.length === 0) return new Map();

    const { data, error } = await supabaseClient
      .from("prenda")
      .select("codigo_pre, nombre_pre, descripcion, precio_unitario, imagen_url, talla, estilo, badge")
      .in("codigo_pre", productIds);

    if (error) throw error;

    return new Map((data || []).map(product => [product.codigo_pre, product]));
  }

  async function getPaymentMethods(sales) {
    const paymentIds = [...new Set(sales.map(sale => sale.codigo_pago).filter(Boolean))];

    if (paymentIds.length === 0) return new Map();

    const { data, error } = await supabaseClient
      .from("metodo_pago")
      .select("codigo_pago, descripcion_pago")
      .in("codigo_pago", paymentIds);

    if (error) {
      console.warn("No se pudieron cargar los metodos de pago:", error);
      return new Map();
    }

    return new Map((data || []).map(method => [method.codigo_pago, method.descripcion_pago]));
  }

  function buildOrders(sales, details, productsById, paymentMethods, profile, user) {
    const detailsBySale = details.reduce((map, detail) => {
      const saleDetails = map.get(detail.codigo_ven) || [];
      saleDetails.push(detail);
      map.set(detail.codigo_ven, saleDetails);
      return map;
    }, new Map());

    const customerName = getProfileName(profile, user);
    const customerEmail = profile?.correo_cli || user.email || "Correo no registrado";

    return sales.map(sale => {
      const saleDetails = detailsBySale.get(sale.codigo_ven) || [];
      const items = saleDetails.map(detail => {
        const product = productsById.get(detail.codigo_pre) || {};
        const quantity = Number(detail.cantidad || 0);
        const price = Number(detail.precio_venta_final || product.precio_unitario || 0);

        return {
          id: product.codigo_pre || detail.codigo_pre,
          codigo_pre: product.codigo_pre || detail.codigo_pre,
          name: product.nombre_pre || "Producto GOODISH",
          description: product.descripcion || "Prenda GOODISH",
          price,
          quantity,
          image: product.imagen_url || "images/logo.png",
          size: product.talla || "Talla unica",
          category: product.badge || product.estilo || "GOODISH"
        };
      });

      const subtotal = items.reduce((total, item) => {
        return total + Number(item.price || 0) * Number(item.quantity || 0);
      }, 0);
      const totalItems = items.reduce((total, item) => total + Number(item.quantity || 0), 0);

      return {
        id: sale.codigo_pedido || sale.codigo_ven,
        code: sale.codigo_pedido || `GOODISH-${sale.codigo_ven}`,
        createdAt: sale.creado_en || sale.fecha_venta,
        status: sale.estado_venta || "PENDIENTE_PAGO",
        paymentStatus: sale.estado_venta || "PENDIENTE",
        paymentMethod: paymentMethods.get(sale.codigo_pago) || "Por confirmar",
        customer: {
          name: customerName,
          email: customerEmail,
          phone: sale.telefono_contacto || profile?.celular_cli || "No registrado",
          district: sale.distrito_entrega || profile?.ciudad_cli || "No registrado",
          address: sale.direccion_entrega || "Direccion no registrada",
          reference: sale.referencia_entrega || "Sin referencia"
        },
        items,
        totalItems,
        subtotal: Number(sale.total_pagar || subtotal),
        total: Number(sale.total_pagar || subtotal),
        syncStatus: "synced"
      };
    });
  }

  function renderOrders(orders) {
    ordersTotal.textContent = String(orders.length);

    if (orders.length === 0) {
      ordersList.innerHTML = "";
      ordersEmpty.hidden = false;
      ordersSubtitle.textContent = "Todavia no hay compras registradas para tu cuenta.";
      return;
    }

    ordersEmpty.hidden = true;
    ordersSubtitle.textContent = `${orders.length} pedido${orders.length === 1 ? "" : "s"} encontrado${orders.length === 1 ? "" : "s"}.`;

    ordersList.innerHTML = orders.map((order, index) => {
      const status = normalizeStatus(order.status);
      const previewItems = order.items.slice(0, 4);
      const names = order.items.map(item => item.name).slice(0, 3).join(", ");

      return `
        <article class="orders-card" data-order-index="${index}">
          <div class="orders-card-head">
            <div>
              <h3>${escapeHtml(order.code)}</h3>
              <div class="orders-meta">
                <span>${escapeHtml(formatDate(order.createdAt))}</span>
                <span>${escapeHtml(order.paymentMethod)}</span>
              </div>
            </div>
            <span class="orders-status ${escapeHtml(status.className)}">${escapeHtml(status.label)}</span>
          </div>

          <div class="orders-products-row">
            <div class="orders-products-preview">
              ${previewItems.map(item => `
                <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">
              `).join("")}
              <div class="orders-products-text">
                <strong>${escapeHtml(order.totalItems)} producto${order.totalItems === 1 ? "" : "s"}</strong>
                <span>${escapeHtml(names || "Sin productos registrados")}</span>
              </div>
            </div>

            <div class="orders-total">
              <span>Total</span>
              <strong>${escapeHtml(formatPrice(order.total))}</strong>
            </div>
          </div>

          <div class="orders-card-actions">
            <button type="button" class="order-action secondary" data-action="toggle-detail">Ver detalle</button>
            <button type="button" class="order-action" data-action="download-pdf">Descargar PDF</button>
            <a class="order-action secondary" href="https://wa.me/${BUSINESS_WHATSAPP}?text=${getWhatsAppMessage(order)}" target="_blank" rel="noopener">WhatsApp</a>
          </div>

          <div class="orders-detail">
            ${order.items.map(item => `
              <article class="orders-detail-item">
                <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">
                <div>
                  <h4>${escapeHtml(item.name)}</h4>
                  <p>${escapeHtml(item.category)} / ${escapeHtml(item.size)} / Cantidad: ${escapeHtml(item.quantity)}</p>
                </div>
                <strong>${escapeHtml(formatPrice(Number(item.price || 0) * Number(item.quantity || 0)))}</strong>
              </article>
            `).join("") || `
              <article class="orders-detail-item">
                <div>
                  <h4>No hay productos registrados</h4>
                  <p>Este pedido no tiene detalle disponible.</p>
                </div>
              </article>
            `}
          </div>
        </article>
      `;
    }).join("");

    ordersList.querySelectorAll("[data-action='toggle-detail']").forEach(button => {
      button.addEventListener("click", () => {
        const card = button.closest(".orders-card");
        const isOpen = card.classList.toggle("open");
        button.textContent = isOpen ? "Ocultar detalle" : "Ver detalle";
      });
    });

    ordersList.querySelectorAll("[data-action='download-pdf']").forEach(button => {
      button.addEventListener("click", async () => {
        const card = button.closest(".orders-card");
        const order = orders[Number(card.dataset.orderIndex)];

        button.disabled = true;
        button.textContent = "Generando PDF...";

        try {
          await window.GOODISH_PDF.downloadOrderPdf(order);
        } finally {
          button.disabled = false;
          button.textContent = "Descargar PDF";
        }
      });
    });
  }

  try {
    const user = await getCurrentUser();
    if (!user) return;

    const [profile, sales] = await Promise.all([
      getProfile(user),
      getSales(user.id)
    ]);
    const [details, paymentMethods] = await Promise.all([
      getDetails(sales),
      getPaymentMethods(sales)
    ]);
    const productsById = await getProducts(details);

    const orders = buildOrders(sales, details, productsById, paymentMethods, profile, user);
    renderOrders(orders);
  } catch (error) {
    console.error("No se pudieron cargar los pedidos:", error);
    renderError(error.message || "Error desconocido al leer los pedidos.");
  }
});
