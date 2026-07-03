// frontend/js/navbar.js

(function () {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const SUPABASE_URL = "https://oqojlcgkmvbxmmwoexih.supabase.co";
  const SUPABASE_KEY = "sb_publishable_FJvX6aKfJO-f-SAzx2vu0Q_F4ex4L0T";

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
          <a href="mis-pedidos.html" class="page-link goodish-orders-link ${currentPage === "mis-pedidos.html" ? "active" : ""}" hidden>Pedidos</a>
          <a href="login.html" class="page-link goodish-login-link ${currentPage === "login.html" ? "active" : ""}">Login</a>
          <a href="register.html" class="goodish-btn-register page-link goodish-register-link ${currentPage === "register.html" ? "active" : ""}">
            Registrarme
          </a>
        </div>

        <div class="goodish-nav-actions">
          <div class="goodish-user-chip" id="goodishUserChip" hidden>
            <span class="goodish-user-avatar" id="goodishUserAvatar">G</span>
            <span class="goodish-user-text" id="goodishUserText">Cliente</span>
            <button type="button" class="goodish-logout-btn" id="goodishLogoutBtn">Salir</button>
          </div>

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
        <a href="mis-pedidos.html" class="page-link goodish-orders-link" hidden>Mis pedidos</a>
        <a href="login.html" class="page-link goodish-login-link">Login</a>

        <div class="goodish-mobile-user" id="goodishMobileUser" hidden>
          <span id="goodishMobileUserText">Cliente GOODISH</span>
          <button type="button" id="goodishMobileLogoutBtn">Salir</button>
        </div>

        <a href="cart.html" class="page-link goodish-mobile-cart-link">
          🛒 Carrito
          <span class="goodish-cart-badge" id="goodishCartBadgeMobile">0</span>
        </a>

        <a href="register.html" class="page-link goodish-register-link">Registrarme</a>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("afterbegin", navbarHTML);

  const themeBtn = document.getElementById("goodishThemeBtn");
  const menuBtn = document.getElementById("goodishMenuBtn");
  const mobileMenu = document.getElementById("goodishMobileMenu");
  const userChip = document.getElementById("goodishUserChip");
  const userAvatar = document.getElementById("goodishUserAvatar");
  const userText = document.getElementById("goodishUserText");
  const mobileUser = document.getElementById("goodishMobileUser");
  const mobileUserText = document.getElementById("goodishMobileUserText");
  const logoutBtn = document.getElementById("goodishLogoutBtn");
  const mobileLogoutBtn = document.getElementById("goodishMobileLogoutBtn");

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

  function loadSupabaseScript() {
    if (window.supabase) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[src*="@supabase/supabase-js"]');

      if (existingScript) {
        existingScript.addEventListener("load", resolve, { once: true });
        existingScript.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function getDisplayName(user) {
    const metadata = user?.user_metadata || {};
    const fullName = [
      metadata.nombre_cli || metadata.nombre || metadata.name || "",
      metadata.apellido_cli || metadata.apellido || ""
    ].join(" ").trim();

    if (fullName) {
      return fullName;
    }

    return user?.email?.split("@")[0] || "Cliente GOODISH";
  }

  function setAuthLinksVisibility(isLoggedIn) {
    document.querySelectorAll(".goodish-login-link, .goodish-register-link").forEach(link => {
      link.style.display = isLoggedIn ? "none" : "";
    });

    document.querySelectorAll(".goodish-orders-link").forEach(link => {
      link.hidden = !isLoggedIn;
    });
  }

  function renderNavbarUser(user, supabaseClient) {
    if (!user) {
      setAuthLinksVisibility(false);
      return;
    }

    const displayName = getDisplayName(user);
    const firstName = displayName.split(" ")[0] || "Cliente";
    const initial = firstName.charAt(0).toUpperCase();

    setAuthLinksVisibility(true);

    if (userChip && userAvatar && userText) {
      userChip.hidden = false;
      userAvatar.textContent = initial;
      userText.textContent = `Hola, ${firstName}`;
    }

    if (mobileUser && mobileUserText) {
      mobileUser.hidden = false;
      mobileUserText.textContent = `Hola, ${displayName}`;
    }

    const logout = async () => {
      await supabaseClient.auth.signOut();
      window.location.href = "index.html";
    };

    if (logoutBtn) {
      logoutBtn.addEventListener("click", logout);
    }

    if (mobileLogoutBtn) {
      mobileLogoutBtn.addEventListener("click", logout);
    }
  }

  async function initNavbarUser() {
    try {
      await loadSupabaseScript();

      const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data } = await supabaseClient.auth.getUser();
      const user = data?.user;

      if (user) {
        const { data: profile } = await supabaseClient
          .from("usuarios")
          .select("nombre_cli, apellido_cli")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          user.user_metadata = {
            ...user.user_metadata,
            nombre_cli: profile.nombre_cli || user.user_metadata?.nombre_cli,
            apellido_cli: profile.apellido_cli || user.user_metadata?.apellido_cli
          };
        }
      }

      renderNavbarUser(user, supabaseClient);
    } catch (error) {
      console.warn("No se pudo cargar el usuario en la navbar:", error);
      setAuthLinksVisibility(false);
    }
  }

  initNavbarUser();
})();
