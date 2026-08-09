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

// Redirige vers l'espace de gestion dès qu'une session existe :
// juste après une connexion réussie, ou immédiatement si on est déjà connecté.
supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session) {
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

// Créer un compte ne donne aucun droit en soi (aucune ligne dans profiles) :
// un administrateur doit ensuite lui assigner un rôle depuis "Gestion du tournoi".
signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  const { error } = await supabaseClient.auth.signUp({ email, password });

  if (error) {
    signupMessage.textContent = "Erreur : " + error.message;
    signupMessage.style.color = "var(--color-coral)";
    return;
  }

  signupMessage.textContent = "Compte créé ! Un administrateur doit maintenant t'ajouter un rôle avant que tu puisses accéder à la gestion du tournoi.";
  signupMessage.style.color = "var(--color-ocean-dark)";
  signupForm.reset();
});
