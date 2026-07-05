// frontend/admin/js/admin-auth.js

(function () {
  const SUPABASE_URL = "https://oqojlcgkmvbxmmwoexih.supabase.co";
  const SUPABASE_KEY = "sb_publishable_FJvX6aKfJO-f-SAzx2vu0Q_F4ex4L0T";

  const admin = window.goodishAdmin || {};
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  admin.client = supabaseClient;
  admin.context = null;
  admin.readyCallbacks = [];

  admin.escapeHtml = function (value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  admin.formatPrice = function (value) {
    return `S/ ${Number(value || 0).toFixed(2)}`;
  };

  admin.formatDate = function (value) {
    if (!value) return "Sin fecha";

    return new Intl.DateTimeFormat("es-PE", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  };

  admin.normalizeText = function (value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  admin.statusLabel = function (status) {
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

    return labels[value] || value.replaceAll("_", " ").toLowerCase();
  };

  admin.statusClass = function (status) {
    return String(status || "PENDIENTE_PAGO").toLowerCase();
  };

  admin.getImageSrc = function (value) {
    const src = String(value || "").trim();

    if (!src) return "../images/logo.png";
    if (src.startsWith("http") || src.startsWith("../") || src.startsWith("/")) return src;

    return `../${src}`;
  };

  admin.showToast = function (message) {
    const toast = document.getElementById("adminToast");

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  };

  admin.showError = function (target, message) {
    if (!target) return;

    target.innerHTML = `
      <div class="admin-empty-state">
        <strong>No se pudo cargar</strong>
        <p>${admin.escapeHtml(message)}</p>
      </div>
    `;
  };

  function renderLocked(title, message, linkHref = "../login.html", linkText = "Ir al login") {
    document.body.classList.add("admin-locked");
    document.body.innerHTML = `
      <section class="admin-locked-card">
        <h1>${admin.escapeHtml(title)}</h1>
        <p>${admin.escapeHtml(message)}</p>
        <a class="admin-primary-btn" href="${admin.escapeHtml(linkHref)}">${admin.escapeHtml(linkText)}</a>
      </section>
    `;
  }

  async function getCurrentUser() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data?.user) {
      renderLocked(
        "Sesion requerida",
        "Debes iniciar sesion con una cuenta administradora para entrar al panel.",
        "../login.html",
        "Iniciar sesion"
      );
      return null;
    }

    return data.user;
  }

  async function getProfile(user) {
    const { data, error } = await supabaseClient
      .from("usuarios")
      .select("id, nombre_cli, apellido_cli, correo_cli, celular_cli, ciudad_cli, rol, creado_en")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;

    if (!user.email) return null;

    const { data: byEmail, error: emailError } = await supabaseClient
      .from("usuarios")
      .select("id, nombre_cli, apellido_cli, correo_cli, celular_cli, ciudad_cli, rol, creado_en")
      .eq("correo_cli", user.email)
      .maybeSingle();

    if (emailError) throw emailError;

    return byEmail || null;
  }

  admin.requireAdmin = async function () {
    try {
      const user = await getCurrentUser();
      if (!user) return null;

      const profile = await getProfile(user);
      const role = String(profile?.rol || "").toLowerCase();

      if (role !== "admin") {
        renderLocked(
          "Acceso denegado",
          "Tu cuenta existe, pero no tiene rol admin en la tabla usuarios.",
          "../index.html",
          "Volver a la tienda"
        );
        return null;
      }

      admin.context = {
        user,
        profile,
        client: supabaseClient
      };

      admin.readyCallbacks.splice(0).forEach(callback => callback(admin.context));
      window.dispatchEvent(new CustomEvent("goodish:admin-ready", { detail: admin.context }));

      return admin.context;
    } catch (error) {
      console.error("No se pudo validar admin:", error);
      renderLocked(
        "No se pudo validar el acceso",
        error.message || "Supabase bloqueo la lectura del perfil administrador.",
        "../index.html",
        "Volver a la tienda"
      );
      return null;
    }
  };

  admin.onReady = function (callback) {
    if (admin.context) {
      callback(admin.context);
      return;
    }

    admin.readyCallbacks.push(callback);
  };

  window.goodishAdmin = admin;
})();
