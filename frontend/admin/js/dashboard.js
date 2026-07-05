// frontend/admin/js/dashboard.js

(function () {
  const admin = window.goodishAdmin;

  function isToday(value) {
    if (!value) return false;

    const date = new Date(value);
    const now = new Date();

    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }

  function isPending(status) {
    return ["PENDIENTE_PAGO", "PENDIENTE", "EN_PREPARACION"].includes(String(status || "").toUpperCase());
  }

  function getCustomerName(profile) {
    const fullName = `${profile?.nombre_cli || ""} ${profile?.apellido_cli || ""}`.trim();
    return fullName || profile?.correo_cli || "Cliente";
  }

  function renderStats({ sales, products, users }) {
    const stats = document.getElementById("dashboardStats");
    if (!stats) return;

    const todaySales = sales.filter(sale => isToday(sale.creado_en || sale.fecha_venta));
    const todayTotal = todaySales.reduce((sum, sale) => sum + Number(sale.total_pagar || 0), 0);
    const pendingOrders = sales.filter(sale => isPending(sale.estado_venta)).length;
    const lowStock = products.filter(product => Number(product.stock_actual || 0) <= 5).length;

    stats.innerHTML = `
      <article class="admin-stat-card">
        <span>Ventas de hoy</span>
        <strong>${admin.formatPrice(todayTotal)}</strong>
        <small>${todaySales.length} pedido${todaySales.length === 1 ? "" : "s"} registrado${todaySales.length === 1 ? "" : "s"} hoy.</small>
      </article>

      <article class="admin-stat-card">
        <span>Pedidos pendientes</span>
        <strong>${pendingOrders}</strong>
        <small>Pedidos que aun requieren revision o confirmacion.</small>
      </article>

      <article class="admin-stat-card">
        <span>Clientes</span>
        <strong>${users.length}</strong>
        <small>Usuarios registrados en GOODISH.</small>
      </article>

      <article class="admin-stat-card">
        <span>Stock bajo</span>
        <strong>${lowStock}</strong>
        <small>Prendas con 5 unidades o menos.</small>
      </article>
    `;
  }

  function renderLatestOrders(sales, profilesById) {
    const tbody = document.getElementById("dashboardLatestOrders");
    if (!tbody) return;

    const latest = sales.slice(0, 6);

    if (latest.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4">No hay pedidos registrados.</td></tr>`;
      return;
    }

    tbody.innerHTML = latest.map(sale => {
      const profile = profilesById.get(sale.usuario_id);
      const status = sale.estado_venta || "PENDIENTE_PAGO";

      return `
        <tr>
          <td>
            <strong class="admin-cell-title">${admin.escapeHtml(sale.codigo_pedido || `VENTA-${sale.codigo_ven}`)}</strong>
            <span class="admin-cell-subtitle">${admin.escapeHtml(admin.formatDate(sale.creado_en || sale.fecha_venta))}</span>
          </td>
          <td>${admin.escapeHtml(getCustomerName(profile))}</td>
          <td><span class="admin-badge ${admin.statusClass(status)}">${admin.escapeHtml(admin.statusLabel(status))}</span></td>
          <td><strong>${admin.escapeHtml(admin.formatPrice(sale.total_pagar))}</strong></td>
        </tr>
      `;
    }).join("");
  }

  function renderLowStock(products) {
    const list = document.getElementById("dashboardLowStock");
    if (!list) return;

    const lowStock = products
      .filter(product => Number(product.stock_actual || 0) <= 5)
      .sort((a, b) => Number(a.stock_actual || 0) - Number(b.stock_actual || 0))
      .slice(0, 8);

    if (lowStock.length === 0) {
      list.innerHTML = `<div class="admin-empty-line">Todo el stock se ve saludable.</div>`;
      return;
    }

    list.innerHTML = lowStock.map(product => `
      <article class="admin-list-item">
        <div>
          <strong>${admin.escapeHtml(product.nombre_pre || "Prenda")}</strong>
          <span>${admin.escapeHtml(product.talla || "Sin talla")} / ${admin.escapeHtml(product.estilo || "Sin estilo")}</span>
        </div>
        <span class="admin-badge ${Number(product.stock_actual || 0) <= 0 ? "out" : "pending"}">${Number(product.stock_actual || 0)} uds</span>
      </article>
    `).join("");
  }

  async function loadDashboard(context) {
    const client = context.client;

    const [salesResult, productsResult, usersResult] = await Promise.all([
      client
        .from("venta")
        .select("codigo_ven, codigo_pedido, usuario_id, total_pagar, estado_venta, creado_en, fecha_venta")
        .order("creado_en", { ascending: false }),
      client
        .from("prenda")
        .select("codigo_pre, nombre_pre, stock_actual, talla, estilo, activo")
        .order("stock_actual", { ascending: true }),
      client
        .from("usuarios")
        .select("id, nombre_cli, apellido_cli, correo_cli")
    ]);

    if (salesResult.error) throw salesResult.error;
    if (productsResult.error) throw productsResult.error;
    if (usersResult.error) throw usersResult.error;

    const sales = salesResult.data || [];
    const products = productsResult.data || [];
    const users = usersResult.data || [];
    const profilesById = new Map(users.map(user => [user.id, user]));

    renderStats({ sales, products, users });
    renderLatestOrders(sales, profilesById);
    renderLowStock(products);
  }

  admin.onReady(async context => {
    try {
      await loadDashboard(context);
    } catch (error) {
      console.error("Error dashboard admin:", error);
      admin.showToast(error.message || "No se pudo cargar el dashboard.");
    }
  });
})();
