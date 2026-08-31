/* Joyería DC — panel /admin (Fase 1)
 * Solo valida el acceso: login por correo/contraseña contra Supabase Auth
 * y comprueba que el usuario tenga fila en public.perfiles con rol admin.
 */
import { sb } from "../assets/supabase-client.js";

const views = {
  loading: document.getElementById("loadingView"),
  login: document.getElementById("loginView"),
  panel: document.getElementById("panelView"),
};
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");
const panelWho = document.getElementById("panelWho");

function show(name) {
  Object.entries(views).forEach(([k, el]) => { el.hidden = k !== name; });
}

function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.hidden = false;
}

async function isAdmin(userId) {
  const { data, error } = await sb
    .from("perfiles")
    .select("rol")
    .eq("id", userId)
    .maybeSingle();
  if (error) return false;
  return !!data && data.rol === "admin";
}

async function enterPanelOrReject(session, { fromLogin } = {}) {
  const user = session?.user;
  if (!user) { show("login"); return; }

  if (await isAdmin(user.id)) {
    panelWho.textContent = user.email || user.id;
    show("panel");
  } else {
    await sb.auth.signOut();
    show("login");
    if (fromLogin) {
      showLoginError("Esta cuenta no tiene acceso al panel.");
    } else {
      showLoginError("Tu sesión ya no tiene acceso. Inicia sesión de nuevo.");
    }
  }
}

// Estado inicial
(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    await enterPanelOrReject(session);
  } else {
    show("login");
  }
})();

// Login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  loginBtn.disabled = true;
  loginBtn.textContent = "Entrando…";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  loginBtn.disabled = false;
  loginBtn.textContent = "Entrar";

  if (error) {
    showLoginError("Correo o contraseña incorrectos.");
    return;
  }
  await enterPanelOrReject(data.session, { fromLogin: true });
});

// Logout
logoutBtn.addEventListener("click", async () => {
  await sb.auth.signOut();
  loginForm.reset();
  loginError.hidden = true;
  show("login");
});

// Reaccionar a cambios de sesión (expiración, cierre en otra pestaña)
sb.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") {
    show("login");
  }
});
