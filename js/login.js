const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("admin-email").value;
  const password = document.getElementById("admin-password").value;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    loginMessage.textContent = "Connexion refusée : " + error.message;
    loginMessage.style.color = "var(--color-coral)";
  }
});

// Redirige vers l'espace de gestion dès qu'une session existe : juste après une
// connexion réussie, ou immédiatement si on est déjà connecté. Le formulaire
// d'inscription met ce drapeau à true le temps de vérifier un éventuel code,
// pour ne pas être redirigé avant d'avoir pu attribuer le rôle correspondant.
let suppressRedirect = false;

supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session && !suppressRedirect) {
    window.location.href = "gestion.html";
  }
});

const signupToggle = document.getElementById("signup-toggle");
const signupContent = document.getElementById("signup-content");
const signupForm = document.getElementById("signup-form");
const signupMessage = document.getElementById("signup-message");

signupToggle.addEventListener("click", () => {
  const isOpen = signupToggle.getAttribute("aria-expanded") === "true";
  signupToggle.setAttribute("aria-expanded", String(!isOpen));
  signupContent.hidden = isOpen;
});

// Créer un compte ne donne aucun droit en soi, sauf si un code valide est fourni :
// dans ce cas le rôle correspondant est attribué automatiquement. Sans code, un
// administrateur doit ensuite l'ajouter depuis "Gestion du tournoi".
signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  suppressRedirect = true;

  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const code = document.getElementById("signup-code").value.trim();

  const { error: signUpError } = await supabaseClient.auth.signUp({ email, password });

  if (signUpError) {
    signupMessage.textContent = "Erreur : " + signUpError.message;
    signupMessage.style.color = "var(--color-coral)";
    suppressRedirect = false;
    return;
  }

  if (code) {
    // S'assurer d'avoir une session active pour que le code puisse être vérifié
    // (le compte est confirmé automatiquement, la connexion marche tout de suite).
    await supabaseClient.auth.signInWithPassword({ email, password });

    const { error: codeError } = await supabaseClient.rpc("claim_role_with_code", {
      input_code: code,
    });

    if (codeError) {
      signupMessage.textContent = "Compte créé, mais code invalide : " + codeError.message;
      signupMessage.style.color = "var(--color-coral)";
      signupForm.reset();
      suppressRedirect = false;
      window.location.href = "gestion.html";
      return;
    }
  }

  signupMessage.textContent = code
    ? "Compte créé, rôle attribué automatiquement !"
    : "Compte créé ! Un administrateur doit maintenant t'ajouter un rôle avant que tu puisses accéder à la gestion du tournoi.";
  signupMessage.style.color = "var(--color-ocean-dark)";
  signupForm.reset();
  suppressRedirect = false;
  window.location.href = "gestion.html";
});
