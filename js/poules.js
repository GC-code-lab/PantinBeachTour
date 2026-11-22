const poolsList = document.getElementById("pools-list");
const categoryButtons = document.querySelectorAll(".category-button");

let currentCategory = "Hommes";

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentCategory = button.dataset.category;
    categoryButtons.forEach((b) => b.classList.toggle("active", b.dataset.category === currentCategory));
    loadPools();
  });
});

// `silent` (rafraîchissement automatique) : en cas d'erreur réseau, on garde
// l'affichage actuel. Si la catégorie a changé pendant le chargement, le résultat
// (devenu obsolète) est ignoré.
async function loadPools({ silent = false } = {}) {
  const category = currentCategory;
  const [
    { data: pools, error: poolsError },
    { data: teams, error: teamsError },
    { data: matches, error: matchesError },
  ] = await Promise.all([
    supabaseClient.from("pools").select("*").eq("category", category).order("label"),
    supabaseClient
      .from("teams")
      .select("*")
      .eq("category", category)
      .order("seed", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabaseClient
      .from("matches")
      .select("*, sets(*)")
      .eq("phase", "poule")
      .eq("category", category)
      .order("id", { ascending: true }),
  ]);

  if (category !== currentCategory) return;
  if (poolsError || teamsError || matchesError) {
    if (!silent) poolsList.textContent = "Erreur de chargement des poules.";
    return;
  }

  if (pools.length === 0) {
    const format = await fetchTournamentFormat();
    if (category !== currentCategory) return;
    if (format === "12-quali16" && teams.length >= 24) {
      renderMaindrawPreview(teams);
      return;
    }
    poolsList.textContent = "Les poules seront affichées ici dès que le tirage sera fait.";
    return;
  }

  renderPools(pools, teams, matches);
}

// Pour la formule "12-quali16" : aperçu des poules du Maindraw avant même que les
// qualifications aient commencé. Les 8 équipes "direct Maindraw" dont les points
// dépassent la meilleure équipe de qualif sont certaines de leur rang final (aucun
// qualifié ne pourra jamais les dépasser au classement) et peuvent donc déjà être
// placées dans leur poule — les autres slots (qualifiés à venir, et équipes direct
// "wild card" dont le rang dépend du résultat des qualifs) restent "TBD".
function poolIndexForRank(rank) {
  const round = Math.floor((rank - 1) / 4);
  const posInRound = (rank - 1) % 4;
  const order = round % 2 === 0 ? [0, 1, 2, 3] : [3, 2, 1, 0];
  return order[posInRound];
}

function renderMaindrawPreview(teams) {
  poolsList.innerHTML = "";

  const ordered = defaultSeedOrder(teams);
  const directTeams = ordered.slice(0, 8);
  const qualifTeams = ordered.slice(8, 24);
  const maxQualifPoints = Math.max(...qualifTeams.map(teamPoints));

  const sortedDirect = directTeams.slice().sort(compareByPoints);

  const confirmed = [];
  const uncertain = [];
  sortedDirect.forEach((team) => {
    if (teamPoints(team) > maxQualifPoints) confirmed.push(team);
    else uncertain.push(team);
  });

  // #pools-list est lui-même une grille à 2 colonnes (CSS) : ce wrapper doit donc
  // occuper les 2 colonnes, sinon il se retrouve confiné à une seule cellule
  // (la moitié gauche de la page) au lieu de prendre toute la largeur.
  const wrapper = document.createElement("div");
  wrapper.style.gridColumn = "1 / -1";

  const note = document.createElement("p");
  note.className = "form-message";
  note.textContent =
    "Aperçu du Maindraw avant la fin des qualifications : les poules ci-dessous ne sont pas encore définitives.";
  wrapper.appendChild(note);

  const poolLabels = ["Poule A", "Poule B", "Poule C", "Poule D"];
  const slotsByPool = Array.from({ length: 4 }, () => []);

  confirmed.forEach((team, index) => {
    slotsByPool[poolIndexForRank(index + 1)].push(formatTeamDetail(team));
  });
  for (let rank = confirmed.length + 1; rank <= 12; rank++) {
    slotsByPool[poolIndexForRank(rank)].push("TBD");
  }

  // Grille à part (pas directement enfant de #pools-list, qui est lui-même en
  // grille 2 colonnes) pour garder exactement 4 cartes symétriques, même quand
  // il y a des équipes incertaines à lister en dessous.
  const grid = document.createElement("div");
  grid.className = "pool-grid";

  poolLabels.forEach((label, i) => {
    const card = document.createElement("div");
    card.className = "pool-card";

    const title = document.createElement("h3");
    title.textContent = label;
    card.appendChild(title);

    const list = document.createElement("ul");
    slotsByPool[i].forEach((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      list.appendChild(item);
    });
    card.appendChild(list);

    grid.appendChild(card);
  });
  wrapper.appendChild(grid);

  if (uncertain.length > 0) {
    const uncertainNote = document.createElement("p");
    uncertainNote.className = "maindraw-preview-uncertain";
    uncertainNote.textContent =
      "En attente de confirmation de poule (en fonction du résultat des qualifications) : " +
      uncertain.map((team) => formatTeamDetail(team)).join(", ");
    wrapper.appendChild(uncertainNote);
  }

  poolsList.appendChild(wrapper);
}

function formatTeamNames(team) {
  return `${team.player1_nom} / ${team.player2_nom}`;
}

function formatPointRatio(pointsFor, pointsAgainst) {
  if (pointsAgainst === 0) return pointsFor > 0 ? "∞" : "0.00";
  return (pointsFor / pointsAgainst).toFixed(2);
}

function renderStandingsTable(standings, seedRankByTeamId) {
  const wrapper = document.createElement("div");
  wrapper.className = "standings-table-wrapper";

  const table = document.createElement("table");
  table.className = "standings-table";

  const thead = document.createElement("thead");
  thead.innerHTML =
    "<tr><th>Rang</th><th>Équipe</th><th>V</th><th>D</th><th>Ratio</th><th>Tête de série</th></tr>";
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  standings.forEach((s, index) => {
    const row = document.createElement("tr");
    // textContent (pas innerHTML) : les noms d'équipe viennent d'une saisie libre.
    [
      index + 1,
      formatTeamNames(s.team),
      s.wins,
      s.losses,
      formatPointRatio(s.pointsFor, s.pointsAgainst),
      `n°${seedRankByTeamId.get(s.team.id)}`,
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  wrapper.appendChild(table);

  return wrapper;
}

function renderPools(pools, teams, matches) {
  poolsList.innerHTML = "";

  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const seedRankByTeamId = new Map(defaultSeedOrder(teams).map((team, index) => [team.id, index + 1]));

  pools.forEach((pool) => {
    const teamsInPool = teams.filter((team) => team.pool_id === pool.id);
    const poolMatches = matches.filter((match) => match.pool_id === pool.id);

    const card = document.createElement("div");
    card.className = "pool-card";

    const title = document.createElement("h3");
    title.textContent = pool.label;
    card.appendChild(title);

    const list = document.createElement("ul");
    if (teamsInPool.length === 0) {
      const empty = document.createElement("li");
      empty.textContent = "Aucune équipe pour l'instant";
      list.appendChild(empty);
    } else {
      teamsInPool.forEach((team) => {
        const item = document.createElement("li");
        item.textContent = formatTeamDetail(team);
        list.appendChild(item);
      });
    }
    card.appendChild(list);

    const sectionKey = `poule-${pool.category}-${pool.label}`;
    const matches1 = createCollapsibleSection("Matchs et résultats", `${sectionKey}-matchs`);
    if (poolMatches.length === 0) {
      const matchesNote = document.createElement("p");
      matchesNote.className = "form-message";
      matchesNote.textContent = "Matchs et résultats à venir.";
      matches1.content.appendChild(matchesNote);
    } else {
      poolMatches.forEach((match) => {
        matches1.content.appendChild(renderMatchRow(match, teamsById));
      });
    }
    card.appendChild(matches1.section);

    const standings = createCollapsibleSection("Classement", `${sectionKey}-classement`);
    const standingsRows = computePoolStandings(pool, teamsInPool, poolMatches, seedRankByTeamId);
    if (standingsRows.length === 0) {
      const standingsNote = document.createElement("p");
      standingsNote.className = "form-message";
      standingsNote.textContent = "Classement à venir.";
      standings.content.appendChild(standingsNote);
    } else {
      standings.content.appendChild(renderStandingsTable(standingsRows, seedRankByTeamId));
    }
    card.appendChild(standings.section);

    poolsList.appendChild(card);
  });
}

function renderMatchRow(match, teamsById) {
  const team1 = teamsById.get(match.team1_id);
  const team2 = teamsById.get(match.team2_id);
  const existingSet = match.sets && match.sets[0];

  const row = document.createElement("div");
  row.className = match.status === "termine" ? "match-row match-row-done" : "match-row";

  const team1Span = document.createElement("span");
  team1Span.className = "match-team";
  team1Span.textContent = formatTeamShort(team1);
  row.appendChild(team1Span);

  if (existingSet) {
    const score = document.createElement("span");
    score.className = "match-score";
    score.textContent = `${existingSet.score_team1} - ${existingSet.score_team2}`;
    row.appendChild(score);
  } else {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "À venir";
    row.appendChild(badge);
  }

  const team2Span = document.createElement("span");
  team2Span.className = "match-team team2";
  team2Span.textContent = formatTeamShort(team2);
  row.appendChild(team2Span);

  return row;
}

loadPools();
onAutoRefresh(loadPools);
