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

      resolve(canvas.toDataURL("image/png"));
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

function drawSectionTitle(doc, title, x, y, width = 84) {
  addPdfText(doc, title.toUpperCase(), x, y, {
    size: 8,
    weight: "bold",
    color: [239, 47, 152],
    maxWidth: width
  });
  doc.setDrawColor(239, 47, 152);
  doc.setLineWidth(0.4);
  doc.line(x, y + 2, x + width, y + 2);
}

function drawInfoBlock(doc, title, rows, x, y, width) {
  drawSectionTitle(doc, title, x, y, width);

  let rowY = y + 10;
  rows.forEach(row => {
    addPdfText(doc, row.label, x, rowY, {
      size: 8,
      weight: "bold",
      color: [87, 74, 91],
      maxWidth: 26
    });

    addPdfText(doc, row.value || "-", x + 30, rowY, {
      size: 8.5,
      color: [31, 22, 34],
      maxWidth: width - 32
    });

    rowY += row.gap || 6;
  });
}

function drawPageFooter(doc, pageNumber, pageCount) {
  doc.setDrawColor(226, 214, 224);
  doc.setLineWidth(0.25);
  doc.line(14, 282, 196, 282);

  addPdfText(doc, "GOODISH", 14, 288, {
    size: 8,
    weight: "bold",
    color: [239, 47, 152],
    maxWidth: 28
  });

  addPdfText(doc, `${BUSINESS_WHATSAPP_LABEL} | ${BUSINESS_EMAIL}`, 34, 288, {
    size: 8,
    color: [99, 86, 102],
    maxWidth: 108
  });

  addPdfText(doc, `Pagina ${pageNumber} de ${pageCount}`, 171, 288, {
    size: 8,
    color: [99, 86, 102],
    maxWidth: 28
  });
}

async function drawDocumentHeader(doc, order, options = {}) {
  const includeImages = options.includeImages !== false;
  const logoDataUrl = includeImages ? await loadImageAsDataUrl("images/logo.png") : null;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");

  doc.setFillColor(239, 47, 152);
  doc.rect(0, 0, 210, 4, "F");

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", 14, 14, 20, 20);
  }

  addPdfText(doc, "GOODISH", 39, 22, {
    size: 19,
    weight: "bold",
    color: [239, 47, 152],
    maxWidth: 56
  });

  addPdfText(doc, "Comprobante de pedido", 39, 29, {
    size: 8.5,
    color: [99, 86, 102],
    maxWidth: 58
  });

  addPdfText(doc, "PEDIDO", 140, 17, {
    size: 8,
    weight: "bold",
    color: [99, 86, 102],
    maxWidth: 56
  });

  addPdfText(doc, order.code || order.id || "GOODISH", 140, 25, {
    size: 11,
    weight: "bold",
    color: [31, 22, 34],
    maxWidth: 56
  });

  addPdfText(doc, formatDate(order.createdAt), 140, 32, {
    size: 8,
    color: [99, 86, 102],
    maxWidth: 56
  });

  doc.setDrawColor(226, 214, 224);
  doc.setLineWidth(0.25);
  doc.line(14, 42, 196, 42);
}

