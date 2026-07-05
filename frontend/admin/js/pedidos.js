// frontend/admin/js/pedidos.js

(function () {
  const admin = window.goodishAdmin;
  const BUSINESS_WHATSAPP = "51977890648";
  let allOrders = [];
  let currentClient = null;

  const statusOptions = [
    "PENDIENTE_PAGO",
    "PENDIENTE",
    "PAGADO",
    "EN_PREPARACION",
    "ENVIADO",
    "ENTREGADO",
    "CANCELADO"
  ];

  function getSearchValue() {
    return admin.normalizeText(document.getElementById("ordersSearch")?.value || "");
  }

  function getStatusFilter() {
    return document.getElementById("ordersStatusFilter")?.value || "all";
  }

  function customerName(profile) {
    return `${profile?.nombre_cli || ""} ${profile?.apellido_cli || ""}`.trim() || profile?.correo_cli || "Cliente";
  }

  function getWhatsAppMessage(order) {
    const lines = [
      `Hola GOODISH, reviso el pedido ${order.code}.`,
      `Cliente: ${order.customer.name}`,
      `Total: ${admin.formatPrice(order.total)}`
    ];

    return encodeURIComponent(lines.join("\n"));
  }

  function matchesFilters(order) {
    const search = getSearchValue();
    const status = getStatusFilter();
    const text = admin.normalizeText([
      order.code,
      order.customer.name,
      order.customer.email,
      order.customer.phone,
      order.paymentMethod
    ].join(" "));

    if (status !== "all" && String(order.status || "").toUpperCase() !== status) return false;
    if (search && !text.includes(search)) return false;

    return true;
  }

  function renderOrders() {
    const list = document.getElementById("ordersList");
    const counter = document.getElementById("ordersCounter");
    if (!list) return;

    const filtered = allOrders.filter(matchesFilters);

    if (counter) {
      counter.textContent = `${filtered.length} de ${allOrders.length} pedidos visibles.`;
    }

    if (filtered.length === 0) {
      list.innerHTML = `<article class="admin-empty-state">No hay pedidos con esos filtros.</article>`;
      return;
    }

    list.innerHTML = filtered.map((order, index) => `
      <article class="admin-order-card" data-order-index="${allOrders.indexOf(order)}">
        <div class="admin-order-card-main">
          <div>
            <h3 class="admin-order-code">${admin.escapeHtml(order.code)}</h3>
            <div class="admin-order-meta">
              <span>${admin.escapeHtml(admin.formatDate(order.createdAt))}</span>
              <span>${admin.escapeHtml(order.paymentMethod)}</span>
              <span>${admin.escapeHtml(order.totalItems)} producto${order.totalItems === 1 ? "" : "s"}</span>
            </div>
          </div>

          <div>
            <strong class="admin-cell-title">${admin.escapeHtml(order.customer.name)}</strong>
            <span class="admin-cell-subtitle">${admin.escapeHtml(order.customer.email)}</span>
            <span class="admin-cell-subtitle">${admin.escapeHtml(order.customer.phone)}</span>
          </div>

          <div class="admin-order-total">
            <span>Total</span>
            <strong>${admin.escapeHtml(admin.formatPrice(order.total))}</strong>
          </div>

          <div class="admin-order-actions">
            <span class="admin-badge ${admin.statusClass(order.status)}">${admin.escapeHtml(admin.statusLabel(order.status))}</span>
            <button class="admin-row-btn" type="button" data-action="toggle">Detalle</button>
          </div>
        </div>

        <div class="admin-order-detail">
          <div class="admin-detail-box">
            <h4>Entrega</h4>
            <p><strong>Distrito:</strong> ${admin.escapeHtml(order.customer.district)}</p>
            <p><strong>Direccion:</strong> ${admin.escapeHtml(order.customer.address)}</p>
            <p><strong>Referencia:</strong> ${admin.escapeHtml(order.customer.reference)}</p>
          </div>

          <div class="admin-detail-box">
            <h4>Gestion</h4>
            <label class="admin-field">
              <span>Estado del pedido</span>
              <select data-action="status">
                ${statusOptions.map(status => `
                  <option value="${status}" ${String(order.status || "").toUpperCase() === status ? "selected" : ""}>
                    ${admin.statusLabel(status)}
                  </option>
                `).join("")}
              </select>
            </label>
            <div class="admin-form-actions" style="margin-top:12px;">
              <button class="admin-secondary-btn" type="button" data-action="pdf">Descargar PDF</button>
              <a class="admin-secondary-btn" href="https://wa.me/${BUSINESS_WHATSAPP}?text=${getWhatsAppMessage(order)}" target="_blank" rel="noopener">WhatsApp</a>
            </div>
          </div>

          <div class="admin-order-items">
            ${order.items.map(item => `
              <article class="admin-order-item">
                <img src="${admin.escapeHtml(admin.getImageSrc(item.image))}" alt="${admin.escapeHtml(item.name)}">
                <div>
                  <strong>${admin.escapeHtml(item.name)}</strong>
                  <span class="admin-cell-subtitle">${admin.escapeHtml(item.size)} / Cantidad: ${admin.escapeHtml(item.quantity)}</span>
                </div>
                <strong>${admin.escapeHtml(admin.formatPrice(Number(item.price || 0) * Number(item.quantity || 0)))}</strong>
              </article>
            `).join("") || `<div class="admin-empty-line">Este pedido no tiene detalle registrado.</div>`}
          </div>
        </div>
      </article>
    `).join("");

    list.querySelectorAll("[data-action='toggle']").forEach(button => {
      button.addEventListener("click", () => {
        button.closest(".admin-order-card").classList.toggle("open");
      });
    });

    list.querySelectorAll("[data-action='status']").forEach(select => {
      select.addEventListener("change", async () => {
        const card = select.closest(".admin-order-card");
        const order = allOrders[Number(card.dataset.orderIndex)];
        await updateOrderStatus(order, select.value);
      });
    });

    list.querySelectorAll("[data-action='pdf']").forEach(button => {
      button.addEventListener("click", async () => {
        const card = button.closest(".admin-order-card");
        const order = allOrders[Number(card.dataset.orderIndex)];

        button.disabled = true;
        button.textContent = "Generando...";

        try {
          await window.GOODISH_PDF.downloadOrderPdf(order);
        } finally {
          button.disabled = false;
          button.textContent = "Descargar PDF";
        }
      });
    });
  }

  async function updateOrderStatus(order, status) {
    const { error } = await currentClient
      .from("venta")
      .update({ estado_venta: status })
      .eq("codigo_ven", order.codigo_ven);

    if (error) {
      admin.showToast(error.message || "No se pudo actualizar el pedido.");
      renderOrders();
      return;
    }

    order.status = status;
    admin.showToast("Estado actualizado.");
    renderOrders();
  }

  async function loadOrders(context) {
    currentClient = context.client;
    const client = context.client;

    const params = new URLSearchParams(window.location.search);
    const forcedClientId = params.get("cliente");

    const salesQuery = client
      .from("venta")
      .select(`
        codigo_ven,
        codigo_pedido,
        usuario_id,
        total_pagar,
        estado_venta,
        direccion_entrega,
        distrito_entrega,
        referencia_entrega,
        telefono_contacto,
        codigo_pago,
        creado_en,
        fecha_venta
      `)
      .order("creado_en", { ascending: false });

    if (forcedClientId) {
      salesQuery.eq("usuario_id", forcedClientId);
    }

    const { data: sales, error: salesError } = await salesQuery;
    if (salesError) throw salesError;

    const saleRows = sales || [];
    const saleIds = saleRows.map(sale => sale.codigo_ven).filter(Boolean);
    const userIds = [...new Set(saleRows.map(sale => sale.usuario_id).filter(Boolean))];
    const paymentIds = [...new Set(saleRows.map(sale => sale.codigo_pago).filter(Boolean))];

    const [detailsResult, usersResult, paymentsResult] = await Promise.all([
      saleIds.length
        ? client.from("detalle_venta").select("codigo_ven, codigo_pre, cantidad, precio_venta_final").in("codigo_ven", saleIds)
        : Promise.resolve({ data: [], error: null }),
      userIds.length
        ? client.from("usuarios").select("id, nombre_cli, apellido_cli, correo_cli, celular_cli, ciudad_cli").in("id", userIds)
        : Promise.resolve({ data: [], error: null }),
      paymentIds.length
        ? client.from("metodo_pago").select("codigo_pago, descripcion_pago").in("codigo_pago", paymentIds)
        : Promise.resolve({ data: [], error: null })
    ]);

    if (detailsResult.error) throw detailsResult.error;
    if (usersResult.error) throw usersResult.error;
    if (paymentsResult.error) throw paymentsResult.error;

    const details = detailsResult.data || [];
    const productIds = [...new Set(details.map(detail => detail.codigo_pre).filter(Boolean))];

    const productsResult = productIds.length
      ? await client
          .from("prenda")
          .select("codigo_pre, nombre_pre, descripcion, precio_unitario, imagen_url, talla, estilo, badge")
          .in("codigo_pre", productIds)
      : { data: [], error: null };

    if (productsResult.error) throw productsResult.error;

    const profilesById = new Map((usersResult.data || []).map(user => [user.id, user]));
    const paymentsById = new Map((paymentsResult.data || []).map(payment => [payment.codigo_pago, payment.descripcion_pago]));
    const productsById = new Map((productsResult.data || []).map(product => [product.codigo_pre, product]));
    const detailsBySale = details.reduce((map, detail) => {
      const list = map.get(detail.codigo_ven) || [];
      list.push(detail);
      map.set(detail.codigo_ven, list);
      return map;
    }, new Map());

    allOrders = saleRows.map(sale => {
      const profile = profilesById.get(sale.usuario_id) || {};
      const saleDetails = detailsBySale.get(sale.codigo_ven) || [];
      const items = saleDetails.map(detail => {
        const product = productsById.get(detail.codigo_pre) || {};
        const price = Number(detail.precio_venta_final || product.precio_unitario || 0);
        const quantity = Number(detail.cantidad || 0);

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

      const totalItems = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const subtotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
      const total = Number(sale.total_pagar || subtotal);

      return {
        codigo_ven: sale.codigo_ven,
        id: sale.codigo_pedido || sale.codigo_ven,
        code: sale.codigo_pedido || `GOODISH-${sale.codigo_ven}`,
        createdAt: sale.creado_en || sale.fecha_venta,
        status: sale.estado_venta || "PENDIENTE_PAGO",
        paymentStatus: sale.estado_venta || "PENDIENTE",
        paymentMethod: paymentsById.get(sale.codigo_pago) || "Por confirmar",
        customer: {
          name: customerName(profile),
          email: profile.correo_cli || "Correo no registrado",
          phone: sale.telefono_contacto || profile.celular_cli || "No registrado",
          district: sale.distrito_entrega || profile.ciudad_cli || "No registrado",
          address: sale.direccion_entrega || "Direccion no registrada",
          reference: sale.referencia_entrega || "Sin referencia"
        },
        items,
        totalItems,
        subtotal: total,
        total
      };
    });

    renderOrders();
  }

  admin.onReady(async context => {
    try {
      await loadOrders(context);
      document.getElementById("ordersSearch")?.addEventListener("input", renderOrders);
      document.getElementById("ordersStatusFilter")?.addEventListener("change", renderOrders);
    } catch (error) {
      console.error("Error pedidos admin:", error);
      admin.showError(document.getElementById("ordersList"), error.message || "No se pudieron cargar los pedidos.");
    }
  });
})();
