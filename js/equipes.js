// Page publique "Équipes" : liste des équipes inscrites par catégorie, avec leur
// numéro de tête de série et leurs points. Pour la formule "12 équipes (qualifs 16)",
// la liste est scindée en "Direct Maindraw" (les 8 meilleures têtes de série) et
// "Qualifications" (les 16 suivantes) — même répartition que l'admin (js/gestion.js).
// Pour les autres formules, une seule liste.

const content = document.getElementById("equipes-content");
const categoryButtons = document.querySelectorAll(".category-button");

let currentCategory = "Hommes";

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentCategory = button.dataset.category;
    categoryButtons.forEach((b) => b.classList.toggle("active", b.dataset.category === currentCategory));
    loadEquipes();
  });
});

function teamPoints(team) {
  return Number(team.points || 0);
}

function formatTeamDetail(team) {
  return `${team.player1_prenom} ${team.player1_nom} / ${team.player2_prenom} ${team.player2_nom}`;
}

// Même logique que côté admin (js/gestion.js) et les autres pages publiques : tant
// qu'aucun classement manuel n'a été fait (teams.seed tous null), l'ordre par défaut
// vient des points de la paire (décroissant).
function defaultSeedOrder(teams) {
  const hasManualSeed = teams.some((team) => team.seed != null);
  if (hasManualSeed) return teams;

  return teams.slice().sort((a, b) => {
    const diff = teamPoints(b) - teamPoints(a);
    if (diff !== 0) return diff;
    return new Date(a.created_at) - new Date(b.created_at);
  });
}

function renderTeamRow(rank, team) {
  const row = document.createElement("div");
  row.className = "match-row";

  const rankTag = document.createElement("span");
  rankTag.className = "match-order-tag";
  rankTag.textContent = `#${rank}`;
  row.appendChild(rankTag);

  const nameSpan = document.createElement("span");
  nameSpan.className = "match-team";
  nameSpan.textContent = formatTeamDetail(team);
  row.appendChild(nameSpan);

  const pointsBadge = document.createElement("span");
  pointsBadge.className = "badge";
  pointsBadge.textContent = `${teamPoints(team)} pts`;
  row.appendChild(pointsBadge);

  return row;
}

function renderSection(title, teams, startRank) {
  const section = document.createElement("section");

  const h2 = document.createElement("h2");
  h2.textContent = title;
  section.appendChild(h2);

  teams.forEach((team, i) => {
    section.appendChild(renderTeamRow(startRank + i, team));
  });

  return section;
}

async function loadEquipes() {
  content.innerHTML = "Chargement…";

  const { data: formatData } = await supabaseClient.from("tournament_formats").select("format").maybeSingle();
  const isQuali16 = Boolean(formatData && formatData.format === "12-quali16");

  const { data: teams, error } = await supabaseClient
    .from("teams")
    .select("*")
    .eq("category", currentCategory)
    .order("seed", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    content.textContent = "Erreur de chargement des équipes.";
    return;
  }

  if (!teams || teams.length === 0) {
    content.textContent = "Aucune équipe inscrite pour l'instant.";
    return;
  }

  const ordered = defaultSeedOrder(teams);
  content.innerHTML = "";

  if (isQuali16) {
    content.appendChild(renderSection(`Direct Maindraw (${Math.min(ordered.length, 8)})`, ordered.slice(0, 8), 1));
    if (ordered.length > 8) {
      content.appendChild(renderSection(`Qualifications (${ordered.length - 8})`, ordered.slice(8, 24), 9));
    }
  } else {
    content.appendChild(renderSection(`Équipes inscrites (${ordered.length})`, ordered, 1));
  }
}

loadEquipes();
