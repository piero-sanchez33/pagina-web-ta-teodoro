// frontend/js/order-success.js

const CURRENT_ORDER_KEY = "goodish_current_order";
const ORDERS_KEY = "goodish_orders";
const BUSINESS_WHATSAPP = "51977890648";
const BUSINESS_WHATSAPP_LABEL = "+51 977 890 648";
const BUSINESS_EMAIL = "goodish.peru@gmail.com";
const API_BASE_URL = localStorage.getItem("goodish_api_base_url") || "https://pagina-web-ta-teodoro.onrender.com";

function getStoredOrder() {
  const params = new URLSearchParams(window.location.search);
  const orderCode = params.get("order");

  try {
    const currentOrder = JSON.parse(localStorage.getItem(CURRENT_ORDER_KEY));

    if (currentOrder && (!orderCode || currentOrder.code === orderCode || currentOrder.id === orderCode)) {
      return currentOrder;
    }
  } catch {
    // Continue with order history fallback.
  }

  try {
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
    return orders.find(order => order.code === orderCode || order.id === orderCode) || null;
  } catch {
    return null;
  }
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

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function buildWhatsAppMessage(order) {
  const syncNote = order.syncStatus === "pending"
    ? "Nota: mi pedido no pudo registrarse en la base y quedo guardado localmente."
    : "El pedido fue generado desde la web.";

  const lines = [
    `Hola GOODISH, acabo de crear mi pedido ${order.code}.`,
    `Cliente: ${order.customer?.name || "Cliente GOODISH"}`,
    `Total: ${formatPrice(order.total || order.subtotal)}`,
    `Metodo de pago: ${order.paymentMethod || "Por confirmar"}`,
    syncNote,
    "Quiero coordinar el pago/entrega."
  ];

  return encodeURIComponent(lines.join("\n"));
}

function renderItems(order) {
  const orderItems = document.getElementById("orderItems");
  if (!orderItems) return;

  const items = Array.isArray(order.items) ? order.items : [];

  if (items.length === 0) {
    orderItems.innerHTML = `
      <div class="info-box full">
        <strong>No hay productos registrados</strong>
        <small>El pedido no tiene items guardados.</small>
      </div>
    `;
    return;
  }

  orderItems.innerHTML = items.map(item => {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    const itemSubtotal = price * quantity;

    return `
      <article class="order-item">
        <img src="${item.image || "images/logo.png"}" alt="${item.name || "Producto GOODISH"}">
        <div>
          <h3>${item.name || "Producto GOODISH"}</h3>
          <p>${item.category || "GOODISH"} · ${item.size || "Talla unica"} · Cantidad: ${quantity}</p>
        </div>
        <strong>${formatPrice(itemSubtotal)}</strong>
      </article>
    `;
  }).join("");
}

function renderOrder(order) {
  const isSynced = order.syncStatus === "synced";
  const isPending = order.syncStatus === "pending";

  setText("orderCodeHero", order.code || order.id || "GOODISH");
  setText("orderDateHero", formatDate(order.createdAt));
  setText("orderStatus", isSynced ? "Registrado en sistema" : "Guardado localmente");
  setText("customerName", order.customer?.name || "Cliente GOODISH");
  setText("customerEmail", order.customer?.email || "correo-no-disponible@goodish.pe");
  setText("customerPhone", order.customer?.phone || "Por confirmar");
  setText("customerDistrict", order.customer?.district || "Distrito no registrado");
  setText("customerAddress", order.customer?.address || "Direccion no registrada");
  setText("customerReference", order.customer?.reference || "Sin referencia adicional");
  setText("totalItems", String(order.totalItems || 0));
  setText("subtotalText", formatPrice(order.subtotal));
  setText("totalText", formatPrice(order.total || order.subtotal));
  setText("paymentMethod", order.paymentMethod || "Por confirmar");
  setText("businessPhoneText", BUSINESS_WHATSAPP_LABEL);

  renderItems(order);
  renderSyncNotice(order);

  const whatsappBtn = document.getElementById("whatsappBtn");
  if (whatsappBtn) {
    whatsappBtn.href = `https://wa.me/${BUSINESS_WHATSAPP}?text=${buildWhatsAppMessage(order)}`;
  }
}

function renderSyncNotice(order) {
  const orderContent = document.getElementById("orderContent");

  if (!orderContent || document.getElementById("syncNotice")) return;

  const isSynced = order.syncStatus === "synced";
  const notice = document.createElement("div");

  notice.id = "syncNotice";
  notice.className = `sync-notice ${isSynced ? "synced" : "pending"}`;

  notice.innerHTML = isSynced
    ? `
      <strong>Pedido registrado en la base de datos</strong>
      <p>La tienda ya podra verlo desde Supabase o desde el futuro panel admin.</p>
    `
    : `
      <strong>Pedido guardado en este dispositivo</strong>
      <p>No se pudo registrar en la base de datos. Envia el codigo por WhatsApp para que la tienda lo confirme manualmente.</p>
      <small>${order.syncMessage || "Sin detalle tecnico disponible."}</small>
    `;

  orderContent.parentNode.insertBefore(notice, orderContent);
}

function renderEmailNotice(status, message) {
  const orderContent = document.getElementById("orderContent");
  let notice = document.getElementById("emailNotice");

  if (!orderContent) return;

  if (!notice) {
    notice = document.createElement("div");
    notice.id = "emailNotice";
    orderContent.parentNode.insertBefore(notice, orderContent);
  }

  notice.className = `email-notice ${status}`;
  notice.innerHTML = `
    <strong>${status === "sent" ? "Correo enviado" : status === "sending" ? "Enviando comprobante por correo" : "Correo no enviado"}</strong>
    <p>${message}</p>
  `;
}

function getEmailSentKey(order) {
  return `goodish_email_sent_${order.code || order.id}`;
}

async function sendOrderEmail(order) {
  const sentKey = getEmailSentKey(order);

  if (localStorage.getItem(sentKey) === "true") {
    renderEmailNotice("sent", "El comprobante ya fue enviado anteriormente.");
    return;
  }

  if (!API_BASE_URL || API_BASE_URL.includes("TU-SERVICIO-RENDER")) {
    renderEmailNotice(
      "error",
      "Falta configurar la URL del backend de Render en order-success.js."
    );
    return;
  }

  try {
    renderEmailNotice("sending", "Estamos enviando el PDF al correo del negocio.");

    const pdfBase64 = await window.GOODISH_PDF.getOrderPdfBase64(order);
    const response = await fetch(`${API_BASE_URL}/api/send-order-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        order,
        pdfBase64
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "El backend no pudo enviar el correo.");
    }

    localStorage.setItem(sentKey, "true");
    renderEmailNotice("sent", "Se envio el PDF al correo del negocio.");
  } catch (error) {
    console.error("No se pudo enviar el correo:", error);
    renderEmailNotice("error", error.message || "No se pudo enviar el correo automaticamente.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const order = getStoredOrder();
  const orderContent = document.getElementById("orderContent");
  const missingOrder = document.getElementById("missingOrder");
  const downloadPdfBtn = document.getElementById("downloadPdfBtn");

  if (!order) {
    if (orderContent) orderContent.hidden = true;
    if (missingOrder) missingOrder.hidden = false;
    return;
  }

  renderOrder(order);
  sendOrderEmail(order);

  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener("click", async () => {
      downloadPdfBtn.disabled = true;
      downloadPdfBtn.textContent = "Generando PDF...";

      await window.GOODISH_PDF.downloadOrderPdf(order);

      downloadPdfBtn.disabled = false;
      downloadPdfBtn.textContent = "Descargar PDF";
    });
  }

  if (window.updateNavbarCartCount) {
    window.updateNavbarCartCount();
  }
});
