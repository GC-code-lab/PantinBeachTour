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

async function loadBracket() {
  const { data: teams, error: teamsError } = await supabaseClient
    .from("teams")
    .select("*")
    .eq("category", currentBracketCategory);

  const { data: matches, error: matchesError } = await supabaseClient
    .from("matches")
    .select("*, sets(*)")
    .eq("category", currentBracketCategory)
    .in("phase", ["barrage", "quart", "demi", "petite_finale", "finale"]);

  if (teamsError || matchesError) {
    bracketContainer.textContent = "Erreur de chargement du tableau.";
    return;
  }

  renderBracket(bracketContainer, teams, matches);
}

loadBracket();
