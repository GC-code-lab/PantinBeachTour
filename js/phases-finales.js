const bracketContainer = document.getElementById("bracket");

// Noms dédiés (pas "categoryButtons"/"currentCategory") car ce fichier est chargé
// sur la même page que js/poules.js (onglets "Poule" / "Phases Finales" du Main
// Draw) : deux `const`/`let` de même nom au niveau racine, dans deux <script>
// classiques sur la même page, provoqueraient une erreur de double déclaration.
const bracketCategoryButtons = document.querySelectorAll(".category-button");
let currentBracketCategory = "Hommes";

bracketCategoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentBracketCategory = button.dataset.category;
    bracketCategoryButtons.forEach((b) => b.classList.toggle("active", b.dataset.category === currentBracketCategory));
    loadBracket();
  });
});

async function loadBracket({ silent = false } = {}) {
  const category = currentBracketCategory;
  const [{ data: teams, error: teamsError }, { data: matches, error: matchesError }] = await Promise.all([
    supabaseClient.from("teams").select("*").eq("category", category),
    supabaseClient
      .from("matches")
      .select("*, sets(*)")
      .eq("category", category)
      .in("phase", PHASES_MAINDRAW_BRACKET),
  ]);

  if (category !== currentBracketCategory) return;
  if (teamsError || matchesError) {
    if (!silent) bracketContainer.textContent = "Erreur de chargement du tableau.";
    return;
  }

  // Garde le défilement horizontal du tableau (téléphone) d'un rafraîchissement à l'autre.
  preserveHorizontalScroll(bracketContainer, () => renderBracket(bracketContainer, teams, matches));
}

loadBracket();
onAutoRefresh(loadBracket);
