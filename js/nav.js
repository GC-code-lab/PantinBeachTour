const navList = document.querySelector(".site-header nav ul");

supabaseClient.auth.onAuthStateChange((_event, session) => {
  const existingLink = document.getElementById("nav-admin-link");
  if (existingLink) {
    existingLink.closest("li").remove();
  }

  const item = document.createElement("li");
  item.innerHTML = session
    ? '<a href="gestion.html" id="nav-admin-link"><span class="status-dot"></span>Gestion du tournoi</a>'
    : '<a href="admin.html" id="nav-admin-link">Connexion</a>';

  navList.appendChild(item);
});
