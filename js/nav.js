const navList = document.querySelector(".site-header nav ul");

// Lien public "Qualifs", ajouté tout en premier (avant "Poules") — visible par
// tout le monde (pas besoin d'être connecté), uniquement quand la formule active
// du tournoi comporte des qualifications. Indépendant de l'état de connexion,
// donc hors du bloc onAuthStateChange ci-dessous.
(async () => {
  const { data } = await supabaseClient.from("tournament_formats").select("format").maybeSingle();
  if (!data || data.format !== "12-quali16") return;

  const isCurrentPage = window.location.pathname.endsWith("qualifs.html");
  const item = document.createElement("li");
  item.innerHTML = `<a href="qualifs.html"${isCurrentPage ? ' class="active"' : ""}>Qualifs</a>`;
  navList.insertBefore(item, navList.firstChild);
})();

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
    ? `<div class="nav-dropdown">
         <button type="button" class="nav-dropdown-trigger" id="nav-admin-link" aria-label="Gestion du tournoi">⚙</button>
         <div class="nav-dropdown-menu">
           <a href="gestion.html">Gestion du tournoi</a>
           <a href="gestion.html#feedback">Amélioration du site</a>
           <a href="gestion.html#compte">Connexion</a>
         </div>
       </div>`
    : '<a href="admin.html" id="nav-admin-link">Connexion</a>';

  navList.appendChild(item);
});
