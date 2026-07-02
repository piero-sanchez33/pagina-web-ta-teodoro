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

function loadImageAsDataUrl(src) {
  return new Promise(resolve => {
    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);

      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };

    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function addPdfText(doc, text, x, y, options = {}) {
  const {
    size = 10,
    weight = "normal",
    color = [37, 21, 39],
    maxWidth = 80
  } = options;

  doc.setFont("helvetica", weight);
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.text(String(text || ""), x, y, { maxWidth });
}

function addPdfCard(doc, x, y, width, height, title, lines) {
  doc.setFillColor(255, 246, 251);
  doc.setDrawColor(245, 193, 222);
  doc.roundedRect(x, y, width, height, 4, 4, "FD");

  addPdfText(doc, title, x + 5, y + 8, {
    size: 9,
    weight: "bold",
    color: [239, 47, 152],
    maxWidth: width - 10
  });

  lines.forEach((line, index) => {
    addPdfText(doc, line, x + 5, y + 17 + index * 6, {
      size: 9,
      color: [65, 44, 69],
      maxWidth: width - 10
    });
  });
}

function addPdfFooter(doc, pageNumber, pageCount) {
  doc.setDrawColor(245, 193, 222);
  doc.line(14, 282, 196, 282);

  addPdfText(doc, `GOODISH | ${BUSINESS_WHATSAPP_LABEL} | ${BUSINESS_EMAIL}`, 14, 288, {
    size: 8,
    color: [118, 98, 120],
    maxWidth: 135
  });

  addPdfText(doc, `Pagina ${pageNumber} de ${pageCount}`, 170, 288, {
    size: 8,
    color: [118, 98, 120],
    maxWidth: 30
  });
}

async function addPdfHeader(doc, order) {
  const logoDataUrl = await loadImageAsDataUrl("images/logo.png");

  doc.setFillColor(255, 244, 251);
  doc.rect(0, 0, 210, 42, "F");
  doc.setFillColor(239, 47, 152);
  doc.rect(0, 0, 210, 8, "F");

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "JPEG", 14, 13, 22, 22);
  } else {
    doc.setFillColor(239, 47, 152);
    doc.circle(25, 24, 11, "F");
  }

  addPdfText(doc, "GOODISH", 42, 23, {
    size: 22,
    weight: "bold",
    color: [239, 47, 152],
    maxWidth: 70
  });

  addPdfText(doc, "Comprobante de pedido", 42, 31, {
    size: 9,
    color: [118, 98, 120],
    maxWidth: 70
  });

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(245, 193, 222);
  doc.roundedRect(128, 13, 68, 22, 4, 4, "FD");

  addPdfText(doc, "Codigo de pedido", 133, 21, {
    size: 8,
    weight: "bold",
    color: [118, 98, 120],
    maxWidth: 58
  });

  addPdfText(doc, order.code || order.id || "GOODISH", 133, 29, {
    size: 10,
    weight: "bold",
    color: [37, 21, 39],
    maxWidth: 58
  });
}

