// frontend/admin/js/clientes.js

(function () {
  const admin = window.goodishAdmin;
  let clients = [];
  let sales = [];

  function fullName(client) {
    return `${client.nombre_cli || ""} ${client.apellido_cli || ""}`.trim() || "Cliente sin nombre";
  }

  function getClientStats(clientId) {
    const clientSales = sales.filter(sale => sale.usuario_id === clientId);
    const total = clientSales.reduce((sum, sale) => sum + Number(sale.total_pagar || 0), 0);

    return {
      count: clientSales.length,
      total
    };
  }

  function renderClients() {
    const tbody = document.getElementById("clientsTableBody");
    const counter = document.getElementById("clientsCounter");
    const search = admin.normalizeText(document.getElementById("clientsSearch")?.value || "");

    if (!tbody) return;

    const filtered = clients.filter(client => {
      const text = admin.normalizeText([
        fullName(client),
        client.correo_cli,
        client.celular_cli,
        client.ciudad_cli,
        client.rol
      ].join(" "));

      return !search || text.includes(search);
    });

    if (counter) {
      counter.textContent = `${filtered.length} de ${clients.length} clientes visibles.`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">No hay clientes con esa busqueda.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(client => {
      const stats = getClientStats(client.id);

      return `
        <tr>
          <td>
            <div class="admin-client-cell">
              <span class="admin-avatar">${admin.escapeHtml(fullName(client).charAt(0).toUpperCase() || "C")}</span>
              <div>
                <strong class="admin-cell-title">${admin.escapeHtml(fullName(client))}</strong>
                <span class="admin-cell-subtitle">${admin.escapeHtml(client.correo_cli || "Sin correo")}</span>
              </div>
            </div>
          </td>
          <td>
            <strong class="admin-cell-title">${admin.escapeHtml(client.celular_cli || "Sin celular")}</strong>
            <span class="admin-cell-subtitle">Creado: ${admin.escapeHtml(admin.formatDate(client.creado_en))}</span>
          </td>
          <td>${admin.escapeHtml(client.ciudad_cli || "No registrado")}</td>
          <td><a class="admin-soft-link" href="pedidos.html?cliente=${admin.escapeHtml(client.id)}">${stats.count} pedido${stats.count === 1 ? "" : "s"}</a></td>
          <td><strong>${admin.escapeHtml(admin.formatPrice(stats.total))}</strong></td>
          <td><span class="admin-badge ${String(client.rol || "").toLowerCase() === "admin" ? "active" : "pending"}">${admin.escapeHtml(client.rol || "cliente")}</span></td>
        </tr>
      `;
    }).join("");
  }

  async function loadClients(context) {
    const client = context.client;

    const [clientsResult, salesResult] = await Promise.all([
      client
        .from("usuarios")
        .select("id, nombre_cli, apellido_cli, correo_cli, celular_cli, ciudad_cli, sexo_cli, rol, creado_en")
        .order("creado_en", { ascending: false }),
      client
        .from("venta")
        .select("codigo_ven, usuario_id, total_pagar, creado_en")
    ]);

    if (clientsResult.error) throw clientsResult.error;
    if (salesResult.error) throw salesResult.error;

    clients = clientsResult.data || [];
    sales = salesResult.data || [];

    renderClients();
  }

  admin.onReady(async context => {
    document.getElementById("clientsSearch")?.addEventListener("input", renderClients);

    try {
      await loadClients(context);
    } catch (error) {
      console.error("Error clientes admin:", error);
      admin.showError(document.getElementById("clientsTableBody"), error.message || "No se pudieron cargar clientes.");
    }
  });
})();
