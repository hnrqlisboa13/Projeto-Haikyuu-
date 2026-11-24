const backgroundImages = [
  "assets/haikyuu-collage.png",
  "assets/haikyuu-match.png",
  "assets/haikyuu-cover.png"
];

const previousBackground = Number(sessionStorage.getItem("karasuno-background"));
let backgroundIndex = Number.isInteger(previousBackground)
  ? (previousBackground + 1) % backgroundImages.length
  : Math.floor(Math.random() * backgroundImages.length);
sessionStorage.setItem("karasuno-background", String(backgroundIndex));
document.documentElement.style.setProperty(
  "--scene-image",
  `url("${backgroundImages[backgroundIndex]}")`
);

const loginTab = document.querySelector("#login-tab");
const signupTab = document.querySelector("#signup-tab");
const loginForm = document.querySelector("#login-form");
const signupForm = document.querySelector("#signup-form");
const authMessage = document.querySelector("#auth-message");
const authView = document.querySelector("#auth-view");
const accountView = document.querySelector("#account-view");
const config = window.APP_CONFIG;

function showMessage(element, message, kind) {
  element.textContent = message;
  element.className = `auth-message ${kind || ""}`.trim();
}

function switchForm(view) {
  const isLogin = view === "login";
  loginForm.hidden = !isLogin;
  signupForm.hidden = isLogin;
  loginTab.classList.toggle("is-active", isLogin);
  signupTab.classList.toggle("is-active", !isLogin);
  loginTab.setAttribute("aria-pressed", String(isLogin));
  signupTab.setAttribute("aria-pressed", String(!isLogin));
  document.querySelector("#form-title").innerHTML = isLogin
    ? "Que bom ter você<br><span>de volta.</span>"
    : "Sua jornada<br><span>começa agora.</span>";
  document.querySelector("#form-intro").textContent = isLogin
    ? "Entre na sua conta para acompanhar os lances."
    : "Crie sua conta e venha fazer parte do time.";
  showMessage(authMessage, "", "");
}

function showAccount(user) {
  authView.hidden = Boolean(user);
  accountView.hidden = !user;
  if (!user) return;

  const displayName = user.user_metadata?.display_name || user.email;
  document.querySelector("#account-name").textContent = displayName;
  document.querySelector("#account-email").textContent = user.email;
}

loginTab.addEventListener("click", () => switchForm("login"));
signupTab.addEventListener("click", () => switchForm("signup"));

const hasCredentials = Boolean(
  config &&
  config.SUPABASE_URL &&
  config.SUPABASE_ANON_KEY &&
  window.supabase &&
  config.SUPABASE_URL.startsWith("https://")
);

if (!hasCredentials) {
  const setupMessage = window.supabase
    ? "Conecte este site ao seu projeto Supabase preenchendo config.js para ativar o cadastro."
    : "Não foi possível carregar a biblioteca do Supabase. Verifique sua conexão e atualize a página.";
  showMessage(
    authMessage,
    setupMessage,
    "notice"
  );
  [loginForm, signupForm].forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      showMessage(authMessage, setupMessage, "notice");
    });
  });
} else {
  const supabaseClient = window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY
  );

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    showAccount(session?.user || null);
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const button = loginForm.querySelector("button[type='submit']");
    button.disabled = true;
    showMessage(authMessage, "Verificando seus dados...", "");

    const { error } = await supabaseClient.auth.signInWithPassword({
      email: formData.get("email"),
      password: formData.get("password")
    });

    button.disabled = false;
    if (error) {
      showMessage(authMessage, `Não foi possível entrar: ${error.message}`, "error");
      return;
    }
    showMessage(authMessage, "", "");
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(signupForm);
    const button = signupForm.querySelector("button[type='submit']");
    button.disabled = true;
    showMessage(authMessage, "Criando sua conta...", "");

    const { data, error } = await supabaseClient.auth.signUp({
      email: formData.get("email"),
      password: formData.get("password"),
      options: {
        data: { display_name: formData.get("name").trim() }
      }
    });

    button.disabled = false;
    if (error) {
      showMessage(authMessage, `Não foi possível criar a conta: ${error.message}`, "error");
      return;
    }

    if (data.session) {
      showMessage(authMessage, "Conta criada com sucesso!", "success");
    } else {
      showMessage(
        authMessage,
        "Cadastro iniciado! Confira seu e-mail e confirme o endereço para entrar.",
        "success"
      );
    }
  });

  document.querySelector("#logout-button").addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      showMessage(
        document.querySelector("#account-message"),
        `Não foi possível sair da conta: ${error.message}`,
        "error"
      );
      return;
    }
    showMessage(document.querySelector("#account-message"), "", "");
  });

  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) {
      showMessage(authMessage, `Não foi possível verificar a sessão: ${error.message}`, "error");
      return;
    }
    showAccount(data.session?.user || null);
  });
}
