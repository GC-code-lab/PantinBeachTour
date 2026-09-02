const bracketContainer = document.getElementById("bracket");

const categoryButtons = document.querySelectorAll(".category-button");
let currentCategory = "Hommes";

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentCategory = button.dataset.category;
    categoryButtons.forEach((b) => b.classList.toggle("active", b.dataset.category === currentCategory));
    loadBracket();
  });
});

async function loadBracket() {
  const { data: teams, error: teamsError } = await supabaseClient
    .from("teams")
    .select("*")
    .eq("category", currentCategory);

  const { data: matches, error: matchesError } = await supabaseClient
    .from("matches")
    .select("*, sets(*)")
    .eq("category", currentCategory)
    .in("phase", ["barrage", "quart", "demi", "petite_finale", "finale"]);

  if (teamsError || matchesError) {
    bracketContainer.textContent = "Erreur de chargement du tableau.";
    return;
  }

  renderBracket(bracketContainer, teams, matches);
}

loadBracket();
