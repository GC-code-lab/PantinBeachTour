const navList = document.querySelector(".site-header nav ul");

supabaseClient.auth.onAuthStateChange(async (_event, session) => {
  const existingLink = document.getElementById("nav-admin-link");
  if (existingLink) {
    existingLink.closest("li").remove();
  }

  // Un compte connecté mais sans rôle (admin/scorer) ne doit pas voir "Gestion du
  // tournoi" — il n'a accès à rien là-bas, donc pour lui le menu reste comme un visiteur.
  let hasAccess = false;
  if (session) {
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();
    hasAccess = Boolean(profile && (profile.role === "admin" || profile.role === "scorer"));
  }

  const item = document.createElement("li");
  item.innerHTML = hasAccess
    ? '<a href="gestion.html" id="nav-admin-link"><span class="status-dot"></span>Gestion du tournoi</a>'
    : '<a href="admin.html" id="nav-admin-link">Connexion</a>';

  navList.appendChild(item);
});
