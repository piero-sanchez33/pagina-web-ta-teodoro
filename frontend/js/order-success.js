// frontend/js/order-success.js

const CURRENT_ORDER_KEY = "goodish_current_order";
const ORDERS_KEY = "goodish_orders";
const BUSINESS_WHATSAPP = "51999999999";
const BUSINESS_WHATSAPP_LABEL = "+51 999 999 999";
const BUSINESS_EMAIL = "goodish.peru@gmail.com";

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
  const lines = [
    `Hola GOODISH, acabo de crear mi pedido ${order.code}.`,
    `Cliente: ${order.customer?.name || "Cliente GOODISH"}`,
    `Total: ${formatPrice(order.total || order.subtotal)}`,
    `Metodo de pago: ${order.paymentMethod || "Por confirmar"}`,
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
  setText("orderCodeHero", order.code || order.id || "GOODISH");
  setText("orderDateHero", formatDate(order.createdAt));
  setText("orderStatus", order.paymentStatus === "PAGADO" ? "Pagado" : "Pendiente de pago");
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

  const whatsappBtn = document.getElementById("whatsappBtn");
  if (whatsappBtn) {
    whatsappBtn.href = `https://wa.me/${BUSINESS_WHATSAPP}?text=${buildWhatsAppMessage(order)}`;
  }
}

function addPdfHeader(doc, order) {
  doc.setFillColor(239, 47, 152);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("GOODISH", 14, 19);
  doc.setFontSize(10);
  doc.text(`Pedido ${order.code || order.id}`, 132, 13);
  doc.text(formatDate(order.createdAt), 132, 21);
}

function generatePdf(order) {
  const jsPDF = window.jspdf?.jsPDF;

  if (!jsPDF) {
    window.print();
    return;
  }

  const doc = new jsPDF();
  let y = 44;

  addPdfHeader(doc, order);

  doc.setTextColor(37, 21, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Comprobante de pedido", 14, y);

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Estado: ${order.paymentStatus || "PENDIENTE"}`, 14, y);
  doc.text(`Metodo de pago: ${order.paymentMethod || "Por confirmar"}`, 110, y);

  y += 14;
  doc.setFont("helvetica", "bold");
  doc.text("Cliente", 14, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.text(`Nombre: ${order.customer?.name || "Cliente GOODISH"}`, 14, y);
  y += 6;
  doc.text(`Correo: ${order.customer?.email || "No registrado"}`, 14, y);
  y += 6;
  doc.text(`Celular: ${order.customer?.phone || "No registrado"}`, 14, y);
  y += 6;
  doc.text(`Entrega: ${order.customer?.address || "No registrada"}`, 14, y);
  y += 6;
  doc.text(`Distrito: ${order.customer?.district || "No registrado"}`, 14, y);

  y += 14;
  doc.setFont("helvetica", "bold");
  doc.text("Productos", 14, y);
  y += 8;

  const items = Array.isArray(order.items) ? order.items : [];
  items.forEach(item => {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    const subtotal = quantity * price;
    const name = item.name || "Producto GOODISH";

    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.text(name.substring(0, 70), 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text(`Cantidad: ${quantity} | Precio unitario: ${formatPrice(price)} | Subtotal: ${formatPrice(subtotal)}`, 14, y);
    y += 9;
  });

  y += 8;
  doc.setDrawColor(239, 47, 152);
  doc.line(14, y, 196, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Total: ${formatPrice(order.total || order.subtotal)}`, 14, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Contacto GOODISH: WhatsApp ${BUSINESS_WHATSAPP_LABEL} | ${BUSINESS_EMAIL}`, 14, y);
  y += 6;
  doc.text("Envia tu comprobante de pago indicando tu codigo de pedido.", 14, y);

  doc.save(`${order.code || "pedido-goodish"}.pdf`);
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

  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener("click", () => generatePdf(order));
  }

  if (window.updateNavbarCartCount) {
    window.updateNavbarCartCount();
  }
});
