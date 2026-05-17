// frontend/js/navbar.js

(function () {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  const navbarHTML = `
    <div class="goodish-top-bar">
      <span>Nuevo drop pronto ✨</span> prendas vintage, fairy, boho & Y2K seleccionadas para outfits únicos.
    </div>

    <div class="goodish-navbar-wrap">
      <nav class="goodish-navbar">
        <a href="index.html" class="goodish-logo page-link">
          <img src="images/logo.png" alt="GOODISH logo">
          <h1>GOODISH</h1>
        </a>

        <div class="goodish-nav-links">
          <a href="index.html#inicio" class="${currentPage === "index.html" ? "active" : ""}">Inicio</a>
          <a href="index.html#estilos">Estilos</a>
          <a href="products.html" class="page-link ${currentPage === "products.html" ? "active" : ""}">Productos</a>
          <a href="index.html#comprar">Cómo comprar</a>
          <a href="index.html#redes">Redes</a>
          <a href="login.html" class="page-link ${currentPage === "login.html" ? "active" : ""}">Login</a>
          <a href="register.html" class="goodish-btn-register page-link ${currentPage === "register.html" ? "active" : ""}">
            Registrarme
          </a>
        </div>

        <div class="goodish-nav-actions">
          <a href="cart.html" class="goodish-cart-link page-link ${currentPage === "cart.html" ? "active" : ""}" aria-label="Carrito">
            <span class="goodish-cart-icon">🛒</span>
            <span class="goodish-cart-badge" id="goodishCartBadge">0</span>
          </a>

          <button class="goodish-theme-btn" id="goodishThemeBtn" aria-label="Cambiar modo">🌙</button>
          <button class="goodish-menu-btn" id="goodishMenuBtn" aria-label="Abrir menú">☰</button>
        </div>
      </nav>

      <div class="goodish-mobile-menu" id="goodishMobileMenu">
        <a href="index.html#inicio">Inicio</a>
        <a href="index.html#estilos">Estilos</a>
        <a href="products.html" class="page-link">Productos</a>
        <a href="index.html#comprar">Cómo comprar</a>
        <a href="index.html#redes">Redes</a>
        <a href="login.html" class="page-link">Login</a>

        <a href="cart.html" class="page-link goodish-mobile-cart-link">
          🛒 Carrito
          <span class="goodish-cart-badge" id="goodishCartBadgeMobile">0</span>
        </a>

        <a href="register.html" class="page-link">Registrarme</a>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("afterbegin", navbarHTML);

  const themeBtn = document.getElementById("goodishThemeBtn");
  const menuBtn = document.getElementById("goodishMenuBtn");
  const mobileMenu = document.getElementById("goodishMobileMenu");

  const savedTheme = localStorage.getItem("goodish-theme");

  if (savedTheme === "light") {
    document.body.classList.add("light");
    themeBtn.textContent = "☀️";
  } else {
    themeBtn.textContent = "🌙";
  }

  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("light");

    const isLight = document.body.classList.contains("light");
    themeBtn.textContent = isLight ? "☀️" : "🌙";

    localStorage.setItem("goodish-theme", isLight ? "light" : "dark");
  });

  menuBtn.addEventListener("click", () => {
    mobileMenu.classList.toggle("active");
    menuBtn.textContent = mobileMenu.classList.contains("active") ? "✕" : "☰";
  });

  document.querySelectorAll(".goodish-mobile-menu a").forEach(link => {
    link.addEventListener("click", () => {
      mobileMenu.classList.remove("active");
      menuBtn.textContent = "☰";
    });
  });

  document.querySelectorAll(".page-link").forEach(link => {
    link.addEventListener("click", function (event) {
      const href = this.getAttribute("href");
      const pageTransition = document.getElementById("pageTransition");

      if (!href || href.startsWith("#") || this.target === "_blank") {
        return;
      }

      if (!pageTransition) {
        return;
      }

      event.preventDefault();
      pageTransition.classList.add("active");

      setTimeout(() => {
        window.location.href = href;
      }, 650);
    });
  });

  window.updateNavbarCartCount = function () {
    let cart = [];

    try {
      cart = JSON.parse(localStorage.getItem("goodish_cart")) || [];
    } catch {
      cart = [];
    }

    const totalItems = cart.reduce((total, item) => {
      return total + Number(item.quantity || 0);
    }, 0);

    const badge = document.getElementById("goodishCartBadge");
    const badgeMobile = document.getElementById("goodishCartBadgeMobile");

    if (badge) {
      badge.textContent = totalItems;
      badge.style.display = totalItems > 0 ? "inline-flex" : "none";
    }

    if (badgeMobile) {
      badgeMobile.textContent = totalItems;
      badgeMobile.style.display = totalItems > 0 ? "inline-flex" : "none";
    }
  };

  window.updateNavbarCartCount();
})();