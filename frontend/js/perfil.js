// frontend/js/perfil.js

const SUPABASE_URL = "https://oqojlcgkmvbxmmwoexih.supabase.co";
const SUPABASE_KEY = "sb_publishable_FJvX6aKfJO-f-SAzx2vu0Q_F4ex4L0T";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", async () => {
  const profileForm = document.getElementById("profileForm");
  const profileSaveBtn = document.getElementById("profileSaveBtn");
  const profilePhone = document.getElementById("profilePhone");
  const profileCity = document.getElementById("profileCity");

  let currentUser = null;
  let currentProfile = null;
  let currentStats = {
    count: 0,
    total: 0,
    lastOrderDate: null
  };

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function formatPrice(value) {
    return `S/ ${Number(value || 0).toFixed(2)}`;
  }

  function formatShortDate(value) {
    if (!value) return "Sin pedidos";

    return new Intl.DateTimeFormat("es-PE", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date(value));
  }

  function formatProfileDate(value) {
    if (!value) return "Fecha no disponible";

    return new Intl.DateTimeFormat("es-PE", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date(value));
  }

  function showToast(title, text) {
    const toast = document.getElementById("profileToast");
    const toastTitle = document.getElementById("profileToastTitle");
    const toastText = document.getElementById("profileToastText");

    if (!toast || !toastTitle || !toastText) return;

    toastTitle.textContent = title;
    toastText.textContent = text;
    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
    }, 2800);
  }

  function getNames(profile, user) {
    const firstName = profile?.nombre_cli || "";
    const lastName = profile?.apellido_cli || "";

    return {
      firstName: firstName || "Sin nombre registrado",
      lastName: lastName || "Sin apellido registrado",
      fullName: `${firstName || ""} ${lastName || ""}`.trim() || "Usuario sin nombre"
    };
  }

  async function getCurrentUser() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data?.user) {
      window.location.href = "login.html";
      return null;
    }

    return data.user;
  }

  async function getProfile(user) {
    const { data, error } = await supabaseClient
      .from("usuarios")
      .select("id, nombre_cli, apellido_cli, correo_cli, celular_cli, ciudad_cli, sexo_cli, rol, creado_en")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (data) return data;

    if (!user.email) return null;

    const { data: profileByEmail, error: emailError } = await supabaseClient
      .from("usuarios")
      .select("id, nombre_cli, apellido_cli, correo_cli, celular_cli, ciudad_cli, sexo_cli, rol, creado_en")
      .eq("correo_cli", user.email)
      .maybeSingle();

    if (emailError) throw emailError;

    return profileByEmail || null;
  }

  async function getOrderStats(userId) {
    const { data, error } = await supabaseClient
      .from("venta")
      .select("codigo_ven, total_pagar, creado_en, fecha_venta")
      .eq("usuario_id", userId)
      .order("creado_en", { ascending: false });

    if (error) {
      console.warn("No se pudieron cargar las estadisticas de pedidos:", error);
      return {
        count: 0,
        total: 0,
        lastOrderDate: null
      };
    }

    const sales = data || [];
    const total = sales.reduce((sum, sale) => sum + Number(sale.total_pagar || 0), 0);

    return {
      count: sales.length,
      total,
      lastOrderDate: sales[0]?.creado_en || sales[0]?.fecha_venta || null
    };
  }

  function renderProfile(user, profile, stats) {
    if (!profile) {
      setText("profileAvatar", "?");
      setText("profileHeroName", "Usuario no encontrado");
      setText("profileHeroEmail", user.email || "correo-no-disponible@goodish.pe");
      setText("profileName", "No existe fila en usuarios");
      setText("profileLastName", "Revisa la tabla usuarios");
      setText("profileEmail", user.email || "correo-no-disponible@goodish.pe");
      setText("profilePhoneText", "No registrado");
      setText("profileCityText", "No registrado");
      setText("profileRole", "Sin rol");
      setText("profileCreatedAt", "Sin fecha");
      setText("profileStatus", "Sin perfil");
      return;
    }

    const names = getNames(profile, user);
    const email = profile.correo_cli || user.email || "correo-no-disponible@goodish.pe";
    const initial = names.firstName.charAt(0).toUpperCase() || "G";
    const phone = profile.celular_cli || "No registrado";
    const city = profile.ciudad_cli || "No registrado";

    setText("profileAvatar", initial);
    setText("profileHeroName", names.fullName);
    setText("profileHeroEmail", email);
    setText("profileName", names.firstName);
    setText("profileLastName", names.lastName);
    setText("profileEmail", email);
    setText("profilePhoneText", phone);
    setText("profileCityText", city);
    setText("profileRole", profile.rol || "cliente");
    setText("profileCreatedAt", formatProfileDate(profile.creado_en));
    setText("profileStatus", profile.rol || "Activo");
    setText("profileOrdersCount", String(stats.count));
    setText("profileOrdersTotal", formatPrice(stats.total));
    setText("profileLastOrder", formatShortDate(stats.lastOrderDate));

    if (profilePhone) {
      profilePhone.value = profile.celular_cli || "";
    }

    if (profileCity) {
      profileCity.value = profile.ciudad_cli || "";
    }
  }

  async function saveProfile(event) {
    event.preventDefault();

    if (!currentUser) return;

    const phone = profilePhone.value.trim();
    const city = profileCity.value.trim();

    profileSaveBtn.disabled = true;
    profileSaveBtn.textContent = "Guardando...";

    try {
      const payload = {
        celular_cli: phone || null,
        ciudad_cli: city || null
      };

      const { data, error } = await supabaseClient
        .from("usuarios")
        .update(payload)
        .eq("id", currentProfile?.id || currentUser.id)
        .select("id, nombre_cli, apellido_cli, correo_cli, celular_cli, ciudad_cli, sexo_cli, rol, creado_en")
        .maybeSingle();

      if (error) throw error;

      currentProfile = data || {
        ...currentProfile,
        ...payload
      };

      renderProfile(currentUser, currentProfile, currentStats);

      showToast("Perfil actualizado", "Tus datos de contacto fueron guardados.");
    } catch (error) {
      console.error("No se pudo guardar el perfil:", error);
      showToast("No se pudo guardar", error.message || "Revisa tus permisos en Supabase.");
    } finally {
      profileSaveBtn.disabled = false;
      profileSaveBtn.textContent = "Guardar cambios";
    }
  }

  try {
    currentUser = await getCurrentUser();
    if (!currentUser) return;

    currentProfile = await getProfile(currentUser);

    renderProfile(currentUser, currentProfile, currentStats);

    currentStats = await getOrderStats(currentUser.id);
    renderProfile(currentUser, currentProfile, currentStats);
  } catch (error) {
    console.error("No se pudo cargar el perfil:", error);
    showToast("No se pudo cargar", error.message || "Error al leer tu perfil.");
  }

  if (profileForm) {
    profileForm.addEventListener("submit", saveProfile);
  }
});
