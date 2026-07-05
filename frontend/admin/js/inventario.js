// frontend/admin/js/inventario.js

(function () {
  const admin = window.goodishAdmin;
  let client = null;
  let adminProfile = null;
  let products = [];
  let movements = [];

  function movementLabel(type) {
    const labels = {
      1: "Entrada",
      2: "Salida",
      3: "Ajuste"
    };

    return labels[Number(type)] || "Movimiento";
  }

  function renderProductSelect() {
    const select = document.getElementById("inventoryProduct");
    if (!select) return;

    select.innerHTML = `<option value="">Selecciona una prenda</option>`;

    products.forEach(product => {
      const option = document.createElement("option");
      option.value = product.codigo_pre;
      option.textContent = `${product.nombre_pre} (${Number(product.stock_actual || 0)} uds)`;
      select.appendChild(option);
    });
  }

  function renderProductsList() {
    const list = document.getElementById("inventoryProductsList");
    const counter = document.getElementById("inventoryProductsCounter");
    if (!list) return;

    if (counter) {
      counter.textContent = `${products.length} prendas en inventario.`;
    }

    if (products.length === 0) {
      list.innerHTML = `<div class="admin-empty-line">No hay prendas registradas.</div>`;
      return;
    }

    list.innerHTML = products.map(product => `
      <article class="admin-list-item">
        <div>
          <strong>${admin.escapeHtml(product.nombre_pre)}</strong>
          <span>${admin.escapeHtml(product.talla || "Sin talla")} / ${admin.escapeHtml(product.estilo || "Sin estilo")}</span>
        </div>
        <span class="admin-badge ${Number(product.stock_actual || 0) <= 0 ? "out" : Number(product.stock_actual || 0) <= 5 ? "pending" : "ok"}">
          ${Number(product.stock_actual || 0)} uds
        </span>
      </article>
    `).join("");
  }

  function renderMovements() {
    const tbody = document.getElementById("inventoryMovementsBody");
    const counter = document.getElementById("inventoryMovementsCounter");
    if (!tbody) return;

    if (counter) {
      counter.textContent = `${movements.length} movimiento${movements.length === 1 ? "" : "s"} registrado${movements.length === 1 ? "" : "s"}.`;
    }

    if (movements.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">No hay movimientos registrados.</td></tr>`;
      return;
    }

    const productsById = new Map(products.map(product => [product.codigo_pre, product]));

    tbody.innerHTML = movements.map(movement => {
      const product = productsById.get(movement.codigo_pre);

      return `
        <tr>
          <td>${admin.escapeHtml(admin.formatDate(movement.fecha_movimiento))}</td>
          <td>
            <strong class="admin-cell-title">${admin.escapeHtml(product?.nombre_pre || `Prenda ${movement.codigo_pre}`)}</strong>
            <span class="admin-cell-subtitle">Codigo ${admin.escapeHtml(movement.codigo_pre)}</span>
          </td>
          <td><span class="admin-badge ${Number(movement.tipo_movimiento) === 2 ? "pending" : "ok"}">${admin.escapeHtml(movementLabel(movement.tipo_movimiento))}</span></td>
          <td>${Number(movement.cantidad || 0)}</td>
          <td>${Number(movement.stock_anterior || 0)} -> ${Number(movement.stock_nuevo || 0)}</td>
          <td>${admin.escapeHtml(movement.motivo || "Sin motivo")}</td>
        </tr>
      `;
    }).join("");
  }

  async function loadInventory() {
    const [productsResult, movementsResult] = await Promise.all([
      client
        .from("prenda")
        .select("codigo_pre, nombre_pre, stock_actual, talla, estilo, activo")
        .order("nombre_pre", { ascending: true }),
      client
        .from("movimiento_inventario")
        .select("codigo_mov, codigo_pre, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, codigo_ven, usuario_admin, fecha_movimiento")
        .order("fecha_movimiento", { ascending: false })
        .limit(80)
    ]);

    if (productsResult.error) throw productsResult.error;
    if (movementsResult.error) throw movementsResult.error;

    products = productsResult.data || [];
    movements = movementsResult.data || [];

    renderProductSelect();
    renderProductsList();
    renderMovements();
  }

  async function registerMovement(event) {
    event.preventDefault();

    const productId = Number(document.getElementById("inventoryProduct").value);
    const type = Number(document.getElementById("inventoryType").value);
    const quantity = Number(document.getElementById("inventoryQuantity").value || 0);
    const reason = document.getElementById("inventoryReason").value.trim();
    const product = products.find(item => Number(item.codigo_pre) === productId);

    if (!product) {
      admin.showToast("Selecciona una prenda.");
      return;
    }

    const previousStock = Number(product.stock_actual || 0);
    let nextStock = previousStock;

    if (type === 1) nextStock = previousStock + quantity;
    if (type === 2) nextStock = previousStock - quantity;
    if (type === 3) nextStock = quantity;

    if (nextStock < 0) {
      admin.showToast("La salida supera el stock actual.");
      return;
    }

    const updateResult = await client
      .from("prenda")
      .update({ stock_actual: nextStock })
      .eq("codigo_pre", productId);

    if (updateResult.error) {
      admin.showToast(updateResult.error.message || "No se pudo actualizar el stock.");
      return;
    }

    const insertResult = await client.from("movimiento_inventario").insert({
      codigo_pre: productId,
      tipo_movimiento: type,
      cantidad: quantity,
      stock_anterior: previousStock,
      stock_nuevo: nextStock,
      motivo: reason,
      codigo_ven: null,
      usuario_admin: adminProfile?.id || null,
      fecha_movimiento: new Date().toISOString()
    });

    if (insertResult.error) {
      admin.showToast(`Stock actualizado, pero no se registro historial: ${insertResult.error.message}`);
    } else {
      admin.showToast("Movimiento registrado.");
    }

    event.target.reset();
    await loadInventory();
  }

  admin.onReady(async context => {
    client = context.client;
    adminProfile = context.profile;

    document.getElementById("inventoryForm")?.addEventListener("submit", registerMovement);

    try {
      await loadInventory();
    } catch (error) {
      console.error("Error inventario admin:", error);
      admin.showToast(error.message || "No se pudo cargar inventario.");
    }
  });
})();
