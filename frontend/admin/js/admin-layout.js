// frontend/admin/js/admin-layout.js

(function () {
  const navItems = [
    { page: "dashboard", label: "Dashboard", href: "dashboard.html", icon: "D" },
    { page: "pedidos", label: "Pedidos", href: "pedidos.html", icon: "P" },
    { page: "productos", label: "Productos", href: "productos.html", icon: "R" },
    { page: "inventario", label: "Inventario", href: "inventario.html", icon: "I" },
    { page: "clientes", label: "Clientes", href: "clientes.html", icon: "C" },
    { page: "configuracion", label: "Configuracion", href: "configuracion.html", icon: "S" }
  ];

  function getFullName(profile, fallbackEmail) {
    const fullName = `${profile?.nombre_cli || ""} ${profile?.apellido_cli || ""}`.trim();
    return fullName || fallbackEmail?.split("@")[0] || "Admin GOODISH";
  }

  function renderSidebar() {
    const sidebar = document.getElementById("adminSidebar");
    const currentPage = document.body.dataset.adminPage;

    if (!sidebar) return;

    sidebar.innerHTML = `
      <a class="admin-brand" href="dashboard.html">
        <img src="../images/logo.png" alt="GOODISH logo">
        <div>
          <strong>GOODISH</strong>
          <span>Panel admin</span>
        </div>
      </a>

      <nav class="admin-nav">
        ${navItems.map(item => `
          <a href="${item.href}" class="${item.page === currentPage ? "active" : ""}">
            <span class="admin-nav-icon">${item.icon}</span>
            ${item.label}
          </a>
        `).join("")}
      </nav>

      <div class="admin-sidebar-footer">
        Gestion interna para ventas, stock, clientes y catalogo.
      </div>
    `;
  }

  function renderTopbar(context) {
    const topbar = document.getElementById("adminTopbar");
    if (!topbar) return;

    const fullName = getFullName(context.profile, context.user.email);
    const firstName = fullName.split(" ")[0] || "Admin";
    const initial = firstName.charAt(0).toUpperCase() || "A";

    topbar.innerHTML = `
      <div class="admin-topbar-left">
        <strong>Hola, ${window.goodishAdmin.escapeHtml(firstName)}</strong>
        <span>${window.goodishAdmin.escapeHtml(context.profile?.correo_cli || context.user.email || "Admin")}</span>
      </div>

      <div class="admin-topbar-actions">
        <a class="admin-topbar-link" href="../index.html">Ver tienda</a>
        <div class="admin-user-pill">
          <span class="admin-avatar">${window.goodishAdmin.escapeHtml(initial)}</span>
          <strong>${window.goodishAdmin.escapeHtml(context.profile?.rol || "admin")}</strong>
        </div>
        <button class="admin-topbar-button" type="button" id="adminLogoutBtn">Salir</button>
      </div>
    `;

    const logoutBtn = document.getElementById("adminLogoutBtn");

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await context.client.auth.signOut();
        window.location.href = "../index.html";
      });
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    renderSidebar();

    const context = await window.goodishAdmin.requireAdmin();
    if (!context) return;

    renderTopbar(context);
  });
})();
