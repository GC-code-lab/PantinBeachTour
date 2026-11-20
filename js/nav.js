const navList = document.querySelector(".site-header nav ul");

// Lien public "Qualifs", ajouté juste après "Équipes" (donc avant "Poules") — visible
// par tout le monde (pas besoin d'être connecté), uniquement quand la formule active
// du tournoi comporte des qualifications. Indépendant de l'état de connexion,
// donc hors du bloc onAuthStateChange ci-dessous.
(async () => {
  if ((await fetchTournamentFormat()) !== "12-quali16") return;

  const isCurrentPage = window.location.pathname.endsWith("qualifs.html");
  const item = document.createElement("li");
  item.innerHTML = `<a href="qualifs.html"${isCurrentPage ? ' class="active"' : ""}>Qualifs</a>`;
  // "Équipes" est toujours le tout premier lien (voir chaque fichier HTML) : Qualifs
  // doit arriver juste après, pas avant.
  navList.insertBefore(item, navList.children[1] || null);
})();

// Supabase peut déclencher plusieurs événements d'affilée (session initiale, jeton
// rafraîchi...). Le lien est donc retiré/remis APRÈS la lecture du rôle, et seul le
// dernier événement en date l'affiche : sinon deux lectures en parallèle ajoutaient
// chacune leur lien, et le menu apparaissait en double.
let navAuthVersion = 0;

supabaseClient.auth.onAuthStateChange((_event, session) => {
  // Différé : Supabase déconseille d'appeler ses fonctions directement dans ce callback.
  setTimeout(() => renderNavAuth(session), 0);
});

async function renderNavAuth(session) {
  const version = ++navAuthVersion;

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
  if (version !== navAuthVersion) return;

  const existingLink = document.getElementById("nav-admin-link");
  if (existingLink) {
    existingLink.closest("li").remove();
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
}
