// frontend/admin/js/productos.js

(function () {
  const admin = window.goodishAdmin;
  let client = null;
  let products = [];
  let categories = [];

  const productForm = document.getElementById("productForm");
  const categoryForm = document.getElementById("categoryForm");

  function productPayload() {
    const categoryValue = document.getElementById("productCategory").value;

    return {
      nombre_pre: document.getElementById("productName").value.trim(),
      descripcion: document.getElementById("productDescription").value.trim(),
      precio_unitario: Number(document.getElementById("productPrice").value || 0),
      stock_actual: Number(document.getElementById("productStock").value || 0),
      talla: document.getElementById("productSize").value.trim() || null,
      estilo: document.getElementById("productStyle").value.trim() || null,
      badge: document.getElementById("productBadge").value.trim() || null,
      codigo_cat: categoryValue ? Number(categoryValue) : null,
      imagen_url: document.getElementById("productImage").value.trim() || null,
      activo: document.getElementById("productActive").checked
    };
  }

  function getCategoryName(id) {
    const category = categories.find(item => Number(item.codigo_cat) === Number(id));
    return category?.nombre_cat || "Sin categoria";
  }

  function renderCategorySelect() {
    const select = document.getElementById("productCategory");
    if (!select) return;

    select.innerHTML = `<option value="">Sin categoria</option>`;

    categories.forEach(category => {
      const option = document.createElement("option");
      option.value = category.codigo_cat;
      option.textContent = category.nombre_cat;
      select.appendChild(option);
    });
  }

  function renderProducts() {
    const tbody = document.getElementById("productsTableBody");
    const counter = document.getElementById("productsCounter");
    const search = admin.normalizeText(document.getElementById("productsSearch")?.value || "");

    if (!tbody) return;

    const filtered = products.filter(product => {
      const text = admin.normalizeText([
        product.nombre_pre,
        product.descripcion,
        product.talla,
        product.estilo,
        product.badge,
        getCategoryName(product.codigo_cat)
      ].join(" "));

      return !search || text.includes(search);
    });

    if (counter) {
      counter.textContent = `${filtered.length} de ${products.length} prendas visibles.`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">No hay prendas con esa busqueda.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(product => `
      <tr>
        <td>
          <div class="admin-product-cell">
            <img src="${admin.escapeHtml(admin.getImageSrc(product.imagen_url))}" alt="${admin.escapeHtml(product.nombre_pre)}">
            <div>
              <strong class="admin-cell-title">${admin.escapeHtml(product.nombre_pre)}</strong>
              <span class="admin-cell-subtitle">${admin.escapeHtml(product.talla || "Sin talla")} / ${admin.escapeHtml(product.estilo || "Sin estilo")}</span>
            </div>
          </div>
        </td>
        <td><strong>${admin.escapeHtml(admin.formatPrice(product.precio_unitario))}</strong></td>
        <td><span class="admin-badge ${Number(product.stock_actual || 0) <= 0 ? "out" : Number(product.stock_actual || 0) <= 5 ? "pending" : "ok"}">${Number(product.stock_actual || 0)} uds</span></td>
        <td>${admin.escapeHtml(getCategoryName(product.codigo_cat))}</td>
        <td><span class="admin-badge ${product.activo ? "active" : "inactive"}">${product.activo ? "Activo" : "Oculto"}</span></td>
        <td>
          <div class="admin-form-actions">
            <button class="admin-row-btn" type="button" data-action="edit-product" data-id="${product.codigo_pre}">Editar</button>
            <button class="admin-row-btn" type="button" data-action="toggle-product" data-id="${product.codigo_pre}">${product.activo ? "Ocultar" : "Activar"}</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  function renderCategories() {
    const tbody = document.getElementById("categoriesTableBody");
    const counter = document.getElementById("categoriesCounter");
    if (!tbody) return;

    if (counter) {
      counter.textContent = `${categories.length} categoria${categories.length === 1 ? "" : "s"} registrada${categories.length === 1 ? "" : "s"}.`;
    }

    if (categories.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3">No hay categorias registradas.</td></tr>`;
      return;
    }

    tbody.innerHTML = categories.map(category => {
      const count = products.filter(product => Number(product.codigo_cat) === Number(category.codigo_cat)).length;

      return `
        <tr>
          <td>
            <strong class="admin-cell-title">${admin.escapeHtml(category.nombre_cat)}</strong>
            <span class="admin-cell-subtitle">Codigo ${admin.escapeHtml(category.codigo_cat)}</span>
          </td>
          <td>${count} producto${count === 1 ? "" : "s"}</td>
          <td><button class="admin-row-btn" type="button" data-action="edit-category" data-id="${category.codigo_cat}">Editar</button></td>
        </tr>
      `;
    }).join("");
  }

  function resetProductForm() {
    productForm.reset();
    document.getElementById("productId").value = "";
    document.getElementById("productActive").checked = true;
    document.getElementById("productFormTitle").textContent = "Nueva prenda";
  }

  function resetCategoryForm() {
    categoryForm.reset();
    document.getElementById("categoryId").value = "";
    document.getElementById("categoryFormTitle").textContent = "Nueva categoria";
  }

  function fillProductForm(product) {
    document.getElementById("productId").value = product.codigo_pre;
    document.getElementById("productName").value = product.nombre_pre || "";
    document.getElementById("productDescription").value = product.descripcion || "";
    document.getElementById("productPrice").value = product.precio_unitario || 0;
    document.getElementById("productStock").value = product.stock_actual || 0;
    document.getElementById("productSize").value = product.talla || "";
    document.getElementById("productStyle").value = product.estilo || "";
    document.getElementById("productBadge").value = product.badge || "";
    document.getElementById("productCategory").value = product.codigo_cat || "";
    document.getElementById("productImage").value = product.imagen_url || "";
    document.getElementById("productActive").checked = Boolean(product.activo);
    document.getElementById("productFormTitle").textContent = "Editar prenda";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fillCategoryForm(category) {
    document.getElementById("categoryId").value = category.codigo_cat;
    document.getElementById("categoryName").value = category.nombre_cat || "";
    document.getElementById("categoryFormTitle").textContent = "Editar categoria";
  }

  async function loadData() {
    const [productsResult, categoriesResult] = await Promise.all([
      client
        .from("prenda")
        .select("codigo_pre, nombre_pre, descripcion, precio_unitario, stock_actual, codigo_cat, imagen_url, activo, talla, estilo, badge")
        .order("codigo_pre", { ascending: true }),
      client
        .from("categoria")
        .select("codigo_cat, nombre_cat")
        .order("nombre_cat", { ascending: true })
    ]);

    if (productsResult.error) throw productsResult.error;
    if (categoriesResult.error) throw categoriesResult.error;

    products = productsResult.data || [];
    categories = categoriesResult.data || [];

    renderCategorySelect();
    renderProducts();
    renderCategories();
  }

  async function saveProduct(event) {
    event.preventDefault();

    const id = document.getElementById("productId").value;
    const payload = productPayload();

    const result = id
      ? await client.from("prenda").update(payload).eq("codigo_pre", Number(id))
      : await client.from("prenda").insert(payload);

    if (result.error) {
      admin.showToast(result.error.message || "No se pudo guardar la prenda.");
      return;
    }

    admin.showToast(id ? "Prenda actualizada." : "Prenda creada.");
    resetProductForm();
    await loadData();
  }

  async function toggleProduct(id) {
    const product = products.find(item => Number(item.codigo_pre) === Number(id));
    if (!product) return;

    const { error } = await client
      .from("prenda")
      .update({ activo: !product.activo })
      .eq("codigo_pre", Number(id));

    if (error) {
      admin.showToast(error.message || "No se pudo cambiar el estado.");
      return;
    }

    admin.showToast(product.activo ? "Prenda ocultada." : "Prenda activada.");
    await loadData();
  }

  async function saveCategory(event) {
    event.preventDefault();

    const id = document.getElementById("categoryId").value;
    const payload = {
      nombre_cat: document.getElementById("categoryName").value.trim()
    };

    const result = id
      ? await client.from("categoria").update(payload).eq("codigo_cat", Number(id))
      : await client.from("categoria").insert(payload);

    if (result.error) {
      admin.showToast(result.error.message || "No se pudo guardar la categoria.");
      return;
    }

    admin.showToast(id ? "Categoria actualizada." : "Categoria creada.");
    resetCategoryForm();
    await loadData();
  }

  function setupTabs() {
    document.querySelectorAll(".admin-tab").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".admin-tab").forEach(tab => tab.classList.remove("active"));
        document.querySelectorAll(".admin-tab-panel").forEach(panel => panel.classList.remove("active"));

        button.classList.add("active");
        document.getElementById(button.dataset.tabTarget)?.classList.add("active");
      });
    });
  }

  function setupEvents() {
    setupTabs();

    productForm?.addEventListener("submit", saveProduct);
    categoryForm?.addEventListener("submit", saveCategory);

    document.getElementById("resetProductFormBtn")?.addEventListener("click", resetProductForm);
    document.getElementById("resetCategoryFormBtn")?.addEventListener("click", resetCategoryForm);
    document.getElementById("productsSearch")?.addEventListener("input", renderProducts);

    document.body.addEventListener("click", async event => {
      const button = event.target.closest("[data-action]");
      if (!button) return;

      const action = button.dataset.action;
      const id = button.dataset.id;

      if (action === "edit-product") {
        const product = products.find(item => Number(item.codigo_pre) === Number(id));
        if (product) fillProductForm(product);
      }

      if (action === "toggle-product") {
        await toggleProduct(id);
      }

      if (action === "edit-category") {
        const category = categories.find(item => Number(item.codigo_cat) === Number(id));
        if (category) fillCategoryForm(category);
      }
    });
  }

  admin.onReady(async context => {
    client = context.client;
    setupEvents();

    try {
      await loadData();
    } catch (error) {
      console.error("Error productos admin:", error);
      admin.showToast(error.message || "No se pudieron cargar productos.");
    }
  });
})();