async function generatePdf(order) {
  const jsPDF = window.jspdf?.jsPDF;

  if (!jsPDF) {
    window.print();
    return;
  }

  const doc = new jsPDF();
  await addPdfHeader(doc, order);

  addPdfText(doc, "Pedido creado correctamente", 14, 54, {
    size: 16,
    weight: "bold",
    color: [37, 21, 39],
    maxWidth: 95
  });

  addPdfText(doc, "Tu pedido fue registrado y queda pendiente de validacion de pago o coordinacion de entrega.", 14, 63, {
    size: 9,
    color: [118, 98, 120],
    maxWidth: 112
  });

  doc.setFillColor(37, 21, 39);
  doc.roundedRect(142, 50, 54, 18, 4, 4, "F");
  addPdfText(doc, order.paymentStatus || "PENDIENTE", 148, 61, {
    size: 10,
    weight: "bold",
    color: [255, 255, 255],
    maxWidth: 42
  });

  addPdfCard(doc, 14, 78, 88, 40, "Cliente", [
    order.customer?.name || "Cliente GOODISH",
    order.customer?.email || "Correo no registrado",
    `Celular: ${order.customer?.phone || "No registrado"}`
  ]);

  addPdfCard(doc, 108, 78, 88, 40, "Entrega", [
    order.customer?.district || "Distrito no registrado",
    order.customer?.address || "Direccion no registrada",
    order.customer?.reference || "Sin referencia"
  ]);

  addPdfCard(doc, 14, 124, 88, 30, "Pago", [
    `Metodo: ${order.paymentMethod || "Por confirmar"}`,
    `Fecha: ${formatDate(order.createdAt)}`
  ]);

  addPdfCard(doc, 108, 124, 88, 30, "Contacto GOODISH", [
    `WhatsApp: ${BUSINESS_WHATSAPP_LABEL}`,
    BUSINESS_EMAIL
  ]);

  let y = 169;
  addPdfText(doc, "Detalle de productos", 14, y, {
    size: 13,
    weight: "bold",
    color: [37, 21, 39],
    maxWidth: 80
  });

  y += 8;
  doc.setFillColor(239, 47, 152);
  doc.roundedRect(14, y, 182, 10, 3, 3, "F");
  addPdfText(doc, "Producto", 18, y + 7, { size: 8, weight: "bold", color: [255, 255, 255], maxWidth: 72 });
  addPdfText(doc, "Cant.", 112, y + 7, { size: 8, weight: "bold", color: [255, 255, 255], maxWidth: 18 });
  addPdfText(doc, "P. Unit.", 132, y + 7, { size: 8, weight: "bold", color: [255, 255, 255], maxWidth: 24 });
  addPdfText(doc, "Subtotal", 164, y + 7, { size: 8, weight: "bold", color: [255, 255, 255], maxWidth: 26 });
  y += 14;

  const items = Array.isArray(order.items) ? order.items : [];
  for (const item of items) {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    const subtotal = quantity * price;
    const name = item.name || "Producto GOODISH";

    if (y > 252) {
      doc.addPage();
      await addPdfHeader(doc, order);
      y = 56;
    }

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(245, 222, 236);
    doc.roundedRect(14, y, 182, 24, 3, 3, "FD");

    const imageDataUrl = await loadImageAsDataUrl(item.image || "images/logo.png");
    if (imageDataUrl) {
      doc.addImage(imageDataUrl, "JPEG", 18, y + 3, 18, 18);
    }

    addPdfText(doc, name, 40, y + 8, {
      size: 9,
      weight: "bold",
      color: [37, 21, 39],
      maxWidth: 64
    });

    addPdfText(doc, `${item.category || "GOODISH"} | ${item.size || "Talla unica"}`, 40, y + 15, {
      size: 8,
      color: [118, 98, 120],
      maxWidth: 64
    });

    addPdfText(doc, quantity, 114, y + 13, { size: 9, weight: "bold", maxWidth: 16 });
    addPdfText(doc, formatPrice(price), 132, y + 13, { size: 9, maxWidth: 26 });
    addPdfText(doc, formatPrice(subtotal), 164, y + 13, {
      size: 9,
      weight: "bold",
      color: [239, 47, 152],
      maxWidth: 28
    });

    y += 29;
  }

  if (y > 236) {
    doc.addPage();
    await addPdfHeader(doc, order);
    y = 56;
  }

  doc.setFillColor(255, 246, 251);
  doc.setDrawColor(245, 193, 222);
  doc.roundedRect(116, y, 80, 36, 4, 4, "FD");

  addPdfText(doc, `Productos: ${order.totalItems || 0}`, 122, y + 9, { size: 9, color: [65, 44, 69], maxWidth: 62 });
  addPdfText(doc, `Subtotal: ${formatPrice(order.subtotal)}`, 122, y + 17, { size: 9, color: [65, 44, 69], maxWidth: 62 });
  addPdfText(doc, "Total", 122, y + 28, { size: 10, weight: "bold", color: [37, 21, 39], maxWidth: 20 });
  addPdfText(doc, formatPrice(order.total || order.subtotal), 150, y + 28, {
    size: 14,
    weight: "bold",
    color: [239, 47, 152],
    maxWidth: 42
  });

  addPdfText(doc, "Siguiente paso", 14, y + 8, {
    size: 11,
    weight: "bold",
    color: [37, 21, 39],
    maxWidth: 70
  });

  addPdfText(doc, "Envia tu comprobante por WhatsApp indicando tu codigo de pedido. GOODISH validara el pago y coordinara la entrega.", 14, y + 17, {
    size: 9,
    color: [118, 98, 120],
    maxWidth: 84
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    addPdfFooter(doc, page, pageCount);
  }

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
    downloadPdfBtn.addEventListener("click", async () => {
      downloadPdfBtn.disabled = true;
      downloadPdfBtn.textContent = "Generando PDF...";

      await generatePdf(order);

      downloadPdfBtn.disabled = false;
      downloadPdfBtn.textContent = "Descargar PDF";
    });
  }

  if (window.updateNavbarCartCount) {
    window.updateNavbarCartCount();
  }
});