async function generatePdf(order, options = {}) {
  const jsPDF = window.jspdf?.jsPDF;

  if (!jsPDF) {
    window.print();
    return;
  }

  const doc = new jsPDF();
  const includeImages = options.includeImages !== false;

  await drawDocumentHeader(doc, order, options);

  addPdfText(doc, "Pedido confirmado", 14, 56, {
    size: 18,
    weight: "bold",
    color: [31, 22, 34],
    maxWidth: 95
  });

  addPdfText(doc, "Este documento resume la compra registrada. La validacion final queda sujeta a confirmacion de pago y disponibilidad.", 14, 65, {
    size: 8.8,
    color: [99, 86, 102],
    maxWidth: 118
  });

  doc.setFillColor(255, 244, 251);
  doc.setDrawColor(239, 47, 152);
  doc.roundedRect(145, 52, 51, 16, 3, 3, "FD");
  addPdfText(doc, order.paymentStatus || "PENDIENTE", 154, 62, {
    size: 9.5,
    weight: "bold",
    color: [239, 47, 152],
    maxWidth: 34
  });

  drawInfoBlock(doc, "Cliente", [
    { label: "Nombre", value: order.customer?.name || "Cliente GOODISH" },
    { label: "Correo", value: order.customer?.email || "Correo no registrado" },
    { label: "Celular", value: order.customer?.phone || "No registrado" }
  ], 14, 84, 84);

  drawInfoBlock(doc, "Entrega", [
    { label: "Distrito", value: order.customer?.district || "No registrado" },
    { label: "Direccion", value: order.customer?.address || "No registrada", gap: 8 },
    { label: "Referencia", value: order.customer?.reference || "Sin referencia" }
  ], 112, 84, 84);

  drawInfoBlock(doc, "Pago", [
    { label: "Metodo", value: order.paymentMethod || "Por confirmar" },
    { label: "Estado", value: order.paymentStatus || "PENDIENTE" }
  ], 14, 122, 84);

  drawInfoBlock(doc, "Negocio", [
    { label: "WhatsApp", value: BUSINESS_WHATSAPP_LABEL },
    { label: "Correo", value: BUSINESS_EMAIL }
  ], 112, 122, 84);

  let y = 159;
  drawSectionTitle(doc, "Detalle de productos", 14, y, 182);
  y += 8;

  doc.setFillColor(31, 22, 34);
  doc.rect(14, y, 182, 9, "F");
  addPdfText(doc, "Producto", 17, y + 6.4, { size: 7.5, weight: "bold", color: [255, 255, 255], maxWidth: 74 });
  addPdfText(doc, "Cant.", 113, y + 6.4, { size: 7.5, weight: "bold", color: [255, 255, 255], maxWidth: 16 });
  addPdfText(doc, "Precio", 134, y + 6.4, { size: 7.5, weight: "bold", color: [255, 255, 255], maxWidth: 22 });
  addPdfText(doc, "Subtotal", 165, y + 6.4, { size: 7.5, weight: "bold", color: [255, 255, 255], maxWidth: 26 });
  y += 13;

  const items = Array.isArray(order.items) ? order.items : [];
  for (const item of items) {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    const subtotal = quantity * price;
    const name = item.name || "Producto GOODISH";

    if (y > 252) {
      doc.addPage();
      await drawDocumentHeader(doc, order, options);
      y = 56;

      doc.setFillColor(31, 22, 34);
      doc.rect(14, y, 182, 9, "F");
      addPdfText(doc, "Producto", 17, y + 6.4, { size: 7.5, weight: "bold", color: [255, 255, 255], maxWidth: 74 });
      addPdfText(doc, "Cant.", 113, y + 6.4, { size: 7.5, weight: "bold", color: [255, 255, 255], maxWidth: 16 });
      addPdfText(doc, "Precio", 134, y + 6.4, { size: 7.5, weight: "bold", color: [255, 255, 255], maxWidth: 22 });
      addPdfText(doc, "Subtotal", 165, y + 6.4, { size: 7.5, weight: "bold", color: [255, 255, 255], maxWidth: 26 });
      y += 13;
    }

    doc.setDrawColor(232, 224, 231);
    doc.setLineWidth(0.2);
    doc.line(14, y + 21, 196, y + 21);

    const productTextX = includeImages ? 38 : 17;
    const productTextWidth = includeImages ? 68 : 89;
    const imageDataUrl = includeImages ? await loadImageAsDataUrl(item.image || "images/logo.png") : null;

    if (imageDataUrl) {
      doc.addImage(imageDataUrl, "PNG", 17, y, 16, 18);
    }

    addPdfText(doc, name, productTextX, y + 6, {
      size: 8.8,
      weight: "bold",
      color: [31, 22, 34],
      maxWidth: productTextWidth
    });

    addPdfText(doc, `${item.category || "GOODISH"} / ${item.size || "Talla unica"}`, productTextX, y + 13, {
      size: 7.5,
      color: [99, 86, 102],
      maxWidth: productTextWidth
    });

    addPdfText(doc, quantity, 115, y + 10.5, { size: 8.5, color: [31, 22, 34], maxWidth: 12 });
    addPdfText(doc, formatPrice(price), 132, y + 10.5, { size: 8.5, color: [31, 22, 34], maxWidth: 28 });
    addPdfText(doc, formatPrice(subtotal), 164, y + 10.5, {
      size: 8.8,
      weight: "bold",
      color: [31, 22, 34],
      maxWidth: 30
    });

    y += 24;
  }

  if (items.length === 0) {
    addPdfText(doc, "No hay productos registrados en este pedido.", 17, y + 8, {
      size: 9,
      color: [99, 86, 102],
      maxWidth: 120
    });
    y += 18;
  }

  if (y > 226) {
    doc.addPage();
    await drawDocumentHeader(doc, order, options);
    y = 56;
  }

  const totalBoxY = y + 6;
  doc.setDrawColor(226, 214, 224);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(118, totalBoxY, 78, 38, 2, 2, "FD");

  addPdfText(doc, "Productos", 124, totalBoxY + 9, { size: 8.5, color: [99, 86, 102], maxWidth: 32 });
  addPdfText(doc, String(order.totalItems || 0), 180, totalBoxY + 9, { size: 8.5, weight: "bold", color: [31, 22, 34], maxWidth: 12 });
  addPdfText(doc, "Subtotal", 124, totalBoxY + 17, { size: 8.5, color: [99, 86, 102], maxWidth: 32 });
  addPdfText(doc, formatPrice(order.subtotal), 163, totalBoxY + 17, { size: 8.5, weight: "bold", color: [31, 22, 34], maxWidth: 28 });

  doc.setDrawColor(226, 214, 224);
  doc.line(124, totalBoxY + 23, 190, totalBoxY + 23);

  addPdfText(doc, "TOTAL", 124, totalBoxY + 32, { size: 10, weight: "bold", color: [31, 22, 34], maxWidth: 26 });
  addPdfText(doc, formatPrice(order.total || order.subtotal), 158, totalBoxY + 32, {
    size: 13,
    weight: "bold",
    color: [239, 47, 152],
    maxWidth: 34
  });

  drawSectionTitle(doc, "Siguiente paso", 14, totalBoxY + 4, 80);
  addPdfText(doc, "Envia el comprobante de pago por WhatsApp e incluye tu codigo de pedido. GOODISH validara el pago y coordinara la entrega.", 14, totalBoxY + 15, {
    size: 8.5,
    color: [99, 86, 102],
    maxWidth: 84
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    drawPageFooter(doc, page, pageCount);
  }

  if (options.output === "base64") {
    return doc.output("datauristring").split(",")[1];
  }

  doc.save(`${order.code || "pedido-goodish"}.pdf`);
  return null;
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
    renderEmailNotice("sending", "Estamos enviando el PDF al cliente y al negocio.");

    const pdfBase64 = await generatePdf(order, {
      output: "base64",
      includeImages: false
    });
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
    renderEmailNotice("sent", "Se envio el PDF al correo del cliente y al correo del negocio.");
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

      await generatePdf(order);

      downloadPdfBtn.disabled = false;
      downloadPdfBtn.textContent = "Descargar PDF";
    });
  }

  if (window.updateNavbarCartCount) {
    window.updateNavbarCartCount();
  }
});
