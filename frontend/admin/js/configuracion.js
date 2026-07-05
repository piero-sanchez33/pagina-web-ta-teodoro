// frontend/admin/js/configuracion.js

(function () {
  const admin = window.goodishAdmin;
  const SETTINGS_KEY = "goodish_admin_business_settings";
  let client = null;
  let paymentMethods = [];
  let deliveryTypes = [];

  function loadLocalSettings() {
    let settings = {};

    try {
      settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    } catch {
      settings = {};
    }

    document.getElementById("businessWhatsapp").value = settings.whatsapp || "51977890648";
    document.getElementById("businessEmail").value = settings.email || "";
    document.getElementById("businessMessage").value = settings.message || "Hola GOODISH, quiero coordinar mi pedido.";
  }

  function saveLocalSettings(event) {
    event.preventDefault();

    const settings = {
      whatsapp: document.getElementById("businessWhatsapp").value.trim(),
      email: document.getElementById("businessEmail").value.trim(),
      message: document.getElementById("businessMessage").value.trim()
    };

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    admin.showToast("Configuracion local guardada.");
  }

  function renderPaymentMethods() {
    const list = document.getElementById("paymentMethodsList");
    if (!list) return;

    if (paymentMethods.length === 0) {
      list.innerHTML = `<div class="admin-empty-line">No hay metodos de pago.</div>`;
      return;
    }

    list.innerHTML = paymentMethods.map(method => `
      <article class="admin-list-item">
        <div>
          <strong>${admin.escapeHtml(method.descripcion_pago)}</strong>
          <span>Codigo ${admin.escapeHtml(method.codigo_pago)}</span>
        </div>
        <button class="admin-row-btn" type="button" data-action="edit-payment" data-id="${method.codigo_pago}">Editar</button>
      </article>
    `).join("");
  }

  function renderDeliveryTypes() {
    const list = document.getElementById("deliveryTypesList");
    if (!list) return;

    if (deliveryTypes.length === 0) {
      list.innerHTML = `<div class="admin-empty-line">No hay tipos de entrega.</div>`;
      return;
    }

    list.innerHTML = deliveryTypes.map(type => `
      <article class="admin-list-item">
        <div>
          <strong>${admin.escapeHtml(type.nombre_tipo_ent)}</strong>
          <span>Codigo ${admin.escapeHtml(type.codigo_tipo_ent)}</span>
        </div>
        <button class="admin-row-btn" type="button" data-action="edit-delivery" data-id="${type.codigo_tipo_ent}">Editar</button>
      </article>
    `).join("");
  }

  async function loadConfigData() {
    const [paymentsResult, deliveriesResult] = await Promise.all([
      client
        .from("metodo_pago")
        .select("codigo_pago, descripcion_pago")
        .order("codigo_pago", { ascending: true }),
      client
        .from("tipo_entrega")
        .select("codigo_tipo_ent, nombre_tipo_ent")
        .order("codigo_tipo_ent", { ascending: true })
    ]);

    if (paymentsResult.error) throw paymentsResult.error;
    if (deliveriesResult.error) throw deliveriesResult.error;

    paymentMethods = paymentsResult.data || [];
    deliveryTypes = deliveriesResult.data || [];

    renderPaymentMethods();
    renderDeliveryTypes();
  }

  function resetPaymentForm() {
    document.getElementById("paymentId").value = "";
    document.getElementById("paymentName").value = "";
  }

  function resetDeliveryForm() {
    document.getElementById("deliveryId").value = "";
    document.getElementById("deliveryName").value = "";
  }

  async function savePayment(event) {
    event.preventDefault();

    const id = document.getElementById("paymentId").value;
    const payload = {
      descripcion_pago: document.getElementById("paymentName").value.trim()
    };

    const result = id
      ? await client.from("metodo_pago").update(payload).eq("codigo_pago", Number(id))
      : await client.from("metodo_pago").insert(payload);

    if (result.error) {
      admin.showToast(result.error.message || "No se pudo guardar el metodo.");
      return;
    }

    admin.showToast(id ? "Metodo actualizado." : "Metodo creado.");
    resetPaymentForm();
    await loadConfigData();
  }

  async function saveDelivery(event) {
    event.preventDefault();

    const id = document.getElementById("deliveryId").value;
    const payload = {
      nombre_tipo_ent: document.getElementById("deliveryName").value.trim()
    };

    const result = id
      ? await client.from("tipo_entrega").update(payload).eq("codigo_tipo_ent", Number(id))
      : await client.from("tipo_entrega").insert(payload);

    if (result.error) {
      admin.showToast(result.error.message || "No se pudo guardar el tipo de entrega.");
      return;
    }

    admin.showToast(id ? "Tipo de entrega actualizado." : "Tipo de entrega creado.");
    resetDeliveryForm();
    await loadConfigData();
  }

  function setupEvents() {
    document.getElementById("businessConfigForm")?.addEventListener("submit", saveLocalSettings);
    document.getElementById("paymentForm")?.addEventListener("submit", savePayment);
    document.getElementById("deliveryForm")?.addEventListener("submit", saveDelivery);
    document.getElementById("resetPaymentBtn")?.addEventListener("click", resetPaymentForm);
    document.getElementById("resetDeliveryBtn")?.addEventListener("click", resetDeliveryForm);

    document.body.addEventListener("click", event => {
      const button = event.target.closest("[data-action]");
      if (!button) return;

      if (button.dataset.action === "edit-payment") {
        const method = paymentMethods.find(item => Number(item.codigo_pago) === Number(button.dataset.id));
        if (!method) return;

        document.getElementById("paymentId").value = method.codigo_pago;
        document.getElementById("paymentName").value = method.descripcion_pago || "";
      }

      if (button.dataset.action === "edit-delivery") {
        const type = deliveryTypes.find(item => Number(item.codigo_tipo_ent) === Number(button.dataset.id));
        if (!type) return;

        document.getElementById("deliveryId").value = type.codigo_tipo_ent;
        document.getElementById("deliveryName").value = type.nombre_tipo_ent || "";
      }
    });
  }

  admin.onReady(async context => {
    client = context.client;
    loadLocalSettings();
    setupEvents();

    try {
      await loadConfigData();
    } catch (error) {
      console.error("Error configuracion admin:", error);
      admin.showToast(error.message || "No se pudo cargar configuracion.");
    }
  });
})();
