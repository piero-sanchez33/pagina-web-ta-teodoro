// frontend/js/navbar.js

(function () {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  const navbarHTML = `
    <div class="top-bar">
      <span>Nuevo drop pronto ✨</span> prendas vintage, fairy, boho & Y2K seleccionadas para outfits únicos.
    </div>

    <div class="navbar-wrap">
      <nav>
        <a href="index.html" class="logo page-link">
          <img src="images/logo.png" alt="GOODISH logo">
          <h1>GOODISH</h1>
        </a>

        <div class="nav-links">
          <a href="index.html#inicio" class="${currentPage === "index.html" ? "active" : ""}">Inicio</a>
          <a href="index.html#estilos">Estilos</a>
          <a href="products.html" class="page-link ${currentPage === "products.html" ? "active" : ""}">Productos</a>
          <a href="index.html#comprar">Cómo comprar</a>
          <a href="index.html#redes">Redes</a>
          <a href="login.html" class="page-link ${currentPage === "login.html" ? "active" : ""}">Login</a>
          <a href="register.html" class="btn-register page-link ${currentPage === "register.html" ? "active" : ""}">
            Registrarme
          </a>
        </div>

        <div class="nav-actions">
          <button class="theme-btn" id="themeBtn" aria-label="Cambiar modo">🌙</button>
          <button class="menu-btn" id="menuBtn" aria-label="Abrir menú">☰</button>
        </div>
      </nav>

      <div class="mobile-menu" id="mobileMenu">
        <a href="index.html#inicio">Inicio</a>
        <a href="index.html#estilos">Estilos</a>
        <a href="products.html" class="page-link">Productos</a>
        <a href="index.html#comprar">Cómo comprar</a>
        <a href="index.html#redes">Redes</a>
        <a href="login.html" class="page-link">Login</a>
        <a href="register.html" class="page-link">Registrarme</a>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("afterbegin", navbarHTML);

  const themeBtn = document.getElementById("themeBtn");
  const menuBtn = document.getElementById("menuBtn");
  const mobileMenu = document.getElementById("mobileMenu");

  // MODO CLARO / OSCURO
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

  // MENÚ MÓVIL
  menuBtn.addEventListener("click", () => {
    mobileMenu.classList.toggle("active");
    menuBtn.textContent = mobileMenu.classList.contains("active") ? "✕" : "☰";
  });

  document.querySelectorAll(".mobile-menu a").forEach(link => {
    link.addEventListener("click", () => {
      mobileMenu.classList.remove("active");
      menuBtn.textContent = "☰";
    });
  });

  // TRANSICIÓN ENTRE PÁGINAS, si existe #pageTransition
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
})();